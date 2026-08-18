#!/usr/bin/env bash
set -e

APP_NAME="ShareL"
BIN_NAME="sharel"
INSTALL_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/scalable/apps"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || true)"

if [ ! -f "${PROJECT_DIR}/src-tauri/Cargo.toml" ]; then
    echo "Cloning ShareL repository..."
    TMP_DIR="$(mktemp -d /tmp/sharel-build-XXXXXX)"
    git clone --depth 1 https://github.com/44tl/ShareL.git "${TMP_DIR}"
    PROJECT_DIR="${TMP_DIR}"
    trap 'rm -rf "${TMP_DIR}"' EXIT
fi

echo "Starting ${APP_NAME} installation..."

check_pkg_manager() {
    if command -v pacman >/dev/null 2>&1; then
        echo "Detected Arch Linux system."
        echo "Ensuring runtime dependencies: gstreamer, gst-plugins-base, gst-plugins-good, gst-plugins-bad, ffmpeg, tesseract, webkit2gtk-4.1, wl-clipboard..."
        sudo pacman -S --needed --noconfirm gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugin-pipewire ffmpeg tesseract tesseract-data-eng webkit2gtk-4.1 wl-clipboard || true
    elif command -v apt >/dev/null 2>&1; then
        echo "Detected Debian/Ubuntu system."
        sudo apt update -y && sudo apt install -y gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-pipewire ffmpeg tesseract-ocr libwebkit2gtk-4.1-dev wl-clipboard || true
    elif command -v dnf >/dev/null 2>&1; then
        echo "Detected Fedora system."
        sudo dnf install -y gstreamer1 gstreamer1-plugins-base gstreamer1-plugins-good gstreamer1-plugins-bad-free gstreamer1-plugin-pipewire ffmpeg tesseract webkit2gtk4.1-devel wl-clipboard || true
    elif command -v zypper >/dev/null 2>&1; then
        echo "Detected openSUSE system."
        sudo zypper install -y gstreamer gstreamer-plugins-base gstreamer-plugins-good gstreamer-plugins-bad ffmpeg tesseract-ocr webkit2gtk3-devel wl-clipboard || true
    fi
}

if [ "$1" != "--no-deps" ]; then
    check_pkg_manager
fi

echo "Building ${APP_NAME} desktop application..."
cd "${PROJECT_DIR}"

if command -v pnpm >/dev/null 2>&1; then
    pnpm install
    pnpm run build
elif command -v npm >/dev/null 2>&1; then
    npm install
    npm run build
fi

if command -v pnpm >/dev/null 2>&1; then
    pnpm tauri build --no-bundle
else
    cargo build --release --manifest-path "${PROJECT_DIR}/src-tauri/Cargo.toml"
fi

TARGET_BIN="${PROJECT_DIR}/src-tauri/target/release/${BIN_NAME}"
if [ ! -f "${TARGET_BIN}" ]; then
    TARGET_BIN="${PROJECT_DIR}/src-tauri/target/debug/${BIN_NAME}"
fi

if [ ! -f "${TARGET_BIN}" ]; then
    echo "Error: compiled binary not found at ${TARGET_BIN}"
    exit 1
fi

mkdir -p "${INSTALL_DIR}"
mkdir -p "${DESKTOP_DIR}"
mkdir -p "${ICON_DIR}"

cp -f "${TARGET_BIN}" "${INSTALL_DIR}/${BIN_NAME}"
chmod +x "${INSTALL_DIR}/${BIN_NAME}"

cp -f "${PROJECT_DIR}/sharel-logo.svg" "${ICON_DIR}/sharel.svg"

cat > "${DESKTOP_DIR}/sharel.desktop" <<EOF
[Desktop Entry]
Name=ShareL
Comment=Screen Capture, Recording and Sharing for Linux
Exec=${INSTALL_DIR}/${BIN_NAME}
Icon=sharel
Terminal=false
Type=Application
Categories=Utility;Graphics;AudioVideo;Recorder;
Keywords=screenshot;screen;capture;sharex;recorder;gif;
StartupWMClass=ShareL
EOF

chmod +x "${DESKTOP_DIR}/sharel.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "${DESKTOP_DIR}" 2>/dev/null || true
fi

echo "${APP_NAME} installed successfully."
echo "Binary location: ${INSTALL_DIR}/${BIN_NAME}"
echo "Desktop launcher: ${DESKTOP_DIR}/sharel.desktop"
echo "Launch ShareL from your application menu or run '${BIN_NAME}' in terminal."
