#!/bin/bash

# Keyboard Sounds GNOME Extension Installer

set -e

EXTENSION_NAME="keyboard-sounds@extensions"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_NAME"
SCHEMA_DIR="$EXTENSION_DIR/schemas"

echo "Installing Keyboard Sounds GNOME Extension..."

# Check if running from the correct directory
if [ ! -f "metadata.json" ]; then
    echo "Error: Please run this script from the extension directory"
    exit 1
fi

# Create extension directory
mkdir -p "$EXTENSION_DIR"

# Copy extension files
cp metadata.json "$EXTENSION_DIR/"
cp extension.js "$EXTENSION_DIR/"
cp stylesheet.css "$EXTENSION_DIR/"

# Copy schemas
if [ -d "schemas" ]; then
    mkdir -p "$SCHEMA_DIR"
    cp schemas/*.xml "$SCHEMA_DIR/"
    
    # Compile schemas
    echo "Compiling GSettings schema..."
    glib-compile-schemas "$SCHEMA_DIR"
fi

echo "Extension files installed to: $EXTENSION_DIR"

# Check if kbs is installed
if ! command -v kbs &> /dev/null; then
    echo ""
    echo "WARNING: 'kbs' command not found!"
    echo "Please install keyboardsounds first:"
    echo "  pip install keyboardsounds"
    echo ""
fi

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Restart GNOME Shell (Alt+F2, type 'r', press Enter)"
echo "2. Enable the extension using GNOME Extensions app or Tweaks"
echo ""
echo "To uninstall, run: rm -rf $EXTENSION_DIR"
