// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (c) 2026 Baraa <baraa0email@gmail.com>

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0.0, 'Keyboard Sounds', false);

        this._settings = settings;
        this._kbsPath = this._findKbs();
        this._daemonRunning = false;
        this._updatingUI = false;
        this._volTimeout = null;

        this._wantKeyboard = this._settings.get_boolean('enabled');
        this._wantMouse = this._settings.get_boolean('mouse-enabled');
        this._profile = this._settings.get_string('current-profile') || 'ios';
        this._mouseProfile = this._settings.get_string('mouse-profile') || 'g502x-wireless';
        this._volume = this._settings.get_int('volume');

        this._kbProfiles = [];
        this._mouseProfiles = [];

        this._icon = new St.Icon({
            icon_name: 'input-keyboard-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        this._buildMenu();
        this._loadProfiles();

        this._sync(() => {
            if (this._wantKeyboard && !this._daemonRunning)
                this._start();
        });
    }

    _findKbs() {
        const paths = [
            GLib.get_home_dir() + '/.local/bin/kbs',
            '/usr/local/bin/kbs',
            '/usr/bin/kbs',
        ];
        for (const p of paths) {
            if (GLib.file_test(p, GLib.FileTest.EXISTS))
                return p;
        }
        return 'kbs';
    }

    _buildMenu() {
        this._kbToggle = new PopupMenu.PopupSwitchMenuItem('Keyboard Sounds', false);
        this._kbToggle.connect('toggled', (_item, state) => {
            if (this._updatingUI)
                return;
            this._wantKeyboard = state;
            this._settings.set_boolean('enabled', state);
            state ? this._start() : this._stop();
        });
        this.menu.addMenuItem(this._kbToggle);

        this._mouseToggle = new PopupMenu.PopupSwitchMenuItem('Mouse Sounds', false);
        this._mouseToggle.connect('toggled', (_item, state) => {
            if (this._updatingUI)
                return;
            this._wantMouse = state;
            this._settings.set_boolean('mouse-enabled', state);
            this._start();
        });
        this.menu.addMenuItem(this._mouseToggle);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const volItem = new PopupMenu.PopupBaseMenuItem({activate: false});
        const volIcon = new St.Icon({
            icon_name: 'audio-volume-high-symbolic',
            style_class: 'popup-menu-icon',
        });
        this._slider = new Slider.Slider(this._volume / 100);
        this._slider.connect('notify::value', () => {
            if (this._updatingUI)
                return;
            this._volume = Math.round(this._slider.value * 100);
            this._settings.set_int('volume', this._volume);

            if (this._volTimeout) {
                GLib.source_remove(this._volTimeout);
                this._volTimeout = null;
            }
            this._volTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
                this._volTimeout = null;
                if (this._daemonRunning)
                    this._start();
                return GLib.SOURCE_REMOVE;
            });
        });
        volItem.add_child(volIcon);
        volItem.add_child(this._slider);
        this.menu.addMenuItem(volItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._kbProfileSub = new PopupMenu.PopupSubMenuMenuItem('Keyboard Profile');
        this.menu.addMenuItem(this._kbProfileSub);

        this._mouseProfileSub = new PopupMenu.PopupSubMenuMenuItem('Mouse Profile');
        this.menu.addMenuItem(this._mouseProfileSub);
    }

    _refreshUI() {
        this._updatingUI = true;

        this._kbToggle.setToggleState(this._daemonRunning);
        this._mouseToggle.setToggleState(this._daemonRunning && this._wantMouse);

        if (this._daemonRunning)
            this._icon.add_style_class_name('keyboard-sounds-active');
        else
            this._icon.remove_style_class_name('keyboard-sounds-active');

        this._kbProfileSub.label.text = `Keyboard Profile (${this._profile})`;
        this._mouseProfileSub.label.text = `Mouse Profile (${this._mouseProfile})`;

        this._fillProfiles(this._kbProfileSub, this._kbProfiles,
            this._profile, n => this._pickKbProfile(n));
        this._fillProfiles(this._mouseProfileSub, this._mouseProfiles,
            this._mouseProfile, n => this._pickMouseProfile(n));

        this._updatingUI = false;
    }

    _fillProfiles(submenu, list, current, onPick) {
        submenu.menu.removeAll();
        for (const name of list) {
            const item = new PopupMenu.PopupMenuItem(name);
            item.setOrnament(name === current
                ? PopupMenu.Ornament.CHECK
                : PopupMenu.Ornament.NONE);
            item.connect('activate', () => onPick(name));
            submenu.menu.addMenuItem(item);
        }
    }

    _loadProfiles() {
        this._run(['list-profiles', '-s', '-t', 'keyboard'], (ok, out) => {
            if (ok && out) {
                try { this._kbProfiles = JSON.parse(out).map(p => p.name); }
                catch (_) { /* keep empty */ }
            }
            this._fillProfiles(this._kbProfileSub, this._kbProfiles,
                this._profile, n => this._pickKbProfile(n));
        });

        this._run(['list-profiles', '-s', '-t', 'mouse'], (ok, out) => {
            if (ok && out) {
                try { this._mouseProfiles = JSON.parse(out).map(p => p.name); }
                catch (_) { /* keep empty */ }
            }
            this._fillProfiles(this._mouseProfileSub, this._mouseProfiles,
                this._mouseProfile, n => this._pickMouseProfile(n));
        });
    }

    _pickKbProfile(name) {
        this._profile = name;
        this._wantKeyboard = true;
        this._settings.set_string('current-profile', name);
        this._settings.set_boolean('enabled', true);
        this._start();
    }

    _pickMouseProfile(name) {
        this._mouseProfile = name;
        this._wantMouse = true;
        this._settings.set_string('mouse-profile', name);
        this._settings.set_boolean('mouse-enabled', true);
        this._start();
    }

    // `kbs start` will start the daemon or reconfigure a running one.
    _start() {
        const args = ['start', '-v', this._volume.toString(), '-p', this._profile];
        if (this._wantMouse)
            args.push('-m', this._mouseProfile);
        this._run(args, (ok, _out, err) => {
            if (!ok)
                console.error('keyboard-sounds: failed to start kbs:', err);
            this._sync();
        });
    }

    _stop() {
        this._run(['stop'], () => this._sync());
    }

    _sync(cb) {
        this._run(['status', '-s'], (ok, out) => {
            if (ok && out) {
                try {
                    const s = JSON.parse(out);
                    this._daemonRunning = s.status === 'running';
                    this._wantKeyboard = this._daemonRunning;
                    this._settings.set_boolean('enabled', this._daemonRunning);
                    this._wantMouse = this._daemonRunning && !!s.mouse_profile;
                    this._settings.set_boolean('mouse-enabled', this._wantMouse);
                } catch (_) {
                    this._daemonRunning = false;
                }
            } else {
                this._daemonRunning = false;
            }
            this._refreshUI();
            if (cb) cb();
        });
    }

    _run(args, cb) {
        try {
            const proc = Gio.Subprocess.new(
                [this._kbsPath, ...args],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
            proc.communicate_utf8_async(null, null, (_p, res) => {
                try {
                    const [, stdout, stderr] = _p.communicate_utf8_finish(res);
                    if (cb) cb(_p.get_successful(), stdout ?? '', stderr ?? '');
                } catch (e) {
                    if (cb) cb(false, '', e.message);
                }
            });
        } catch (e) {
            if (cb) cb(false, '', e.message);
        }
    }

    destroy() {
        if (this._volTimeout) {
            GLib.source_remove(this._volTimeout);
            this._volTimeout = null;
        }
        super.destroy();
    }
});

export default class KeyboardSoundsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new Indicator(this._settings);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
        this._settings = null;
    }
}
