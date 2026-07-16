# Task 5 Report: Desktop Flow Verification and Local Development

## Status

DONE_WITH_CONCERNS

The renderer integration scenario, repeatable Playwright/Vite fixture, local-development documentation, and Vitest discovery isolation are implemented. Frontend tests and the debug Tauri bundle pass. This managed sandbox prevents both localhost binding and system Chrome execution, so the Playwright scenario could be discovered and compiled here but not executed through the browser. The controller must run the focused Playwright command outside this sandbox and separately perform the requested native smoke test.

## Implementation

- Added `tests/e2e/todo.spec.ts`, which drives the real built renderer UI through Playwright.
- Added an init-script mock for only `window.__TAURI_INTERNALS__.invoke`.
  - `load_tasks` restores the full serialized task array.
  - `save_tasks` stores the full task array in origin-local storage.
  - The stored state survives `page.reload()`, which is the renderer test's restart surrogate.
  - Unexpected native commands fail loudly.
- Covered adding `Buy milk`, the gray/open class and computed color, toggling, the done class and computed line-through, reload persistence, hover-revealed deletion, and final absence.
- Added `playwright.config.ts` using the installed system Chrome channel.
- Added `tests/e2e/global-setup.ts` to build the renderer with Vite before the scenario.
- Routed the Vite build through a synthetic HTTP origin in Playwright, avoiding a localhost server while preserving real renderer assets and reload semantics.
- Added `vitest.config.ts` so the exact frontend test command excludes Playwright specs rather than trying to execute them as Vitest suites.
- Added the exact development and test commands required by the brief to `README.md`.
- Included the parent-approved `@playwright/test` 1.61.1 dependency and lockfile changes.

## TDD Evidence

### RED

Command:

```bash
pnpm playwright test tests/e2e/todo.spec.ts
```

First result: exit 1 before test execution because the configured Vite server could not bind in the managed sandbox:

```text
Error: listen EPERM: operation not permitted 127.0.0.1:1420
Error: Process from config.webServer was not able to start. Exit code: 1
```

After replacing the blocked socket with Vite build routing, the same command built the renderer and discovered the scenario, but system Chrome was terminated before the page fixture could execute:

```text
Running 1 test using 1 worker
Error: browserType.launch: Target page, context or browser has been closed
<process did exit: exitCode=null, signal=SIGABRT>
exception while trying to kill process: Error: kill EPERM
```

These runs establish that the initial scenario was not executable without fixture/environment work, but this sandbox did not permit reaching the intended missing-Tauri-boundary assertion failure.

### GREEN implementation attempt

After adding the init-script invoke mock, the focused command again built successfully and discovered exactly one scenario. Chrome launch failed with the same sandbox-level `SIGABRT`/`kill EPERM` before any test step ran. Therefore semantic GREEN is not claimed from this environment.

Fixture compilation/discovery command:

```bash
pnpm playwright test --list
```

Result: exit 0, one test in one file:

```text
todo.spec.ts:7:1 › adds, completes, deletes, and restores a task after restart
Total: 1 test in 1 file
```

## Verification Commands and Results

### Frontend suite

```bash
pnpm vitest run
```

Result: exit 0; 2 files passed, 11 tests passed.

### Playwright scenario

```bash
pnpm playwright test
```

Result in this sandbox: blocked before test execution by system Chrome `SIGABRT` and sandbox `kill EPERM`. The Vite build completes and Playwright discovers the scenario.

### Debug desktop build

```bash
pnpm tauri build --debug
```

Result: exit 0. The frontend build completed, Rust finished the `dev` profile, and Tauri produced:

```text
src-tauri/target/debug/bundle/macos/Today To Do List.app
```

### Native smoke test

Not performed in this sandbox. Per the task handoff, the controller will run the real native app smoke test for a movable, non-topmost window and restart persistence.

## Files Changed

- `.superpowers/sdd/task-5-report.md`
- `README.md`
- `package.json`
- `playwright.config.ts`
- `pnpm-lock.yaml`
- `tests/e2e/global-setup.ts`
- `tests/e2e/todo.spec.ts`
- `vitest.config.ts`

## Self-Review

- Coverage matches the requested renderer flow: add, gray/open state, toggle, strike-through/done state, reload persistence, hover delete, and absence after delete.
- Only the native invoke boundary is mocked; application rendering, handlers, reducer operations, persistence wrapper calls, and CSS are real production code.
- Persistence uses the full task array for both save and restore and survives the reload surrogate.
- The test uses the system Chrome channel and does not add WebdriverIO or Tauri browser plugins.
- README contains the exact commands from the brief.
- No product behavior was changed.
- `git diff --check` passes.
- Prohibited-marker scan found no deferred implementation markers in Task 5 files.
- Generated `dist`, `test-results`, and Tauri target artifacts are not included.

## Concerns

- The sandbox prevented a semantic Playwright GREEN run; the controller must run `pnpm playwright test tests/e2e/todo.spec.ts` outside the managed sandbox.
- The controller must perform the native movable/non-topmost/restart smoke test as planned.
- The initial RED could not reach the missing invoke boundary because sandbox restrictions failed earlier at server bind and then Chrome launch; both failure outputs are retained above for transparency.
