# ShareL

<p align="center">
  <img src="https://raw.githubusercontent.com/44tl/NoAI/main/no-ai.svg" width="120" alt="NO AI" />
</p>

<p align="center">
  <strong>Fast, lightweight screen capture, video recording, and ShareX destination hub made specifically for Linux Wayland.</strong>
</p>

<p align="center">
  <a href="#quick-install">Quick Install</a> •
  <a href="#features-at-a-glance">Features</a> •
  <a href="#compositor-keybindings">Keybindings</a> •
  <a href="#cli-usage">CLI Reference</a> •
  <a href="#building-from-source">Build from Source</a>
</p>

---

<p align="center">
  <img width="1920" height="1032" alt="ShareL Desktop Interface" src="https://github.com/user-attachments/assets/546ec53a-cabb-4365-97f0-415b43b78889" />
</p>

---

If you've ever moved from Windows to Linux and missed the sheer convenience of ShareX — immediate region snips, built-in editor annotations, automatic uploads, and custom `.sxcu` destination support — ShareL was built for you.

Written in **Rust** and powered by native Wayland protocols, ShareL works out of the box on tiling compositors like **Niri**, **Hyprland**, and **Sway**, as well as desktop environments like **GNOME**, **KDE Plasma**, and **COSMIC**.

---

## Quick Install

Run our self-contained installer script to set up dependencies, compile/download the binary, install desktop shortcuts, and put `sharel` in your `~/.local/bin`:

```bash
curl -sSL https://raw.githubusercontent.com/44tl/ShareL/main/install.sh | bash
```

### Useful Installer Options

```bash
# Skip installing system packages (if you already have them)
./install.sh --no-deps

# Skip compilation and install a pre-built binary
./install.sh --no-build

# Pull and install updates
./install.sh --update

# Install or switch to a specific release tag
./install.sh --version v1.0.0

# Install to a custom directory (default is ~/.local/bin)
./install.sh --prefix /usr/local
```

---

## Features at a Glance

### 📸 Screenshots & Screen Recording
- **Wayland First**: First-class support for Niri (with horizontal scroll column awareness), Hyprland, Sway, GNOME, KDE Plasma, and COSMIC.
- **Smart Backend Selection**: Automatically picks the best capture method for your session (`grim`/`slurp`, XDG Desktop Portal, or native compositor CLI).
- **Flexible Modes**: Grab interactive regions with a pixel magnifier, full monitors, individual windows, or the active display.
- **Hardware-Accelerated Video**: Smooth 60/120 FPS video & GIF recording with `gpu-screen-recorder` (NVENC / VAAPI) and `wf-recorder`.
- **Audio Capture**: Record your microphone, desktop system audio, or both simultaneously.
- **Countdown Timer**: Delay screenshots by a few seconds to capture tooltips, hover menus, and context dropdowns.

### 🎨 Built-in Annotation Editor
- **Drawing Tools**: Crisp arrows, numbered step badges, rectangles, ellipses, freehand brush strokes, and text labels.
- **Privacy Obfuscation**: Pixelate or blur sensitive tokens, credentials, and email addresses before uploading.
- **Crop & Resize**: Quickly crop down to the exact area you care about.
- **Undo / Redo History**: Full `Ctrl+Z` / `Ctrl+Y` history stack.

### ☁️ ShareX Custom Destinations (`.sxcu`)
- **Direct `.sxcu` Import**: Import your existing ShareX config files with drag-and-drop.
- **Instant Defaults**: Includes ready-to-use destinations like `0x0.st` and `Litterbox` with zero API configuration required.
- **Custom Domains & Extraction**: Supports JSON path (`$json:data.url$`), regex, response headers, and vanity domain replacement.
- **Live Destination Tester**: Run quick sandbox uploads to inspect response payloads, headers, and latency.

### 🧰 Everyday Power Tools
- **Screen OCR**: Extract readable text from any image or screen snip using Tesseract.
- **Pixel Color Picker**: Inspect hex/RGB values and compute screen aspect ratios & pixel geometry.
- **QR Code Studio**: Generate and decode QR codes instantly.
- **History Gallery**: Search, filter, and favorite all your previous snapshots and recordings.
- **File Manager DBus Integration**: Highlight saved media in Dolphin, Nautilus, COSMIC Files, Thunar, or Nemo.
- **Built-in Auto Updater & Rollback**: Get notified when new versions drop, inspect changelogs, skip unwanted releases, or revert with `sharel rollback`.

---

## Compositor Keybindings

Add ShareL directly to your compositor config for instant muscle memory:

### Niri (`~/.config/niri/config.kdl`)
```kdl
binds {
    Print { spawn "sharel" "capture" "region"; }
    Mod+Print { spawn "sharel" "capture" "region" "--upload"; }
    Alt+Print { spawn "sharel" "capture" "window"; }
    Ctrl+Print { spawn "sharel" "capture" "fullscreen"; }
}
```

### Hyprland (`~/.config/hypr/hyprland.conf`)
```ini
bind = , Print, exec, sharel capture region
bind = SUPER, Print, exec, sharel capture region --upload
bind = ALT, Print, exec, sharel capture window
bind = CTRL, Print, exec, sharel capture fullscreen
```

### Sway (`~/.config/sway/config`)
```bash
bindsym Print exec sharel capture region
bindsym $mod+Print exec sharel capture region --upload
bindsym Mod1+Print exec sharel capture window
bindsym Control+Print exec sharel capture fullscreen
```

---

## CLI Reference

`sharel` has a fast CLI that easily plugs into scripts, rofi/wofi menus, and keyboard shortcuts:

```bash
# Check current environment, compositor, and backend readiness
sharel info

# Capture an interactive region
sharel capture region

# Capture fullscreen and upload immediately
sharel capture fullscreen --upload

# Delayed 3-second capture
sharel capture region -d 3

# Upload any local image or video
sharel upload ~/Pictures/diagram.png

# Run OCR to extract text to your clipboard
sharel ocr ~/Pictures/invoice.png

# List configured upload destinations
sharel uploaders

# Check if an update is available on GitHub
sharel update --check

# Install the latest update automatically (with backup protection)
sharel update

# Revert to your previous backup binary or a specific release tag
sharel rollback
sharel revert v1.0.0

# Ignore or unignore a specific release from prompting
sharel ignore-version 1.1.0
sharel unignore-version 1.1.0

# Browse recent releases
sharel releases
```

---

## System Dependencies

If you prefer installing system packages manually before building:

### Arch Linux / Manjaro
```bash
sudo pacman -S --needed base-devel rust cargo nodejs npm webkit2gtk-4.1 openssl libayatana-appindicator grim slurp ffmpeg tesseract tesseract-data-eng wl-clipboard
```

### Fedora / RHEL
```bash
sudo dnf install gcc gcc-c++ openssl-devel webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel ffmpeg tesseract wl-clipboard grim slurp
```

### Ubuntu / Debian
```bash
sudo apt update && sudo apt install -y build-essential curl libssl-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev ffmpeg tesseract-ocr wl-clipboard grim slurp
```

---

## Building from Source

### Requirements
- [Node.js](https://nodejs.org/) (v18+) and [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/) (stable toolchain)

```bash
# 1. Clone the repository
git clone https://github.com/44tl/ShareL.git
cd ShareL

# 2. Install web packages & start live development server
pnpm install
pnpm tauri dev

# 3. Build optimized release binary
pnpm tauri build
```

Your compiled release binary will be ready at `src-tauri/target/release/sharel`.

---

## Contributing & Community

ShareL is open source. Ideas, bug reports, and pull requests are always welcome! Check out our [Contributing Guidelines](CONTRIBUTING.md) and [Security Policy](SECURITY.md).

