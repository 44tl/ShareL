ShareL is the Linux-native counterpart to ShareX, designed for speed, reliability, and modern Wayland compositors (GNOME, KDE Plasma, Sway, and Hyprland). It provides full compatibility with ShareX `.sxcu` custom uploader files, instant screen annotations, automated capture workflows, and fast media encoding.

<img width="1917" height="1041" alt="ShareL Desktop App" src="https://github.com/user-attachments/assets/c19ad0b4-9abb-4614-af77-e724f064c1ac" />

## Quick Installation

```bash
curl -sSL https://raw.githubusercontent.com/44tl/ShareL/main/install.sh | bash
```

## Key Capabilities

### Native Wayland Capture & Recording
- **Universal Wayland Portal**: Direct XDG Desktop Portal integration for sub-millisecond region, window, and fullscreen capture.
- **In-Process Stream Recording**: Native GStreamer PipeWire pipeline producing MP4 video and animated GIFs with two-pass palette optimization.
- **Configurable Timer**: Capture delay timer (0s to 5s) for menus, tooltips, and dynamic UI elements.

### Interactive Image Annotation Editor
- **Vector Annotation Tools**: Directional arrows, rectangles, circles, lines, pen brush, and semi-transparent highlighters.
- **Step Badges**: Auto-incrementing numbered markers (1, 2, 3...) for reproduction steps and guides.
- **Pixelation Filter**: Instant obfuscation for tokens, passwords, and sensitive areas.
- **Text & Cropping**: Text callouts and boundary cropping.
- **Full History**: Keyboard undo (`Ctrl + Z`) and redo (`Ctrl + Y` / `Ctrl + Shift + Z`).

### ShareX Custom Uploader (.sxcu) Engine
- **100% Compatibility**: Import existing `.sxcu` destination configurations directly from ShareX.
- **Custom Domains**: Prepend vanity domains and CDN URLs to response tokens.
- **Dynamic Extraction**: Parse responses with JSONPath (`$json:path$`), regex groups (`$regex:1$`), and response headers (`$header:Location$`).
- **Live Test Inspector**: Built-in test sandbox displaying HTTP status, roundtrip latency, and response payloads.

### Productivity Tools & History
- **Screen Color Picker**: Instant sampling with HEX, RGB, RGBA, and HSL formats.
- **Pixel Ruler**: Real-time screen dimension, area, diagonal, and aspect ratio calculator.
- **OCR Text Extraction**: Extract readable text from screenshots via Tesseract.
- **QR Studio**: Live QR generator and scanner.
- **Timeline Gallery**: Searchable capture history with favorites and quick actions.

### Command Line Interface (CLI)
ShareL can be triggered from global desktop keybinds, scripts, or terminal:
- `sharel capture region`: Take an interactive region screenshot.
- `sharel capture fullscreen --upload`: Take a fullscreen screenshot and upload it immediately.
- `sharel capture region -d 3 -u`: Take a delayed screenshot with automatic upload.
- `sharel upload /path/to/image.png`: Upload a file to your configured ShareX destination.
- `sharel ocr /path/to/image.png`: Extract text from an image and copy it to clipboard.
- `sharel uploaders`: List all configured destinations.

---

## Installation & Requirements

### System Dependencies
ShareL uses native Wayland XDG Desktop Portal and GStreamer PipeWire pipelines directly within the binary:

- **Arch Linux**:
  ```bash
  sudo pacman -S gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugin-pipewire ffmpeg tesseract tesseract-data-eng webkit2gtk-4.1
  ```

- **Fedora**:
  ```bash
  sudo dnf install gstreamer1 gstreamer1-plugins-base gstreamer1-plugins-good gstreamer1-plugins-bad-free gstreamer1-plugin-pipewire ffmpeg tesseract webkit2gtk4.1-devel
  ```

- **Ubuntu / Debian (Wayland session)**:
  ```bash
  sudo apt install gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-pipewire ffmpeg tesseract-ocr libwebkit2gtk-4.1-dev
  ```

---

## Development & Build

### Running Locally
```bash
# Install frontend dependencies
pnpm install

# Run application in development mode
pnpm tauri dev
```

### Compiling Production Binary
```bash
# Build desktop binary
pnpm tauri build
```

The compiled binary will be generated at `src-tauri/target/release/sharel`.