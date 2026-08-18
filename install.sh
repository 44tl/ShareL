#!/usr/bin/env bash
set -e

APP_NAME="ShareL"
BIN_NAME="sharel"
INSTALL_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/scalable/apps"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting ${APP_NAME} installation..."

check_pkg_manager() {
    if command -v pacman >/dev/null 2>&1; then
        echo "Detected Arch Linux system."
        echo "Ensuring runtime dependencies: grim, slurp, wf-recorder, ffmpeg, tesseract, webkit2gtk-4.1..."
        sudo pacman -S --needed --noconfirm grim slurp wf-recorder ffmpeg tesseract webkit2gtk-4.1 || true
    elif command -v apt >/dev/null 2>&1; then
        echo "Detected Debian/Ubuntu system."
        sudo apt update -y && sudo apt install -y grim slurp ffmpeg tesseract-ocr libwebkit2gtk-4.1-dev || true
    elif command -v dnf >/dev/null 2>&1; then
        echo "Detected Fedora system."
        sudo dnf install -y grim slurp wf-recorder ffmpeg tesseract webkit2gtk4.1-devel || true
    elif command -v zypper >/dev/null 2>&1; then
        echo "Detected openSUSE system."
        sudo zypper install -y grim slurp ffmpeg tesseract-ocr webkit2gtk3-devel || true
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

cargo build --release --manifest-path "${PROJECT_DIR}/src-tauri/Cargo.toml"

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

cp -f "${PROJECT_DIR}/public/sharel-logo.svg" "${ICON_DIR}/sharel.svg"

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
