#!/usr/bin/env bash
set -eo pipefail

APP_NAME="ShareL"
BIN_NAME="sharel"
INSTALL_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/scalable/apps"
ICON_PNG_DIR="${HOME}/.local/share/icons/hicolor/512x512/apps"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || true)"

BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[0;36m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m"

log_info() {
    echo -e "${CYAN}➜${NC} ${BOLD}${APP_NAME}:${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} ${BOLD}${APP_NAME}:${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}▲${NC} ${BOLD}${APP_NAME}:${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} ${BOLD}${APP_NAME}:${NC} $1" >&2
}

if [ ! -f "${PROJECT_DIR}/src-tauri/Cargo.toml" ]; then
    log_info "Fetching latest source code repository..."
    TMP_DIR="$(mktemp -d /tmp/sharel-build-XXXXXX)"
    git clone --depth 1 https://github.com/44tl/ShareL.git "${TMP_DIR}"
    PROJECT_DIR="${TMP_DIR}"
    trap 'rm -rf "${TMP_DIR}"' EXIT
fi

install_dependencies() {
    log_info "Verifying system runtime and build toolchain..."

    if command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --needed --noconfirm \
            base-devel rust cargo nodejs webkit2gtk-4.1 openssl libayatana-appindicator \
            grim slurp ffmpeg tesseract tesseract-data-eng wl-clipboard 2>/dev/null || true
    elif command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -y
        sudo apt-get install -y \
            build-essential curl wget libssl-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
            librsvg2-dev ffmpeg tesseract-ocr wl-clipboard 2>/dev/null || true
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y \
            gcc gcc-c++ openssl-devel webkit2gtk4.1-devel libappindicator-gtk3-devel \
            librsvg2-devel ffmpeg tesseract wl-clipboard 2>/dev/null || true
    elif command -v zypper >/dev/null 2>&1; then
        sudo zypper install -y \
            gcc gcc-c++ libopenssl-devel webkit2gtk3-devel libappindicator3-devel \
            ffmpeg tesseract-ocr wl-clipboard 2>/dev/null || true
    fi
}

if [ "$1" != "--no-deps" ]; then
    install_dependencies
fi

if ! command -v cargo >/dev/null 2>&1; then
    if [ -f "${HOME}/.cargo/env" ]; then
        source "${HOME}/.cargo/env"
    else
        log_error "Rust toolchain ('cargo') not found. Please install Rust via https://rustup.rs or your package manager."
        exit 1
    fi
fi

if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js not found. Please install Node.js (v18+) to build the interface."
    exit 1
fi

log_info "Compiling web frontend interface..."
cd "${PROJECT_DIR}"

if command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    pnpm build
elif command -v npm >/dev/null 2>&1; then
    npm install
    npm run build
else
    npx -y pnpm install
    npx -y pnpm build
fi

log_info "Building optimized native release binary..."
cargo build --release --manifest-path "${PROJECT_DIR}/src-tauri/Cargo.toml"

TARGET_BIN="${PROJECT_DIR}/src-tauri/target/release/${BIN_NAME}"
if [ ! -f "${TARGET_BIN}" ]; then
    log_error "Compiled binary was not found at ${TARGET_BIN}"
    exit 1
fi

log_info "Installing binary and desktop integration assets..."
mkdir -p "${INSTALL_DIR}"
mkdir -p "${DESKTOP_DIR}"
mkdir -p "${ICON_DIR}"
mkdir -p "${ICON_PNG_DIR}"

cp -f "${TARGET_BIN}" "${INSTALL_DIR}/${BIN_NAME}"
chmod 755 "${INSTALL_DIR}/${BIN_NAME}"

if [ -f "${PROJECT_DIR}/sharel-logo.svg" ]; then
    cp -f "${PROJECT_DIR}/sharel-logo.svg" "${ICON_DIR}/sharel.svg"
    cp -f "${PROJECT_DIR}/sharel-logo.svg" "${ICON_PNG_DIR}/sharel.svg" 2>/dev/null || true
fi

cat > "${DESKTOP_DIR}/sharel.desktop" <<EOF
[Desktop Entry]
Name=ShareL
GenericName=Screen Capture & Recording
Comment=Wayland Native Screen Capture, Studio Recording and ShareX Hub
Exec=${INSTALL_DIR}/${BIN_NAME} %U
Icon=sharel
Terminal=false
Type=Application
Categories=Utility;Graphics;AudioVideo;Recorder;
Keywords=screenshot;screen;capture;sharex;recorder;gif;wayland;
StartupWMClass=ShareL
Actions=CaptureRegion;CaptureFullscreen;OpenStudio;

[Desktop Action CaptureRegion]
Name=Capture Region
Exec=${INSTALL_DIR}/${BIN_NAME} capture region

[Desktop Action CaptureFullscreen]
Name=Capture Fullscreen
Exec=${INSTALL_DIR}/${BIN_NAME} capture fullscreen

[Desktop Action OpenStudio]
Name=Recording Studio
Exec=${INSTALL_DIR}/${BIN_NAME} record
EOF

chmod 644 "${DESKTOP_DIR}/sharel.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "${DESKTOP_DIR}" 2>/dev/null || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" 2>/dev/null || true
fi

log_success "Installation completed successfully!"
echo -e "\n${BOLD}Executable:${NC}     ${INSTALL_DIR}/${BIN_NAME}"
echo -e "${BOLD}Desktop File:${NC}   ${DESKTOP_DIR}/sharel.desktop"
echo -e "${BOLD}Icon Path:${NC}      ${ICON_DIR}/sharel.svg\n"

if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
    log_warn "${INSTALL_DIR} is not in your current PATH."
    echo -e "Add this line to your ${BOLD}~/.bashrc${NC} or ${BOLD}~/.zshrc${NC}:"
    echo -e "  ${CYAN}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}\n"
fi

echo -e "Launch ShareL from your application launcher or type ${BOLD}sharel${NC} in terminal.\n"
