# ShareL

<p align="center">
  <img src="sharel-logo.svg" alt="ShareL Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>The feature-packed screen capture, recording, and sharing tool built natively for Linux Wayland.</strong>
</p>

---

ShareL brings the versatility of ShareX to modern Linux desktops. Whether you are capturing pixel-perfect regions on **Niri** or **Hyprland**, recording high-framerate gameplay via **GPU Screen Recorder**, annotating screenshots before sending them off, or sharing directly to your personal image host using `.sxcu` destination files, ShareL has you covered with zero friction.

<p align="center">
  <img width="1920" height="1032" alt="ShareL Desktop Interface" src="https://github.com/user-attachments/assets/546ec53a-cabb-4365-97f0-415b43b78889" />
</p>

---

## Quick Install

You can install ShareL with a single command. The script detects your Linux distribution, checks required packages, builds the app, and places `sharel` in your `~/.local/bin`:

```bash
curl -sSL https://raw.githubusercontent.com/44tl/ShareL/main/install.sh | bash
```

### Installer Flags

If you would like more control over how it is installed:

```bash
# Skip package manager dependency installation
./install.sh --no-deps

# Skip building and install an existing release binary
./install.sh --no-build

# Force reinstall even if already installed
./install.sh --force

# Custom install destination (default: ~/.local/bin)
./install.sh --prefix /usr/local
```

---

## Features at a Glance

### Screen Capture and Video Recording
* **Built for Wayland First**: Smooth, native support for **Niri** (with horizontal scrolling awareness), **Hyprland**, **Sway**, **GNOME**, **KDE Plasma**, and **COSMIC**.
* **Smart Backend Fallback**: Automatic routing between XDG Desktop Portal, direct `grim`/`slurp`, and native compositor IPC.
* **Versatile Modes**: Interactive region selection with a pixel magnifier, fullscreen capture, or targeted active window capture.
* **Delay Timer**: Set countdown delays to easily grab open menus, hover tooltips, and contextual dropdowns.
* **Hardware-Accelerated Recording**: Native integration with `gpu-screen-recorder` (NVENC / VAAPI) and `wf-recorder`.
* **Flexible Framerates and Codecs**: Record at 30, 60, 120 FPS or custom frame rates; encode to H.264, H.265/HEVC, AV1, VP9, or optimized animated GIFs.
* **Audio Channels**: Capture pristine desktop audio, microphone input, or mix both together.
* **Background Transcoding**: Encoding jobs run quietly in worker threads without freezing the UI.

### Built-in Annotation Editor
* **Vector Drawing Tools**: Add arrows, rectangles, circles, lines, freehand sketches, and text callouts.
* **Privacy Pixelation**: Quickly obscure passwords, tokens, API keys, and personal data.
* **Step Badges**: Place numbered markers to write effortless bug reports and step-by-step guides.
* **Image Cropping**: Trim screenshots down to the exact boundaries you need.
* **Full Undo and Redo**: Freely experiment with complete `Ctrl+Z` / `Ctrl+Y` history.

### ShareX (.sxcu) Custom Destinations
* **Drop-in ShareX Compatibility**: Directly import `.sxcu` files from your existing ShareX setup.
* **Keyless Defaults Out of the Box**: Ready to use immediately with zero-config destinations like `0x0.st` and `Litterbox`.
* **Every Request Format**: Full support for MultipartFormData, JSON payloads, FormUrlEncoded, and binary streams.
* **Smart Response Extraction**: Extract URLs using JSONPath (`$json:data.url$`), Regular Expressions (`$regex:pattern,1$`), or response headers (`$header:Location$`).
* **Custom Domain / CDN Mapping**: Automatically replace the upload response host with your custom domain or vanity URL.
* **Interactive Sandbox**: Test and debug upload configs with instant status codes, response previews, and latency timings.

### Power Tools
* **Instant OCR**: Extract text straight from your screen using Tesseract.
* **Color Picker and Pixel Inspector**: Sample exact hex/rgb colors and calculate aspect ratios, diagonal dimensions, and pixel areas.
* **QR Code Studio**: Scan and generate QR codes directly in your workspace.
* **History Gallery**: Browse, search, filter, and favorite all past captures and recordings.
* **Native File Manager Integration**: Reveal and highlight saved files in Nautilus, Dolphin, COSMIC Files, Thunar, or Nemo via DBus.

---

## Compositor Keybindings

Add ShareL shortcuts directly to your compositor config for instantaneous capture:

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

## CLI Usage

ShareL includes a comprehensive CLI that fits naturally into scripts, terminal aliases, and hotkey daemons:

```bash
# Display detected compositor, tools, and backend status
sharel info

# Capture an interactive region
sharel capture region

# Capture fullscreen and upload immediately
sharel capture fullscreen --upload

# 3-second delayed region capture with auto-upload
sharel capture region -d 3 -u

# Force a specific capture backend (auto, grim_slurp, xdg_desktop_portal, compositor)
sharel capture region --backend grim_slurp

# Upload an existing local file
sharel upload /path/to/screenshot.png

# Perform OCR on an image file
sharel ocr /path/to/document.png

# List all available custom uploaders
sharel uploaders
```

---

## System Dependencies

If you prefer to install dependencies manually before building:

### Arch Linux / Manjaro
```bash
sudo pacman -S ffmpeg tesseract tesseract-data-eng webkit2gtk-4.1 wl-clipboard grim slurp
```

### Fedora / RHEL
```bash
sudo dnf install ffmpeg tesseract webkit2gtk4.1-devel wl-clipboard grim slurp
```

### Ubuntu / Debian
```bash
sudo apt install ffmpeg tesseract-ocr libwebkit2gtk-4.1-dev wl-clipboard grim slurp
```

---

## Building from Source

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+) and [pnpm](https://pnpm.io/)
* [Rust](https://www.rust-lang.org/) and Cargo (stable)

### Development
```bash
# Install frontend packages
pnpm install

# Run the app in development mode with live reload
pnpm tauri dev
```

### Production Build
```bash
# Build the production release binary
pnpm tauri build
```

The optimized binary will be placed at `src-tauri/target/release/sharel`.

---

## Contributing

Contributions are welcome. Please check out our [Contributing Guidelines](CONTRIBUTING.md) and [Security Policy](SECURITY.md) before submitting pull requests.