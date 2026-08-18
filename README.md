# ShareL

ShareL is a Linux-native desktop application designed for fast screen capture, recording, and custom destination sharing on modern Wayland compositors (**Niri**, **Hyprland**, **Sway**, **GNOME**, **KDE Plasma**, and **COSMIC**). It supports ShareX `.sxcu` custom uploader configurations, full image annotation, automated post-capture workflows, and media encoding.

<img width="1920" height="972" alt="ShareL Desktop Interface" src="https://github.com/user-attachments/assets/ef84fb54-c7bc-4bf0-8b84-3cce8ae3c609" />

## Quick Installation

Run the automated installer script:

```bash
curl -sSL https://raw.githubusercontent.com/44tl/ShareL/main/install.sh | bash
```

## First-Class Wayland Architecture & Backends

ShareL detects your Wayland compositor automatically and routes captures through the most efficient available backend:

```text
Backend Architecture
├── XDG Desktop Portal (ashpd screenshot & screencast API)
├── grim/slurp (Direct Wayland screencopy & interactive region selection)
├── gpu-screen-recorder (Hardware-accelerated NVENC / VAAPI video recording)
├── wf-recorder (Wayland screencopy video/GIF recorder)
└── Compositor-Specific Integration
    ├── Niri (`niri msg action screenshot`, `screenshot-screen`, `screenshot-window`)
    ├── Hyprland (`hyprctl activewindow -j` window geometry tracking)
    ├── Sway (`swaymsg -t get_tree` tree introspection)
    ├── COSMIC (`cosmic-comp` / `cosmic-screenshot` portal integration)
    ├── GNOME (Mutter Portal & Shell DBus)
    ├── KDE Plasma (KWin Portal & Spectacle DBus)
    └── Generic Wayland Fallback (Standard wlroots / screencopy protocol)
```

## Features

### Capture and Recording
* **First-Class Wayland Compositors**: Native support for **Niri** (scrollable tiling), **Hyprland**, **Sway**, **GNOME**, **KDE Plasma**, and **COSMIC**.
* **Intelligent Backend Routing**: Seamless fallback across XDG Desktop Portal, grim/slurp, gpu-screen-recorder, wf-recorder, and compositor-native IPC.
* **Screen Recording**: Supports gpu-screen-recorder and wf-recorder backends, including animated GIF output with two-pass palette optimization and MP4 recording.
* **Configurable Delay**: Capture delay timer (0 to 5 seconds) for capturing menus, tooltips, and temporary UI states.

### Annotation Editor
* **Vector Tools**: Arrows, rectangles, ellipses, lines, freehand brush, and semi-transparent highlighters.
* **Step Markers**: Auto-incrementing numbered badges for documentation and bug reproduction steps.
* **Obfuscation**: Pixelation filter for masking passwords, credentials, and sensitive information.
* **Text and Crop**: Text insertion and image boundary cropping.
* **History Control**: Undo (`Ctrl + Z`) and redo (`Ctrl + Y` / `Ctrl + Shift + Z`).

### ShareX (.sxcu) Custom Uploaders
* **Full Compatibility**: Import and run existing `.sxcu` configuration files directly.
* **Payload Types**: Supports MultipartFormData, JSON, FormUrlEncoded, and raw binary uploads.
* **Custom Domain Mapping**: Prepend custom domain names or CDN prefixes to uploaded file URLs.
* **Response Parsing**: Extract URLs using JSONPath (`$json:path.to.key$`), regular expressions (`$regex:pattern,group$`), and response headers (`$header:Location$`).
* **Test Sandbox**: Built-in test inspector displaying HTTP status codes, latency, and raw response bodies.

### Integrated Tools
* **Color Picker**: Inspect screen pixel colors with HEX, RGB, RGBA, and HSL formatting.
* **Pixel Calculator**: Calculate pixel dimensions, surface area, diagonal distance, and aspect ratio.
* **OCR Text Extraction**: Extract text from images using Tesseract OCR.
* **QR Code Studio**: Generate and inspect QR codes directly within the utility panel.
* **Capture History**: Searchable gallery of captures and recordings with favorites and quick action buttons.

## Compositor Keybinding Configuration

### Niri (`~/.config/niri/config.kdl`)
```kdl
binds {
    // Interactive Region Capture
    Print { spawn "sharel" "capture" "region"; }
    
    // Region Capture with Instant Upload
    Mod+Print { spawn "sharel" "capture" "region" "--upload"; }
    
    // Window Capture
    Alt+Print { spawn "sharel" "capture" "window"; }
    
    // Fullscreen Capture
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

ShareL requires standard media and system libraries depending on your distribution:

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
# Install frontend dependencies
pnpm install

# Start development application
pnpm tauri dev
```

### Production Compilation
```bash
# Build desktop binary and distribution packages
pnpm tauri build
```

The compiled binary will be located at `src-tauri/target/release/sharel`.
