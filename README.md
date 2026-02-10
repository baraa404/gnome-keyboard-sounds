# 🎹 Keyboard Sounds GNOME Extension

A clean, professional GNOME Shell extension that integrates with [Keyboard Sounds](https://github.com/nathan-fiscaletti/keyboardsounds) to add satisfying mechanical keyboard and mouse click sound effects to your desktop.

![GNOME 49](https://img.shields.io/badge/GNOME-49-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Keyboard Sounds** - Choose from 15+ mechanical keyboard profiles
- **Mouse Sounds** - Optional mouse click sounds (g502x-wireless)
- **Volume Control** - Real-time volume slider with live preview
- **Smart Profile Switching** - Change profiles instantly without restart
- **Auto-Start** - Remembers your settings across sessions
- **Clean UI** - Native GNOME design with intuitive menu
- **Single Source of Truth** - Extension state always matches the daemon

## 📋 Requirements

- GNOME Shell 49 (or compatible version)
- [Keyboard Sounds Python package](https://pypi.org/project/keyboardsounds/) ≥ 6.0

## 🚀 Installation

### Step 1: Install Keyboard Sounds

```bash
pip install keyboardsounds
```

### Step 2: Install the Extension

```bash
# Clone or download the repository
git clone https://github.com/yourusername/keyboard-sounds-gnome-extension.git

# Run the install script
cd keyboard-sounds-gnome-extension
./install.sh
```

Or manually:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/
cp -r keyboard-sounds@extensions ~/.local/share/gnome-shell/extensions/
cd ~/.local/share/gnome-shell/extensions/keyboard-sounds@extensions/schemas
glib-compile-schemas .
```

### Step 3: Enable the Extension

1. Log out and log back in (to reload GNOME Shell on Wayland)
2. Open GNOME Extensions or GNOME Tweaks
3. Enable "Keyboard Sounds"

## 🎮 Usage

Click the keyboard icon in your top panel:

```
┌──────────────────────────────────┐
│ [x] Keyboard Sounds              │
│ [ ] Mouse Sounds                 │
├──────────────────────────────────┤
│ [🔊] ━━━━○━━━━━━━━━━━━━━━━━━━━   │
├──────────────────────────────────┤
│ > Keyboard Profile (ios)         │
│ > Mouse Profile (g502x-wireless) │
└──────────────────────────────────┘
```

### Available Keyboard Profiles

- **alpaca** - Alpaca Mechanical Keyboard
- **apex-pro-tkl-v2** - Steelseries Apex Pro
- **banana-split** - Banana Split switches
- **gateron-black-ink** - Gateron Black Ink switches
- **gateron-red-ink** - Gateron Red Ink switches
- **holy-panda** - Holy Panda switches
- **ios** - iPhone keyboard sounds
- **logitech-g915-tkl-brown** - Logitech G915 TKL
- **mx-black** - Cherry MX Black switches
- **mx-blue** - Cherry MX Blue switches
- **mx-brown** - Cherry MX Brown switches
- **mx-speed-silver** - MX Speed Silver switches
- **nk-cream** - NovelKeys Cream switches
- **opera-gx** - OperaGX Web Browser
- **telios-v2** - Telios V2 linear switches
- **typewriter** - Antique typewriter

### Mouse Profiles

- **g502x-wireless** - Logitech G502 X Wireless Mouse

## 🔧 How It Works

The extension uses the `kbs` command-line tool to control the Keyboard Sounds daemon:

- **Toggle ON** → `kbs start -p <profile> -v <volume>`
- **Toggle OFF** → `kbs stop`
- **Change Profile** → `kbs start` (reconfigures running daemon)
- **Change Volume** → `kbs start` (reconfigures with new volume)

The daemon is the single source of truth - the extension queries `kbs status -s` (JSON) after every action to ensure the UI always reflects reality.

## 🐛 Troubleshooting

### Extension doesn't appear after installation

```bash
# Verify extension is in the correct location
ls ~/.local/share/gnome-shell/extensions/keyboard-sounds@extensions/

# Restart GNOME Shell
# On X11: Alt+F2, type 'r', press Enter
# On Wayland: Log out and log back in
```

### "kbs command not found"

```bash
# Verify keyboardsounds is installed
which kbs
kbs --version

# If not found, install it:
pip install --user keyboardsounds
```

### Multiple daemons running

```bash
# Stop all instances
kbs stop

# Check status
kbs status
```

### Profiles not loading

```bash
# Test profile listing manually
kbs list-profiles -s -t keyboard
kbs list-profiles -s -t mouse
```

### Toggle state is wrong

The extension syncs with the daemon on startup. If the state is wrong:

1. Toggle the switch manually
2. The extension will query the daemon and correct itself

## 📝 Settings

Settings are stored in GSettings at `org.gnome.shell.extensions.keyboard-sounds`:

```bash
# View settings
gsettings list-recursively org.gnome.shell.extensions.keyboard-sounds

# Change settings via gsettings
gsettings set org.gnome.shell.extensions.keyboard-sounds volume 75
gsettings set org.gnome.shell.extensions.keyboard-sounds current-profile 'mx-blue'
```

Available settings:
- `enabled` - Whether keyboard sounds are active
- `mouse-enabled` - Whether mouse sounds are active
- `current-profile` - Selected keyboard profile
- `mouse-profile` - Selected mouse profile
- `volume` - Volume level (0-100)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Credits

- [Keyboard Sounds](https://github.com/nathan-fiscaletti/keyboardsounds) by Nathan Fiscaletti - The fantastic Python package that makes this possible
- GNOME Shell Extension framework

## 📄 License

MIT License - see LICENSE file for details

## 🎨 Preview

*[Add screenshots here showing the menu and panel icon]*

---

**Enjoy the satisfying clickety-clack! ⌨️✨**
