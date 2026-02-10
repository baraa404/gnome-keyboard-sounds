# Keyboard Sounds GNOME Extension

A GNOME Shell extension that integrates with the [keyboardsounds](https://github.com/nathan-fiscaletti/keyboardsounds) Python package to add mechanical keyboard sound effects to your typing.

## Features

- **Toggle Switch**: Enable/disable keyboard sounds from the system tray
- **Profile Selection**: Choose from available sound profiles
- **Auto-start**: Automatically starts keyboard sounds when enabled
- **Visual Indicator**: Shows when sounds are active in the top panel

## Prerequisites

Before installing this extension, you must have the `keyboardsounds` Python package installed:

```bash
pip install keyboardsounds
```

## Installation

### Method 1: Manual Installation

1. Clone or download this extension to your GNOME extensions directory:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/
cp -r keyboard-sounds@extensions ~/.local/share/gnome-shell/extensions/
```

2. Compile the GSettings schema:

```bash
cd ~/.local/share/gnome-shell/extensions/keyboard-sounds@extensions/schemas
glib-compile-schemas .
```

3. Restart GNOME Shell (Alt+F2, type `r`, press Enter - or log out and back in)

4. Enable the extension using GNOME Tweaks or Extensions app

### Method 2: Using GNOME Extensions Website

*(Not yet published - coming soon)*

## Usage

1. Look for the keyboard icon in your top panel
2. Click it to open the menu
3. Toggle "Enabled" to turn keyboard sounds on/off
4. Select a profile from the list to change the sound

### Available Profiles

The extension detects profiles from your keyboardsounds installation. Common profiles include:

- **alpaca** - Alpaca Mechanical Keyboard
- **gateron-black-ink** - Gateron Black Ink switches
- **gateron-red-ink** - Gateron Red Ink switches
- **holy-panda** - Holy Panda switches
- **ios** - iOS keyboard sounds
- **mx-black**, **mx-blue**, **mx-brown** - Cherry MX switches
- **typewriter** - Classic typewriter sounds
- And more...

## Settings

Access settings via GNOME Tweaks or dconf-editor:

- `enabled` - Whether keyboard sounds are active
- `current-profile` - The selected sound profile
- `auto-start` - Auto-start when extension is enabled (default: true)

## Troubleshooting

### Extension doesn't appear
- Make sure you've compiled the GSettings schema
- Restart GNOME Shell
- Check if `kbs` command is available: `which kbs`

### No sound
- Verify keyboardsounds is installed: `kbs --version`
- Check if daemon is running: `kbs status`
- Try starting manually: `kbs start -p ios`

### Profiles not showing
- Click "Refresh Profiles" in the menu
- Run `kbs list-profiles` manually to verify

## Uninstallation

1. Disable the extension in GNOME Tweaks/Extensions app
2. Remove the extension directory:

```bash
rm -rf ~/.local/share/gnome-shell/extensions/keyboard-sounds@extensions
```

## License

MIT License - Feel free to modify and distribute.

## Credits

- [keyboardsounds](https://github.com/nathan-fiscaletti/keyboardsounds) by Nathan Fiscaletti
- GNOME Shell Extension framework
