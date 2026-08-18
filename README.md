# ShareL

ShareL is a Linux-native desktop application for screen capture, recording, and
custom destination sharing on modern Wayland compositors (**Niri**, **Hyprland**,
**Sway**, **GNOME**, **KDE Plasma**, and **COSMIC**). It supports ShareX `.sxcu`
custom uploader configurations, image annotation, automated post-capture
workflows, and media encoding.

Current version 1.0.0

<img width="1920" height="1032" alt="ShareL Desktop Interface" src="https://github.com/user-attachments/assets/546ec53a-cabb-4365-97f0-415b43b78889" />

## Quick Installation

Run the automated installer script. It fetches the latest source, installs system
dependencies with your package manager, compiles the frontend and native binary,
and installs `sharel` into `~/.local/bin`:

```bash
curl -sSL https://raw.githubusercontent.com/44tl/ShareL/main/install.sh | bash
```

The installer accepts the following options:

```bash
# Skip system dependency installation
./install.sh --no-deps

# Skip compilation and install an already-built binary
./install.sh --no-build

# Reinstall even if ShareL is already present
./install.sh --force

# Install binaries into a custom prefix (default: ~/.local/bin)
./install.sh --prefix /opt

# Show help
./install.sh --help
```

## Features

### Capture and Recording

* **First-Class Wayland Compositors**: Native integration with **Niri**
  (scrollable tiling), **Hyprland**, **Sway**, **GNOME**, **KDE Plasma**, and
  **COSMIC**.
* **Intelligent Backend Routing**: Seamless fallback across XDG Desktop Portal,
  `grim`/`slurp`, and compositor-native IPC.
* **Capture Modes**: Interactive Region selection with magnifier, Fullscreen
  display capture, and targeted Application Window capture.
* **Configurable Delay**: Delay timer for capturing menus, dropdowns, and
  temporary tooltips.
* **Hardware Acceleration**: Support for `gpu-screen-recorder` (NVENC/VAAPI) and
  `wf-recorder` backends.
* **Framerate and Codec Control**: 30, 60, 120, and custom FPS selector with
  Constant Frame Rate (CFR) pacing; H.264, H.265/HEVC, AV1, VP9, and GIF
  encoding.
* **Asynchronous Transcoding**: Non-blocking background encoding workers with
  real-time UI progress bars.
* **Audio Routing**: Capture system audio, microphone, or both channels
  simultaneously.
* **GIF Studio**: Two-pass palette optimization (`palettegen` + `paletteuse`)
  for chat and web sharing.

### Annotation Editor

* **Vector Drawing Tools**: Arrows, rectangles, ellipses, lines, and freehand
  brush.
* **Obfuscation**: Pixelation filter for masking passwords, credentials, and
  sensitive data.
* **Cropping and Text**: Image boundary cropping and typography overlays.
* **Step Markers**: Numbered annotations for documentation and bug reproduction
  steps.
* **History Control**: Full undo (`Ctrl + Z`) and redo (`Ctrl + Y` /
  `Ctrl + Shift + Z`) stack.

### ShareX (.sxcu) Custom Uploaders

* **ShareX Compatibility**: Import and run existing `.sxcu` destination files
  directly.
* **Keyless Defaults**: Pre-configured with zero-credential destinations
  (`0x0.st` and `Litterbox`).
* **Payload Types**: Supports MultipartFormData, JSON, FormUrlEncoded, and raw
  binary uploads.
* **Response Parsing**: Extract URLs using JSONPath (`$json:path.to.key$`),
  regular expressions (`$regex:pattern,group$`), and response headers
  (`$header:Location$`).
* **Test Sandbox**: Built-in test inspector displaying HTTP status codes,
  latency, and raw response bodies.

### Integrated Tools

* **OCR Text Extraction**: Extract text from images using Tesseract OCR.
* **Color Picker and Pixel Calculator**: Inspect screen pixel colors and
  calculate pixel dimensions, surface area, diagonal distance, and aspect ratio.
* **QR Code Studio**: Generate and inspect QR codes directly within the utility
  panel.
* **Capture and Recording History**: Gallery of captures and recordings with
  favorites and metadata.
* **Native Desktop File Manager**: Direct DBus
  (`org.freedesktop.FileManager1.ShowItems`) integration to open and highlight
  files in Nautilus, Dolphin, COSMIC Files, Thunar, or Nemo.

## Compositor Keybinding Configuration

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

## Command Line Interface

ShareL can be integrated into system keybindings, shell scripts, and terminal
workflows:

```bash
# Print compositor and backend diagnostics
sharel info

# Interactive region capture
sharel capture region

# Fullscreen capture with immediate upload
sharel capture fullscreen --upload

# Delayed capture (3 seconds) with automatic upload
sharel capture region -d 3 -u

# Override capture backend explicitly (auto, grim_slurp, xdg_desktop_portal, compositor)
sharel capture region --backend grim_slurp

# Upload an existing local file
sharel upload /path/to/image.png

# Extract text via OCR
sharel ocr /path/to/image.png

# List configured destinations
sharel uploaders
```

## System Dependencies

ShareL requires standard media and system libraries depending on your
distribution:

### Arch Linux
```bash
sudo pacman -S ffmpeg tesseract tesseract-data-eng webkit2gtk-4.1 wl-clipboard grim slurp
```

### Fedora
```bash
sudo dnf install ffmpeg tesseract webkit2gtk4.1-devel wl-clipboard grim slurp
```

### Ubuntu / Debian (Wayland Session)
```bash
sudo apt install ffmpeg tesseract-ocr libwebkit2gtk-4.1-dev wl-clipboard grim slurp
```

## Build and Development

### Development Environment
```bash
pnpm install
pnpm tauri dev
```

### Production Compilation
```bash
pnpm tauri build
```

The compiled binary will be located at `src-tauri/target/release/sharel`.