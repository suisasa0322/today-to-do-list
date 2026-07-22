# Today To Do List

A local Mac widget for managing daily tasks.

## Prerequisites

- macOS with the Xcode Command Line Tools
- The stable Rust toolchain, including Cargo
- Node.js 20.19+ or 22.13+
- pnpm 11.9.0
- Google Chrome for the Playwright browser tests

## Development

pnpm install
pnpm tauri dev

## Tests

Playwright uses the system Google Chrome installation (`channel: chrome`).

```bash
pnpm test
pnpm build
pnpm playwright test
cargo test --manifest-path src-tauri/Cargo.toml
zsh scripts/verify-icon-assets.sh
zsh scripts/verify-ui-cat-assets.sh
zsh scripts/install-macos-app.test.sh
```
