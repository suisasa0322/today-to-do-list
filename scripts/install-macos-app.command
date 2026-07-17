#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SOURCE_APP="${TODAY_TODO_SOURCE_APP:-$REPO_ROOT/src-tauri/target/debug/bundle/macos/Today To Do List.app}"
INSTALL_DIR="${TODAY_TODO_INSTALL_DIR:-/Applications}"
DESTINATION="$INSTALL_DIR/Today To Do List.app"
STAGING=""
BACKUP=""
BACKUP_RESERVATION=""

validate_app() {
  local app="$1"
  local description="$2"
  local plist="$app/Contents/Info.plist"
  local identifier

  [[ -d "$app/Contents" && -d "$app/Contents/MacOS" && -f "$plist" ]] || {
    print -u2 -- "$description has an invalid Contents structure: $app"
    return 1
  }

  plutil -lint "$plist" >/dev/null 2>&1 || {
    print -u2 -- "$description has an invalid Info.plist: $plist"
    return 1
  }

  identifier="$(plutil -extract CFBundleIdentifier raw -expect string -o - "$plist" 2>/dev/null)" || {
    print -u2 -- "$description is missing a string CFBundleIdentifier: $plist"
    return 1
  }

  [[ "$identifier" == com.suisasa.todaytodolist ]] || {
    print -u2 -- "$description has unexpected bundle identifier: $identifier"
    return 1
  }
}

cleanup_temporary_paths() {
  local temporary_path

  for temporary_path in "$STAGING" "$BACKUP_RESERVATION"; do
    [[ -n "$temporary_path" && ( -e "$temporary_path" || -L "$temporary_path" ) ]] || continue
    if ! rm -rf -- "$temporary_path"; then
      print -u2 -- "Failed to clean temporary installation path: $temporary_path"
    fi
  done
}

reserve_backup_path() {
  local timestamp
  local token
  local candidate
  local reservation

  timestamp="$(date +%Y%m%d-%H%M%S)"

  while true; do
    if ! reservation="$(mktemp -d "$INSTALL_DIR/.Today To Do List.backup-reservation-XXXXXXXX")"; then
      print -u2 -- "Could not reserve a backup name in: $INSTALL_DIR"
      return 1
    fi

    token="${reservation##*.backup-reservation-}"
    candidate="$INSTALL_DIR/Today To Do List.backup-$timestamp-$token.app"

    if [[ ! -e "$candidate" && ! -L "$candidate" ]]; then
      BACKUP_RESERVATION="$reservation"
      BACKUP="$candidate"
      return 0
    fi

    if ! rmdir -- "$reservation"; then
      print -u2 -- "Failed to clean backup reservation: $reservation"
      return 1
    fi
  done
}

trap cleanup_temporary_paths EXIT

[[ -d "$SOURCE_APP" ]] || {
  print -u2 -- "Missing built app: $SOURCE_APP"
  exit 1
}

validate_app "$SOURCE_APP" "Source application bundle" || exit 1

mkdir -p "$INSTALL_DIR"

if ! STAGING="$(mktemp -d "$INSTALL_DIR/.Today To Do List.install-XXXXXXXX")"; then
  print -u2 -- "Could not create staging directory in: $INSTALL_DIR"
  exit 1
fi

if ! ditto --rsrc --extattr "$SOURCE_APP" "$STAGING"; then
  print -u2 -- "Installation failed while staging; the previous app was not changed"
  exit 1
fi

validate_app "$STAGING" "Staged application bundle" || {
  print -u2 -- "The previous app was not changed"
  exit 1
}

if [[ -e "$DESTINATION" || -L "$DESTINATION" ]]; then
  reserve_backup_path || exit 1

  if ! mv "$DESTINATION" "$BACKUP"; then
    print -u2 -- "Installation failed while preserving the previous app; destination was not changed"
    exit 1
  fi

  if ! rmdir -- "$BACKUP_RESERVATION"; then
    print -u2 -- "Failed to clean backup reservation: $BACKUP_RESERVATION"
  fi
  BACKUP_RESERVATION=""
fi

if ! mv "$STAGING" "$DESTINATION"; then
  if [[ -n "$BACKUP" && ( -e "$BACKUP" || -L "$BACKUP" ) ]]; then
    if mv "$BACKUP" "$DESTINATION"; then
      print -u2 -- "Installation switch failed; the previous app was restored"
    else
      print -u2 -- "Installation switch and restore failed; the previous app remains at: $BACKUP"
    fi
  else
    print -u2 -- "Installation switch failed; no previous app needed restoration"
  fi
  exit 1
fi

STAGING=""
touch "$DESTINATION"
print -r -- "Installed: $DESTINATION"
[[ -z "$BACKUP" ]] || print -r -- "Previous version preserved: $BACKUP"
