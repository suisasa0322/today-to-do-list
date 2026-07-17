# Cat Icon and Local Installation Design

## Goal

Use the selected warm beige illustrated winking-cat artwork as the Today To Do List application icon, preserve a clean square PNG for the user's personal avatar, and install the rebuilt app in macOS Applications for normal Finder and Launchpad access.

## Selected Visual

- Use the approved beige illustrated version rather than the photographic crop.
- Preserve the white cat, pink nose, one open dark eye, one closed eye, subtle gray forehead marks, warm cream background, and blue-and-cream stripe along the bottom.
- Use a square, edge-to-edge master image with no text, signature, logo, comparison frame, external shadow, or watermark.
- Keep the same master artwork for both the app-icon source and the standalone avatar PNG so the two remain visually consistent.

## Project Assets and Configuration

1. Copy the approved 1:1 master PNG into the project as `src-tauri/icons/icon-master.png`.
2. Regenerate the Tauri icon set from that master, including PNG sizes and `icon.icns`.
3. Explicitly list the macOS icon in `src-tauri/tauri.conf.json` so the bundle receives an icon resource and `CFBundleIconFile` entry.
4. Keep the existing app identifier, name, task data location, and application behavior unchanged.

The standalone avatar copy will be saved outside the source tree under the workspace `publish/` directory with a descriptive filename. It remains an ordinary square PNG without a macOS mask or rounded-corner crop.

## Build and Installation Flow

1. Build a fresh macOS `.app` bundle after the icon set and configuration are updated.
2. Verify the bundle contains the `.icns` file and that `Info.plist` points to it.
3. Verify the application launches and still loads the existing local tasks.
4. Prepare a one-command local installer because the managed workspace cannot write directly to `/Applications`.
5. The installer will preserve any existing installed copy as a timestamped backup before copying the verified new bundle to `/Applications/Today To Do List.app`.

The app remains unsigned. The first launch from Finder therefore requires right-clicking the app and choosing **Open**. After macOS records that approval, normal double-click and Launchpad opening should work on this Mac.

## Validation

- Confirm the master PNG is square and at least 1024 by 1024 pixels.
- Confirm generated icon files have the expected dimensions and `icon.icns` is valid.
- Run the existing frontend and Rust test suites.
- Build the macOS app bundle successfully.
- Inspect `Info.plist` and bundle resources for the configured icon.
- Launch the rebuilt bundle for a native smoke test without deleting or replacing task data.
- After installation, confirm `/Applications/Today To Do List.app` exists and Finder exposes the new icon.

## Failure Safety

- Do not delete the existing built or installed app before the replacement passes validation.
- Do not modify the user's task JSON file.
- Stop installation if the new bundle is missing or invalid.
- Preserve an existing installed application as a timestamped backup rather than removing it.

## Out of Scope

- Apple Developer ID signing and notarization.
- Mac App Store distribution.
- Changing the application UI, task behavior, persistence format, or repository visibility.
