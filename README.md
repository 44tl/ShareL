ShareL is the Linux-native counterpart to ShareX, designed for speed, reliability, and modern Wayland compositors (GNOME, KDE Plasma, Sway, and Hyprland). It provides full compatibility with ShareX `.sxcu` custom uploader files, instant screen annotations, automated capture workflows, and fast media encoding.

<img width="1917" height="1041" alt="Screenshot From 2026-08-18 04-09-45" src="https://github.com/user-attachments/assets/c19ad0b4-9abb-4614-af77-e724f064c1ac" />

## Quick Installation

```bash
curl -sSL https://raw.githubusercontent.com/44tl/ShareL/main/install.sh | bash
```

## Key Capabilities

### Wayland Screen Capture & Recording
- **Wayland Native**: Optimized for XDG Desktop Portal (`ashpd`), `grim`, and `slurp` for sub-millisecond region and window capture.
- **Capture Modes**: Region (interactive area selection with geometry overlay), Fullscreen, and Window.
- **Recording Engine**: High-performance animated GIF recording with two-pass palettegen optimization and MP4/WebM video recording using `wf-recorder` and `ffmpeg`.
- **Capture Timer**: Configurable delay timer (0s to 5s) for menus, tooltips, and temporary UI states.

### Interactive Image Annotation Editor
- **Vector Tools**: Arrows with directional heads, rectangles, circles, lines, pen brush, and semi-transparent highlighters.
- **Step Badges**: Auto-incrementing numbered markers (1, 2, 3...) for instructional guides and bug reporting.
- **Pixelation Filter**: True pixelate and blur tool for sensitive data, API keys, and passwords.
- **Typography & Cropping**: Text callouts with background pills and draggable boundary cropping.
- **Direct Actions**: Instant copy, save, or direct upload with one click.

### ShareX Custom Uploader (.sxcu) Engine
- **100% Compatibility**: Import existing `.sxcu` destination configurations directly from ShareX.
- **Response Extraction**: Parse upload links, thumbnails, and deletion URLs using JSONPath (`$json:path$`), regex groups (`$regex:1$`), and response headers (`$header:Location$`).
- **Live Test Inspector**: Built-in interactive uploader tester displaying response status, duration, and raw payload.

### Productivity Tools & History
- **Screen Color Picker**: Instant sampling with HEX, RGB, RGBA, and HSL formats.
- **Pixel Ruler**: Real-time screen dimension, area, diagonal, and aspect ratio calculator.
- **OCR Text Extraction**: Extract readable text from screenshots and images via Tesseract.
- **QR Code Studio**: Live QR code generator and reader.
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
ShareL requires modern Wayland screen capture utilities:

- **Arch Linux**:
  ```bash
  sudo pacman -S grim slurp wf-recorder ffmpeg tesseract tesseract-data-eng webkit2gtk-4.1
  ```

- **Fedora**:
  ```bash
  sudo dnf install grim slurp wf-recorder ffmpeg tesseract webkit2gtk4.1-devel
  ```

- **Ubuntu / Debian (Wayland session)**:
  ```bash
  sudo apt install grim slurp ffmpeg tesseract-ocr libwebkit2gtk-4.1-dev
  ```

---

## Development & Build (You will have a headache)

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