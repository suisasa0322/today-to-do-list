# Task 3 report

## Status

The initial run was blocked during dependency resolution. After the parent supplied a confirmed local dependency cache and updated lockfile, work resumed offline and the implementation was completed and verified.

## Test-first changes made

- Added the two persistence tests specified by the brief in `src-tauri/src/storage_tests.rs`.
- Registered the test module from `src-tauri/src/lib.rs` under `#[cfg(test)]`.
- Added `tempfile = "3"` under `[dev-dependencies]` in `src-tauri/Cargo.toml`.

## RED command and output

Command:

```text
cargo test --manifest-path src-tauri/Cargo.toml storage_tests
```

Result: exit code 101. Cargo did not reach the expected missing-module compiler failure because it attempted registry access first.

Relevant output:

```text
Updating crates.io index
warning: spurious network error (3 tries remaining): [6] Couldn't resolve host name (Could not resolve host: index.crates.io)
...
error: failed to get `serde` as a dependency of package `today-to-do-list v0.1.0 (.../src-tauri)`

Caused by:
  failed to load source for dependency `serde`

Caused by:
  unable to update registry `crates-io`

Caused by:
  download of config.json failed

Caused by:
  [6] Couldn't resolve host name (Could not resolve host: index.crates.io)
```

## Initial GREEN and full-suite verification

Not run. The brief requires stopping when Cargo needs uncached network access, so implementation, focused GREEN, and the one full Rust suite run were not attempted.

## Files changed before the initial blocker

- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage_tests.rs`
- `.superpowers/sdd/task-3-report.md`

## Commit at the initial blocker

No commit was created at this point because the task was incomplete and unverified.

## Initial self-review and concerns

- At this point, the working tree contained only the test-first setup and this report; production modules remained absent.
- The blocker was registry resolution for `serde`, although the newly added `tempfile` dependency also makes registry availability relevant.
- Resumption required a usable cached/locked dependency set or registry/network access, followed by the same focused RED command before any production implementation.

## Resumed TDD evidence

### Focused RED

Command:

```text
cargo test --manifest-path src-tauri/Cargo.toml --offline storage_tests
```

Result: exit code 101, for the expected missing production modules:

```text
error[E0432]: unresolved import `crate::models`
 --> src/storage_tests.rs:1:12
  |
1 | use crate::models::Task;
  |            ^^^^^^ could not find `models` in the crate root

error[E0432]: unresolved import `crate::storage`
 --> src/storage_tests.rs:2:12
  |
2 | use crate::storage::{load_from_path, save_to_path};
  |            ^^^^^^^ could not find `storage` in the crate root

error: could not compile `today-to-do-list` (lib test) due to 2 previous errors
```

### Implementation

- Added the serializable/deserializable `Task` model with camelCase JSON field names.
- Added path-based load/save functions that persist the complete task array.
- Saves serialize to `tasks.json.tmp`, write all bytes, call `sync_all`, then rename to `tasks.json`.
- Missing storage loads as an empty task list.
- Malformed JSON is renamed to `tasks-<unix-seconds>.corrupt.json` before returning an empty list.
- Added async Tauri load/save commands backed by `app.path().app_data_dir().join("tasks.json")`.
- Registered both commands with `tauri::generate_handler!`.

### Focused GREEN

Command:

```text
cargo test --manifest-path src-tauri/Cargo.toml --offline storage_tests
```

Result: exit code 0.

```text
running 2 tests
test storage_tests::corrupt_data_is_renamed_and_load_returns_empty ... ok
test storage_tests::load_after_save_returns_the_same_tasks ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### Full Rust suite

Command (run once after focused GREEN, as required):

```text
cargo test --manifest-path src-tauri/Cargo.toml --offline
```

Result: exit code 0.

```text
running 2 tests
test storage_tests::corrupt_data_is_renamed_and_load_returns_empty ... ok
test storage_tests::load_after_save_returns_the_same_tasks ... ok
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out

running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out

running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

## Final files changed

- `src-tauri/Cargo.lock`
- `src-tauri/Cargo.toml`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/models.rs`
- `src-tauri/src/storage.rs`
- `src-tauri/src/storage_tests.rs`
- `.superpowers/sdd/task-3-report.md`

## Final self-review and concerns

- All data remains local and commands resolve only the Tauri application data directory.
- The save path writes the full slice and performs temp-file write, `sync_all`, and rename in the required order.
- Corrupt JSON is quarantined before the empty list is returned.
- `git diff --check` passed.
- `cargo fmt` could not run because the installed stable toolchain lacks the `rustfmt` component. The small Rust files were manually reviewed for standard formatting; no network/component installation was attempted.

## Final commit

Committed with subject `feat: persist tasks locally` after the focused and full offline suites passed.
