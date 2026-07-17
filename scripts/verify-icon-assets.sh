#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
MASTER="$REPO_ROOT/src-tauri/icons/icon-master.png"
ICNS="$REPO_ROOT/src-tauri/icons/icon.icns"

[[ -f "$MASTER" ]] || { print -u2 "Missing icon master: $MASTER"; exit 1; }

WIDTH="$(sips -g pixelWidth "$MASTER" | awk '/pixelWidth/ { print $2 }')"
HEIGHT="$(sips -g pixelHeight "$MASTER" | awk '/pixelHeight/ { print $2 }')"
[[ "$WIDTH" == "$HEIGHT" ]] || { print -u2 "Icon master must be square"; exit 1; }
(( WIDTH >= 1024 )) || { print -u2 "Icon master must be at least 1024px"; exit 1; }

[[ -f "$ICNS" ]] || { print -u2 "Missing macOS icon: $ICNS"; exit 1; }
file "$ICNS" | grep -q "Mac OS X icon" || { print -u2 "Invalid macOS ICNS"; exit 1; }

print "Icon assets verified: ${WIDTH}x${HEIGHT}"
