# Final review fix report

## Scope and root causes

- A rejected startup load called the normal renderer with the default empty state, leaving mutation handlers and persistence enabled.
- The serialized renderer save queue had no close lifecycle subscriber, so the webview could close before queued snapshots settled.
- Corrupt backup selection used an `exists` check followed by macOS replacing `rename`, leaving a collision race.
- The supported Node range and exact pnpm version were neither declared nor documented.

## RED/GREEN evidence

### Rejected load locks editing

RED:

`./node_modules/.bin/vitest run src/main.test.ts -t "locks the empty interface"`

Exit 1: 1 failed. Testing Library could not find `Tasks could not be loaded. Editing is disabled.`; the rendered input was enabled.

GREEN:

`./node_modules/.bin/vitest run src/main.test.ts -t "locks the empty interface"`

Exit 0: 1 passed, 9 skipped. The error is rendered, the input is disabled, and attempted input dispatch invokes no `save_tasks` command. Mutation handlers also guard the locked state.

### Close flushes the latest serialized snapshot

RED:

`./node_modules/.bin/vitest run src/main.test.ts -t "waits for the latest queued save"`

Exit 1: 1 failed. Expected a close callback function, received `undefined`.

GREEN:

`./node_modules/.bin/vitest run src/main.test.ts -t "waits for the latest queued save"`

Exit 0: 1 passed, 9 skipped. The test proves `preventDefault` runs immediately, an earlier rejected save settles and releases the newer queued snapshot, destruction does not occur while either snapshot is pending, and force-destroy occurs after the latest snapshot resolves. Calling `destroy` avoids re-entering the close-request loop.

### Atomic corrupt-backup collision handling

RED:

`cargo test corrupt_backup_atomically_skips_existing_names_and_preserves_all_bytes`

Exit 101: unresolved import `crate::storage::backup_corrupt_file`; the atomic behavioral API did not exist.

GREEN:

`cargo test corrupt_backup_atomically_skips_existing_names_and_preserves_all_bytes`

Exit 0: 1 passed. The implementation atomically creates a same-directory hard link without replacement, retries `AlreadyExists` names, removes the original only after reservation succeeds, and preserves the bytes of the source and all existing backups.

### Toolchain metadata and documentation

RED:

`node -e "const p=require('./package.json'); if(p.engines?.node !== '^20.19.0 || >=22.13.0') throw new Error('missing exact Node engine'); if(p.packageManager !== 'pnpm@11.9.0') throw new Error('missing pnpm pin')"`

Exit 1: `missing exact Node engine`.

`rg -q "Node\\.js.*20\\.19.*22\\.13" README.md && rg -q "pnpm.*11\\.9\\.0" README.md && rg -q "Xcode Command Line Tools" README.md && rg -q "Rust.*toolchain" README.md`

Exit 1: prerequisites were missing.

GREEN:

The same package assertion exited 0 with `package metadata assertions passed`; the same README assertions exited 0 with `README prerequisite assertions passed`. Existing `pnpm install`, `pnpm tauri dev`, `pnpm vitest run`, and `pnpm playwright test` commands remain unchanged, and Google Chrome remains explicit.

## Focused verification

- `./node_modules/.bin/vitest run src/main.test.ts`: exit 0, 10/10 passed.
- `cargo test storage_tests`: exit 0, 4/4 passed.

The first attempted pnpm RED command was intercepted before Vitest by the managed dependency-policy wrapper and unavailable registry DNS. All frontend test evidence therefore uses the already-installed project-local binaries.

## Full verification

- `./node_modules/.bin/vitest run`: exit 0, 2 files and 13/13 tests passed.
- `cargo test`: exit 0, 4/4 unit tests passed; main and doc-test targets had no tests and passed.
- `./node_modules/.bin/tsc && ./node_modules/.bin/vite build`: exit 0; TypeScript passed and Vite built 13 modules.
- `git diff --check`: exit 0 with no output.
- Per instruction, Playwright browser execution was not rerun.

## Self-review

- Load rejection never enters persistence and cannot present an editable empty list; successful missing-file and corrupt-recovery loads still resolve to editable empty lists.
- Save ordering and latest-version status behavior are unchanged. Every save chain handles rejection, so close is not trapped by a rejected persistence promise.
- Close uses Tauri's injected/mocked window boundary, prevents the default close, awaits the captured serialized tail, then calls `destroy` exactly once.
- The backup link and source are in the same directory, so macOS provides atomic no-replace link creation; existing backup files are never opened for writing.
- No product behavior outside the reviewed findings changed.

## Concerns

No implementation concerns. The managed pnpm wrapper still attempts registry verification in this network-restricted environment; local installed binaries provided complete frontend test, type, and build evidence.
