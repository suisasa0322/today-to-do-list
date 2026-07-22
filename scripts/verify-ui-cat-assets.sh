#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ASSET_DIR="$REPO_ROOT/src/assets"
TOPPERS=(
  "$ASSET_DIR/cat-topper-open.png"
  "$ASSET_DIR/cat-topper-blink.png"
  "$ASSET_DIR/cat-topper-ear-twitch.png"
)
SWIPE="$ASSET_DIR/cat-swipe-paw.png"

read_property() {
  local property="$1"
  local asset_path="$2"
  sips -g "$property" "$asset_path" | awk -v key="$property:" '$1 == key { print $2 }'
}

for asset_path in "${TOPPERS[@]}" "$SWIPE"; do
  [[ -f "$asset_path" ]] || { print -u2 "Missing UI cat asset: $asset_path"; exit 1; }
  [[ "$(read_property hasAlpha "$asset_path")" == "yes" ]] || {
    print -u2 "UI cat asset must contain alpha transparency: $asset_path"
    exit 1
  }
done

for asset_path in "${TOPPERS[@]}"; do
  [[ "$(read_property pixelWidth "$asset_path")" == "1024" ]] || {
    print -u2 "Topper width must be 1024: $asset_path"
    exit 1
  }
  [[ "$(read_property pixelHeight "$asset_path")" == "768" ]] || {
    print -u2 "Topper height must be 768: $asset_path"
    exit 1
  }
done

[[ "$(read_property pixelWidth "$SWIPE")" == "512" ]] || {
  print -u2 "Swipe paw width must be 512: $SWIPE"
  exit 1
}
[[ "$(read_property pixelHeight "$SWIPE")" == "256" ]] || {
  print -u2 "Swipe paw height must be 256: $SWIPE"
  exit 1
}

print "UI cat assets verified: 3 aligned 1024x768 toppers and 1 transparent 512x256 swipe paw"
