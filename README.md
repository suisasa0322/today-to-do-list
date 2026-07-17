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

pnpm vitest run
pnpm playwright test
