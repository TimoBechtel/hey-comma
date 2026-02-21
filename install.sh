#!/usr/bin/env bash
set -euo pipefail

REPO="TimoBechtel/hey-comma"
BIN_NAME="hey"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

log() {
  printf "%s\n" "$*"
}

fail() {
  printf "Error: %s\n" "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

detect_asset() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Darwin)
      case "$arch" in
        arm64) printf "hey-darwin-arm64" ;;
        x86_64 | amd64) printf "hey-darwin-x64" ;;
        *) fail "Unsupported macOS architecture: $arch" ;;
      esac
      ;;
    Linux)
      case "$arch" in
        x86_64 | amd64) printf "hey-linux-x64" ;;
        *) fail "Unsupported Linux architecture: $arch" ;;
      esac
      ;;
    MINGW* | MSYS* | CYGWIN*)
      case "$arch" in
        x86_64 | amd64) printf "hey-windows-x64.exe" ;;
        *) fail "Unsupported Windows architecture: $arch" ;;
      esac
      ;;
    *)
      fail "Unsupported operating system: $os"
      ;;
  esac
}

resolve_tag() {
  if [ -n "${HEY_COMMA_VERSION:-}" ]; then
    if [[ "$HEY_COMMA_VERSION" == v* ]]; then
      printf "%s" "$HEY_COMMA_VERSION"
    else
      printf "v%s" "$HEY_COMMA_VERSION"
    fi
    return
  fi

  local tag
  tag="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
  [ -n "$tag" ] || fail "Could not resolve latest release tag"
  printf "%s" "$tag"
}

check_path() {
  case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *)
      log ""
      log "Warning: $INSTALL_DIR is not on PATH."
      log "Add this to your shell config:"
      log "  export PATH=\"$INSTALL_DIR:\$PATH\""
      ;;
  esac
}

main() {
  require_cmd curl
  require_cmd chmod
  require_cmd mv
  require_cmd mkdir
  require_cmd uname

  local asset tag url tmp_file final_path
  asset="$(detect_asset)"
  tag="$(resolve_tag)"
  url="https://github.com/$REPO/releases/download/$tag/$asset"
  tmp_file="$(mktemp)"
  final_path="$INSTALL_DIR/$BIN_NAME"

  log "Installing $BIN_NAME $tag"
  log "Downloading $asset"
  curl -fL "$url" -o "$tmp_file" || fail "Failed to download asset from $url"

  mkdir -p "$INSTALL_DIR"
  chmod +x "$tmp_file"
  mv "$tmp_file" "$final_path"

  log "Installed to $final_path"
  check_path

  if "$final_path" --version >/dev/null 2>&1; then
    log "Install verified: $("$final_path" --version)"
  else
    fail "Install finished, but version check failed"
  fi
}

main "$@"
