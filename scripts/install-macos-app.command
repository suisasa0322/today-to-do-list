#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SOURCE_APP="${TODAY_TODO_SOURCE_APP:-$REPO_ROOT/src-tauri/target/debug/bundle/macos/Today To Do List.app}"
INSTALL_DIR="${TODAY_TODO_INSTALL_DIR:-/Applications}"
DESTINATION="$INSTALL_DIR/Today To Do List.app"
STAGING="$INSTALL_DIR/.Today To Do List.install-$(date +%Y%m%d-%H%M%S)-$RANDOM.app"
BACKUP=""

[[ -d "$SOURCE_APP" ]] || { print -u2 "Missing built app: $SOURCE_APP"; exit 1; }
[[ -f "$SOURCE_APP/Contents/Info.plist" || -n "${TODAY_TODO_SOURCE_APP:-}" ]] || {
  print -u2 "Invalid application bundle: $SOURCE_APP"
  exit 1
}

mkdir -p "$INSTALL_DIR"

if ! ditto --rsrc --extattr "$SOURCE_APP" "$STAGING"; then
  print -u2 "Installation failed while staging; the previous app was not changed"
  exit 1
fi

[[ -d "$STAGING/Contents" ]] || {
  print -u2 "Staged application is invalid; the previous app was not changed"
  exit 1
}

if [[ -e "$DESTINATION" ]]; then
  BACKUP="$INSTALL_DIR/Today To Do List.backup-$(date +%Y%m%d-%H%M%S)-$RANDOM.app"
  mv "$DESTINATION" "$BACKUP"
fi

if ! mv "$STAGING" "$DESTINATION"; then
  if [[ -n "$BACKUP" && -e "$BACKUP" ]]; then
    mv "$BACKUP" "$DESTINATION"
  fi
  print -u2 "Installation switch failed; the previous app was restored"
  exit 1
fi

touch "$DESTINATION"
print "Installed: $DESTINATION"
[[ -z "$BACKUP" ]] || print "Previous version preserved: $BACKUP"
