# Keyboard Sounds - GNOME Extension

GNOME Shell extension that wraps [keyboardsounds](https://github.com/nathan-fiscaletti/keyboardsounds) so you can toggle mechanical keyboard / mouse click sounds from the panel.

![GNOME 49](https://img.shields.io/badge/GNOME-49-blue)
![License](https://img.shields.io/badge/license-GPL--2.0--or--later-blue)

## What it does

Adds a panel indicator that lets you:

- Toggle keyboard sounds on/off
- Toggle mouse click sounds
- Adjust volume with a slider
- Pick from all available `kbs` profiles (15+ keyboard profiles, mouse profiles)
- Remembers your last profile and volume across sessions

The extension talks to the `kbs` daemon under the hood. It doesn't play sounds itself -- it just controls the daemon.

## Requirements

- GNOME Shell 49
- [keyboardsounds](https://pypi.org/project/keyboardsounds/) (`pip install keyboardsounds`)

## Install

First, make sure `kbs` works:

```bash
pip install keyboardsounds
kbs list-profiles -t keyboard   # should print available profiles
```

Then install the extension:

```bash
git clone https://github.com/baraa404/gnome-keyboard-sounds.git
cd gnome-keyboard-sounds/keyboard-sounds@baraa404.github.io
./install.sh
```

Log out and back in (Wayland doesn't support shell restarts), then enable it from the Extensions app.

### Manual install

```bash
EXT_DIR=~/.local/share/gnome-shell/extensions/keyboard-sounds@baraa404.github.io
mkdir -p "$EXT_DIR/schemas"
cp metadata.json extension.js stylesheet.css "$EXT_DIR/"
cp schemas/*.xml "$EXT_DIR/schemas/"
glib-compile-schemas "$EXT_DIR/schemas"
```

## How it works

The extension spawns `kbs` subprocesses:

- `kbs start -p <profile> -v <volume> [-m <mouse_profile>]` to start or reconfigure the daemon
- `kbs stop` to stop it
- `kbs status -s` to get daemon state as JSON

If the daemon is already running, `kbs start` reconfigures it in place (no restart needed). The extension always queries `kbs status -s` after any action so the UI stays in sync with the actual daemon state.

## Troubleshooting

**Extension doesn't show up** -- Make sure you logged out and back in after installing. Check that the files are in `~/.local/share/gnome-shell/extensions/keyboard-sounds@baraa404.github.io/`.

**"kbs not found"** -- The extension looks for `kbs` in `~/.local/bin/kbs`, `/usr/local/bin/kbs`, and `/usr/bin/kbs`. Run `which kbs` to check where yours is.

**Profiles not loading** -- Try `kbs list-profiles -s -t keyboard` manually. If that fails, `kbs` itself has an issue.

## Settings

Stored in GSettings (`org.gnome.shell.extensions.keyboard-sounds`). You can poke at them directly if needed:

```bash
gsettings list-recursively org.gnome.shell.extensions.keyboard-sounds
gsettings set org.gnome.shell.extensions.keyboard-sounds current-profile 'mx-blue'
gsettings set org.gnome.shell.extensions.keyboard-sounds volume 75
```

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).

## Support

If you find this extension useful, consider supporting development:

[![PayPal](https://img.shields.io/badge/PayPal-Donate-00457C?logo=paypal)](https://paypal.me/baraa404)

## Credits

Built on top of [keyboardsounds](https://github.com/nathan-fiscaletti/keyboardsounds) by Nathan Fiscaletti.
