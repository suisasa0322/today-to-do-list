#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
INSTALLER="$SCRIPT_DIR/install-macos-app.command"
TEMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEMP_ROOT"' EXIT

SOURCE_APP="$TEMP_ROOT/source/Today To Do List.app"
INSTALL_DIR="$TEMP_ROOT/Applications"
DESTINATION="$INSTALL_DIR/Today To Do List.app"

mkdir -p "$SOURCE_APP/Contents" "$DESTINATION/Contents"
print -r -- "new" > "$SOURCE_APP/Contents/version.txt"
print -r -- "old" > "$DESTINATION/Contents/version.txt"

TODAY_TODO_SOURCE_APP="$SOURCE_APP" \
TODAY_TODO_INSTALL_DIR="$INSTALL_DIR" \
  zsh "$INSTALLER"

[[ "$(<"$DESTINATION/Contents/version.txt")" == "new" ]]
BACKUPS=("$INSTALL_DIR"/Today\ To\ Do\ List.backup-*.app(N))
(( ${#BACKUPS[@]} == 1 ))
[[ "$(<"$BACKUPS[1]/Contents/version.txt")" == "old" ]]

print "Installer test passed"
