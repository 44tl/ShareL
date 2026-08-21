#!/usr/bin/env bash
set -euo pipefail

APP_NAME="ShareL"
BIN_NAME="sharel"
INSTALL_DIR="${XDG_DATA_HOME:-${HOME}/.local/bin}"
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

FORCE=0
NO_DEPS=0
NO_BUILD=0
DO_UPDATE=0
TARGET_TAG=""
PREFIX=""

usage() {
  cat <<EOF
Usage: ./install.sh [OPTIONS]

Install ShareL (compiles from source or fetches release) into your user environment.

Options:
  --update         Fetch latest source/release and update installed ShareL
  --version TAG    Install or switch to a specific Git release tag (e.g. v1.1.0)
  --no-deps        Skip system dependency installation
  --no-build       Skip compilation (use an existing ./src-tauri/target/release binary)
  --force          Reinstall even if ShareL is already present
  --prefix DIR     Install binaries into DIR (default: ~/.local/bin)
  -h, --help       Show this help message

Dependencies are installed automatically with the detected package manager
(pacman / apt-get / dnf / zypper) unless --no-deps is given.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --update) DO_UPDATE=1; FORCE=1 ;;
    --version) shift; TARGET_TAG="${1:-}"; FORCE=1 ;;
    --no-deps) NO_DEPS=1 ;;
    --no-build) NO_BUILD=1 ;;
    --force) FORCE=1 ;;
    --prefix) shift; PREFIX="${1:-}"; [ -z "$PREFIX" ] && { log_error "--prefix requires a directory argument."; exit 1; } ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
  shift
done
[ -n "$PREFIX" ] && INSTALL_DIR="$PREFIX"

log_info() { echo -e "${CYAN}➜${NC} ${BOLD}${APP_NAME}:${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} ${BOLD}${APP_NAME}:${NC} $1"; }
log_warn() { echo -e "${YELLOW}▲${NC} ${BOLD}${APP_NAME}:${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} ${BOLD}${APP_NAME}:${NC} $1" >&2; }

cleanup() {
  local rc=$?
  if [ $rc -ne 0 ] && [ -n "${TMP_DIR:-}" ]; then
    rm -rf "${TMP_DIR}"
  fi
  exit $rc
}
trap cleanup EXIT

if [ -n "${TARGET_TAG}" ]; then
  log_info "Fetching specific release version tag: ${TARGET_TAG}..."
  TMP_DIR="$(mktemp -d /tmp/sharel-build-XXXXXX)"
  git clone --branch "${TARGET_TAG}" --depth 1 https://github.com/44tl/ShareL.git "${TMP_DIR}" 2>/dev/null || {
    git clone https://github.com/44tl/ShareL.git "${TMP_DIR}"
    ( cd "${TMP_DIR}" && git checkout "${TARGET_TAG}" )
  }
  PROJECT_DIR="${TMP_DIR}"
elif [ "$DO_UPDATE" -eq 1 ]; then
  if [ -d "${PROJECT_DIR}/.git" ]; then
    log_info "Updating local repository via git pull..."
    ( cd "${PROJECT_DIR}" && git pull --rebase ) || true
  else
    log_info "Fetching latest master repository..."
    TMP_DIR="$(mktemp -d /tmp/sharel-build-XXXXXX)"
    git clone --depth 1 https://github.com/44tl/ShareL.git "${TMP_DIR}"
    PROJECT_DIR="${TMP_DIR}"
  fi
elif [ ! -f "${PROJECT_DIR}/src-tauri/Cargo.toml" ]; then
  log_info "Fetching latest source code repository..."
  TMP_DIR="$(mktemp -d /tmp/sharel-build-XXXXXX)"
  git clone --depth 1 https://github.com/44tl/ShareL.git "${TMP_DIR}"
  PROJECT_DIR="${TMP_DIR}"
fi

have() { command -v "$1" >/dev/null 2>&1; }

install_dependencies() {
  log_info "Verifying system runtime and build toolchain..."

  local missing=""
  for tool in cargo rustc pkg-config ffmpeg tesseract grim slurp wl-clipboard; do
    if ! have "$tool"; then
      missing="${missing} ${tool}"
    fi
  done

  if [ -z "${missing}" ]; then
    log_success "All required build and runtime tools are present."
    return 0
  fi

  log_warn "Missing tools:${missing}"
  if ! have sudo; then
    log_error "sudo is required to install system packages but was not found."
    exit 1
  fi

  if have pacman; then
    log_info "Installing dependencies with pacman..."
    sudo pacman -S --needed --noconfirm \
      base-devel rust cargo nodejs npm webkit2gtk-4.1 openssl \
      libayatana-appindicator grim slurp ffmpeg tesseract \
      tesseract-data-eng wl-clipboard
  elif have apt-get; then
    log_info "Installing dependencies with apt-get..."
    sudo apt-get update -y
    sudo apt-get install -y \
      build-essential curl wget libssl-dev libwebkit2gtk-4.1-dev \
      libayatana-appindicator3-dev librsvg2-dev ffmpeg tesseract-ocr \
      wl-clipboard
  elif have dnf; then
    log_info "Installing dependencies with dnf..."
    sudo dnf install -y \
      gcc gcc-c++ openssl-devel webkit2gtk4.1-devel \
      libappindicator-gtk3-devel librsvg2-devel ffmpeg tesseract \
      wl-clipboard
  elif have zypper; then
    log_info "Installing dependencies with zypper..."
    sudo zypper install -y \
      gcc gcc-c++ libopenssl-devel webkit2gtk3-devel \
      libappindicator3-devel ffmpeg tesseract-ocr wl-clipboard
  else
    log_error "No supported package manager detected (pacman, apt-get, dnf, zypper)."
    log_error "Install the following manually: rust, cargo, pkg-config, webkit2gtk-4.1, ffmpeg, tesseract, grim, slurp, wl-clipboard"
    exit 1
  fi
}

if [ "$NO_DEPS" -eq 0 ]; then
  install_dependencies
fi

if ! have cargo; then
  if [ -f "${HOME}/.cargo/env" ]; then
    # shellcheck disable=SC1091
    source "${HOME}/.cargo/env"
  fi
fi
if ! have cargo; then
  log_error "Rust toolchain ('cargo') not found."
  log_error "Install it from https://rustup.rs or your package manager."
  exit 1
fi

if ! have node; then
  log_error "Node.js (v18+) is required to build the interface but was not found."
  exit 1
fi

build_app() {
  log_info "Compiling web frontend interface..."
  ( cd "${PROJECT_DIR}" && (
    if have pnpm; then
      pnpm install --frozen-lockfile 2>/dev/null || pnpm install
      pnpm build
    elif have npm; then
      npm install
      npm run build
    else
      npx -y pnpm install
      npx -y pnpm build
    fi
  ) ) || { log_error "Frontend build failed."; exit 1; }

  log_info "Building optimized native release binary..."
  ( cd "${PROJECT_DIR}/src-tauri" && cargo build --release --locked ) \
    || { log_error "Native build failed."; exit 1; }
}

if [ "$NO_BUILD" -eq 0 ]; then
  build_app
else
  log_info "Skipping compilation as requested (--no-build)."
fi

TARGET_BIN="${PROJECT_DIR}/src-tauri/target/release/${BIN_NAME}"
if [ ! -f "${TARGET_BIN}" ]; then
  log_error "Compiled binary was not found at ${TARGET_BIN}"
  exit 1
fi

if [ -f "${INSTALL_DIR}/${BIN_NAME}" ] && [ "$FORCE" -eq 0 ]; then
  log_warn "${BIN_NAME} is already installed at ${INSTALL_DIR}/${BIN_NAME}."
  log_info "Use --force to reinstall."
  exit 0
fi

log_info "Installing binary and desktop integration assets..."
mkdir -p "${INSTALL_DIR}"
mkdir -p "${DESKTOP_DIR}"
mkdir -p "${ICON_DIR}"
mkdir -p "${ICON_PNG_DIR}"

install -Dm755 "${TARGET_BIN}" "${INSTALL_DIR}/${BIN_NAME}"

if [ -f "${PROJECT_DIR}/sharel-logo.svg" ]; then
  install -Dm644 "${PROJECT_DIR}/sharel-logo.svg" "${ICON_DIR}/sharel.svg"
  install -Dm644 "${PROJECT_DIR}/sharel-logo.svg" "${ICON_PNG_DIR}/sharel.svg"
fi

install -Dm644 /dev/stdin "${DESKTOP_DIR}/sharel.desktop" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=ShareL
GenericName=Screen Capture and Recording
Comment=Wayland Native Screen Capture, Studio Recording and ShareX Hub
Exec=${INSTALL_DIR}/${BIN_NAME} %U
Icon=sharel
Terminal=false
StartupNotify=true
Categories=Utility;Graphics;AudioVideo;Recorder;
Keywords=screenshot;screen;capture;sharex;recorder;gif;wayland;
MimeType=image/png;image/jpeg;image/webp;image/gif;video/mp4;video/webm;
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

if have update-desktop-database; then
  update-desktop-database "${DESKTOP_DIR}" || true
fi
if have gtk-update-icon-cache; then
  gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" || true
fi

log_success "Installation completed successfully!"
echo -e "\n${BOLD}Executable:${NC}     ${INSTALL_DIR}/${BIN_NAME}"
echo -e "${BOLD}Desktop file:${NC}   ${DESKTOP_DIR}/sharel.desktop"
echo -e "${BOLD}Icon path:${NC}      ${ICON_DIR}/sharel.svg\n"

if ! "${INSTALL_DIR}/${BIN_NAME}" info >/dev/null 2>&1; then
  log_error "Installed binary failed its self-check. Re-run with --no-build after a successful build."
  exit 1
fi
log_success "Binary self-check passed."

if [[ ":${PATH}:" != *":${INSTALL_DIR}:"* ]]; then
log_warn "${INSTALL_DIR} is not in your current PATH."
    shell_rc=""
    for rc in "${HOME}/.bashrc" "${HOME}/.zshrc" "${HOME}/.config/fish/config.fish"; do
      if [ -f "$rc" ]; then shell_rc="$rc"; break; fi
    done
    if [ -n "$shell_rc" ]; then
      if ! grep -qF "export PATH=\"${INSTALL_DIR}:\$PATH\"" "$shell_rc" 2>/dev/null; then
        echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "$shell_rc"
        log_info "Added ${INSTALL_DIR} to PATH in ${shell_rc}."
      fi
    else
      echo -e "  Add this line to your shell profile:"
      echo -e "  ${CYAN}export PATH=\"${INSTALL_DIR}:\$PATH\"${NC}"
    fi
  fi

echo -e "\nLaunch ShareL from your application launcher or type ${BOLD}sharel${NC} in a new terminal.\n"