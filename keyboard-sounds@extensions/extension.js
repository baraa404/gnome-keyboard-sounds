import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

// ---------------------------------------------------------------------------
// Architecture:
//
//   - The kbs daemon is the SINGLE SOURCE OF TRUTH for running state.
//   - GSettings stores only user *preferences* (desired profile, volume, etc).
//   - We NEVER do stop-then-start. `kbs start` already reconfigures a running
//     daemon, so we just call `start` with the right args every time.
//   - `kbs status -s` returns JSON; we parse it to know the real state.
//   - A `_updatingUI` flag prevents toggle signal handlers from firing when
//     we programmatically change toggle state.
// ---------------------------------------------------------------------------

const KeyboardSoundsIndicator = GObject.registerClass(
class KeyboardSoundsIndicator extends PanelMenu.Button {

    _init(settings) {
        super._init(0.0, 'Keyboard Sounds', false);

        this._settings = settings;
        this._kbsPath = this._findKbs();

        // Daemon state (read from `kbs status -s`)
        this._daemonRunning = false;

        // User preferences (persisted in GSettings)
        this._wantKeyboard = this._settings.get_boolean('enabled');
        this._wantMouse = this._settings.get_boolean('mouse-enabled');
        this._selectedProfile = this._settings.get_string('current-profile') || 'ios';
        this._selectedMouseProfile = this._settings.get_string('mouse-profile') || 'g502x-wireless';
        this._selectedVolume = this._settings.get_int('volume');

        // Profile lists (populated async)
        this._keyboardProfiles = [];
        this._mouseProfiles = [];

        // Guard flag: when true, toggle signal handlers are no-ops
        this._updatingUI = false;

        // Volume slider debounce timer
        this._volTimeout = null;

        // ---- Panel icon ----
        this._icon = new St.Icon({
            icon_name: 'input-keyboard-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        // ---- Build menu (once) ----
        this._buildMenu();

        // ---- Load data ----
        this._loadProfiles();

        // Query daemon, then auto-start if user left it enabled last session
        this._syncFromDaemon(() => {
            if (this._wantKeyboard && !this._daemonRunning)
                this._startDaemon();
        });
    }

    // -----------------------------------------------------------------------
    // Locate kbs binary
    // -----------------------------------------------------------------------
    _findKbs() {
        const candidates = [
            GLib.get_home_dir() + '/.local/bin/kbs',
            '/usr/local/bin/kbs',
            '/usr/bin/kbs',
        ];
        for (const p of candidates) {
            if (GLib.file_test(p, GLib.FileTest.EXISTS))
                return p;
        }
        return 'kbs';
    }

    // -----------------------------------------------------------------------
    // Build menu (called once in _init)
    // -----------------------------------------------------------------------
    _buildMenu() {
        // -- Keyboard toggle --
        this._kbToggle = new PopupMenu.PopupSwitchMenuItem('Keyboard Sounds', false);
        this._kbToggle.connect('toggled', (_item, state) => {
            if (this._updatingUI) return;
            this._wantKeyboard = state;
            this._settings.set_boolean('enabled', state);
            if (state)
                this._startDaemon();
            else
                this._stopDaemon();
        });
        this.menu.addMenuItem(this._kbToggle);

        // -- Mouse toggle --
        this._mouseToggle = new PopupMenu.PopupSwitchMenuItem('Mouse Sounds', false);
        this._mouseToggle.connect('toggled', (_item, state) => {
            if (this._updatingUI) return;
            this._wantMouse = state;
            this._settings.set_boolean('mouse-enabled', state);
            // Reconfigure the running daemon with or without mouse
            this._startDaemon();
        });
        this.menu.addMenuItem(this._mouseToggle);

        // -- Separator --
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // -- Volume row --
        const volItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
        const volIcon = new St.Icon({
            icon_name: 'audio-volume-high-symbolic',
            style_class: 'popup-menu-icon',
        });
        this._volSlider = new Slider.Slider(this._selectedVolume / 100);
        this._volSlider.connect('notify::value', () => {
            if (this._updatingUI) return;
            this._selectedVolume = Math.round(this._volSlider.value * 100);
            this._settings.set_int('volume', this._selectedVolume);
            // Debounce: wait for user to stop dragging before reconfiguring
            if (this._volTimeout) {
                GLib.source_remove(this._volTimeout);
                this._volTimeout = null;
            }
            this._volTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
                this._volTimeout = null;
                if (this._daemonRunning)
                    this._startDaemon(); // reconfigure volume
                return GLib.SOURCE_REMOVE;
            });
        });
        volItem.add_child(volIcon);
        volItem.add_child(this._volSlider);
        this.menu.addMenuItem(volItem);

        // -- Separator --
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // -- Keyboard profile submenu --
        this._kbProfileSub = new PopupMenu.PopupSubMenuMenuItem('Keyboard Profile');
        this.menu.addMenuItem(this._kbProfileSub);

        // -- Mouse profile submenu --
        this._mouseProfileSub = new PopupMenu.PopupSubMenuMenuItem('Mouse Profile');
        this.menu.addMenuItem(this._mouseProfileSub);
    }

    // -----------------------------------------------------------------------
    // Refresh the entire UI from current state (never triggers side effects)
    // -----------------------------------------------------------------------
    _refreshUI() {
        this._updatingUI = true;

        // Toggles reflect actual daemon state combined with user intent
        this._kbToggle.setToggleState(this._daemonRunning);
        this._mouseToggle.setToggleState(this._daemonRunning && this._wantMouse);

        // Panel icon colour
        if (this._daemonRunning)
            this._icon.add_style_class_name('keyboard-sounds-active');
        else
            this._icon.remove_style_class_name('keyboard-sounds-active');

        // Submenu labels
        this._kbProfileSub.label.text = `Keyboard Profile (${this._selectedProfile})`;
        this._mouseProfileSub.label.text = `Mouse Profile (${this._selectedMouseProfile})`;

        // Rebuild profile check marks
        this._populateProfileMenu(
            this._kbProfileSub,
            this._keyboardProfiles,
            this._selectedProfile,
            name => this._onSelectKeyboardProfile(name)
        );
        this._populateProfileMenu(
            this._mouseProfileSub,
            this._mouseProfiles,
            this._selectedMouseProfile,
            name => this._onSelectMouseProfile(name)
        );

        this._updatingUI = false;
    }

    _populateProfileMenu(submenu, profiles, currentName, onSelect) {
        submenu.menu.removeAll();
        for (const name of profiles) {
            const item = new PopupMenu.PopupMenuItem(name);
            item.setOrnament(
                name === currentName
                    ? PopupMenu.Ornament.CHECK
                    : PopupMenu.Ornament.NONE
            );
            item.connect('activate', () => onSelect(name));
            submenu.menu.addMenuItem(item);
        }
    }

    // -----------------------------------------------------------------------
    // Load profile lists (async, JSON)
    // -----------------------------------------------------------------------
    _loadProfiles() {
        this._exec(['list-profiles', '-s', '-t', 'keyboard'], (ok, out) => {
            if (ok && out) {
                try { this._keyboardProfiles = JSON.parse(out).map(p => p.name); }
                catch (_e) { this._keyboardProfiles = []; }
            }
            this._populateProfileMenu(
                this._kbProfileSub,
                this._keyboardProfiles,
                this._selectedProfile,
                name => this._onSelectKeyboardProfile(name)
            );
        });

        this._exec(['list-profiles', '-s', '-t', 'mouse'], (ok, out) => {
            if (ok && out) {
                try { this._mouseProfiles = JSON.parse(out).map(p => p.name); }
                catch (_e) { this._mouseProfiles = []; }
            }
            this._populateProfileMenu(
                this._mouseProfileSub,
                this._mouseProfiles,
                this._selectedMouseProfile,
                name => this._onSelectMouseProfile(name)
            );
        });
    }

    // -----------------------------------------------------------------------
    // Profile selection handlers
    // -----------------------------------------------------------------------
    _onSelectKeyboardProfile(name) {
        this._selectedProfile = name;
        this._wantKeyboard = true;
        this._settings.set_string('current-profile', name);
        this._settings.set_boolean('enabled', true);
        // Start or reconfigure (no stop needed)
        this._startDaemon();
    }

    _onSelectMouseProfile(name) {
        this._selectedMouseProfile = name;
        this._wantMouse = true;
        this._settings.set_string('mouse-profile', name);
        this._settings.set_boolean('mouse-enabled', true);
        // Start or reconfigure
        this._startDaemon();
    }

    // -----------------------------------------------------------------------
    // Daemon control
    // -----------------------------------------------------------------------

    /**
     * Start the daemon or reconfigure the already-running daemon.
     * `kbs start` handles both cases: if the daemon is running it
     * reconfigures it; if it is not running it starts a new one.
     */
    _startDaemon() {
        const args = ['start', '-v', this._selectedVolume.toString(), '-p', this._selectedProfile];

        if (this._wantMouse)
            args.push('-m', this._selectedMouseProfile);

        this._exec(args, (ok, _out, err) => {
            if (!ok)
                console.error('[Keyboard Sounds] start failed:', err);
            // Always sync from daemon to get the real state
            this._syncFromDaemon();
        });
    }

    /** Stop the daemon. */
    _stopDaemon() {
        this._exec(['stop'], () => {
            this._syncFromDaemon();
        });
    }

    // -----------------------------------------------------------------------
    // Query daemon state (single source of truth)
    // -----------------------------------------------------------------------
    _syncFromDaemon(callback) {
        this._exec(['status', '-s'], (ok, out) => {
            if (ok && out) {
                try {
                    const s = JSON.parse(out);
                    this._daemonRunning = (s.status === 'running');
                    // Sync wantKeyboard with reality
                    this._wantKeyboard = this._daemonRunning;
                    this._settings.set_boolean('enabled', this._daemonRunning);
                    // Check if mouse is active
                    if (this._daemonRunning && s.mouse_profile)
                        this._wantMouse = true;
                    else if (this._daemonRunning && !s.mouse_profile)
                        this._wantMouse = false;
                    this._settings.set_boolean('mouse-enabled', this._wantMouse);
                } catch (_e) {
                    this._daemonRunning = false;
                }
            } else {
                this._daemonRunning = false;
            }

            this._refreshUI();
            if (callback) callback();
        });
    }

    // -----------------------------------------------------------------------
    // Execute kbs command (async, non-blocking)
    // -----------------------------------------------------------------------
    _exec(args, callback) {
        try {
            const proc = Gio.Subprocess.new(
                [this._kbsPath, ...args],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            proc.communicate_utf8_async(null, null, (_proc, res) => {
                try {
                    const [, stdout, stderr] = _proc.communicate_utf8_finish(res);
                    if (callback) callback(_proc.get_successful(), stdout || '', stderr || '');
                } catch (e) {
                    console.error('[Keyboard Sounds] exec error:', e);
                    if (callback) callback(false, '', e.message);
                }
            });
        } catch (e) {
            console.error('[Keyboard Sounds] spawn error:', e);
            if (callback) callback(false, '', e.message);
        }
    }

    // -----------------------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------------------
    destroy() {
        if (this._volTimeout) {
            GLib.source_remove(this._volTimeout);
            this._volTimeout = null;
        }
        super.destroy();
    }
});

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------
export default class KeyboardSoundsExtension extends Extension {
    enable() {
        this._settings = this.getSettings('org.gnome.shell.extensions.keyboard-sounds');
        this._indicator = new KeyboardSoundsIndicator(this._settings);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
    }
}
