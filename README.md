# ShareL

ShareL is a modern desktop application built for high-performance screen capture, recording studio control, and custom destination sharing. Built natively for modern Linux Wayland compositors (**Niri**, **Hyprland**, **Sway**, **GNOME**, **KDE Plasma**, and **COSMIC**) and macOS.

> **Platform Support**: Linux (Wayland) and macOS only. Windows is not supported.

<img width="1920" height="1032" alt="ShareL Desktop Interface" src="https://github.com/user-attachments/assets/546ec53a-cabb-4365-97f0-415b43b78889" />

## Quick Installation

Run the automated installer script:

```bash
curl -sSL https://raw.githubusercontent.com/44tl/ShareL/main/install.sh | bash
```

## Features

### Capture Hub
* **First-Class Wayland Compositors**: Native integration with **Niri** (scrollable tiling), **Hyprland**, **Sway**, **GNOME**, **KDE Plasma**, and **COSMIC**.
* **Intelligent Backend Routing**: Seamless routing across XDG Desktop Portal, grim/slurp, and compositor-native IPC.
* **Capture Modes**: Interactive Region selection with magnifier, Fullscreen display capture, and targeted Application Window capture.
* **Configurable Delay**: Delay timer (0 to 5 seconds) for capturing menus, dropdowns, and temporary tooltips.

### Recording Control Center
* **Hardware Acceleration**: Support for `gpu-screen-recorder` (NVENC/VAAPI) and `wf-recorder` backends.
* **Framerate & Codec Control**: 30, 60, 120, and custom FPS selector with Constant Frame Rate (CFR) pacing; H.264, H.265/HEVC, AV1, VP9, and GIF encoding.
* **Asynchronous Transcoding**: Instant recording halt with non-blocking background encoding workers and real-time UI progress bars.
* **Audio Routing**: Capture system audio, microphone, or both channels simultaneously.
* **GIF Studio**: High-quality two-pass palette generation (`palettegen` + `paletteuse`) for chat and web sharing.

### Image Annotation Editor
* **Vector Drawing Tools**: Arrows, rectangles, ellipses, lines, and freehand brush.
* **Step Markers**: Auto-incrementing numbered badges for documentation and bug reproduction steps.
* **Obfuscation**: Pixelation filter for masking passwords, credentials, and sensitive data.
* **Cropping & Text**: Image boundary cropping and typography overlays.
* **History Control**: Full undo (`Ctrl + Z`) and redo (`Ctrl + Y` / `Ctrl + Shift + Z`) stack.

### ShareX (.sxcu) Custom Uploaders
* **ShareX Compatibility**: Import and run existing `.sxcu` destination files directly.
* **Keyless Defaults**: Pre-configured with zero-credential destinations (`0x0.st` and `Litterbox`).
* **Payload Types**: Supports MultipartFormData, JSON, FormUrlEncoded, and raw binary uploads.
* **Custom Domain Mapping**: Prepend custom domain names or CDN prefixes to uploaded URLs.
* **Response Parsing**: Extract URLs using JSONPath (`$json:path.to.key$`), regular expressions (`$regex:pattern,group$`), and response headers (`$header:Location$`).
* **Test Sandbox**: Built-in test inspector displaying HTTP status codes, latency, and raw response payloads.

### OCR & History Gallery
* **OCR Text Extraction**: Extract text from images using Tesseract OCR.
* **Capture & Recording History**: Searchable gallery of captures and recordings with favorites and metadata.
* **Native Desktop File Manager**: Direct DBus (`org.freedesktop.FileManager1.ShowItems`) integration to open and highlight files in Nautilus, Dolphin, COSMIC Files, Thunar, or Nemo.

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
```ini
bindsym Print exec sharel capture region
bindsym $mod+Print exec sharel capture region --upload
bindsym Mod1+Print exec sharel capture window
bindsym Control+Print exec sharel capture fullscreen
```

## Command Line Interface

ShareL can be integrated into system keybindings, shell scripts, and terminal workflows:

```bash
# Print compositor & backend diagnostics
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
