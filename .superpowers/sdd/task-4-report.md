# Task 4 report: sticky-note task interface and save flow

## Status

Implemented the accepted sticky-note task interface, DOM behavior, Tauri persistence adapters, and immediate-render/save flow. All frontend tests, the direct TypeScript check, and the direct Vite production build pass.

## TDD evidence

### RED

Command:

```text
./node_modules/.bin/vitest run src/main.test.ts
```

Result: exit 1. Vitest reported one failed suite and the expected cause:

```text
Error: Failed to resolve import "./render" from "src/main.test.ts". Does the file exist?
```

This confirmed that the DOM tests failed because the rendering feature did not yet exist.

### GREEN

Focused command:

```text
./node_modules/.bin/vitest run src/main.test.ts
```

Result: exit 0; 1 test file passed, 5 tests passed, with no warnings or unhandled rejections.

The tests exercise real jsdom behavior for Enter-to-add and clearing, task toggling, sibling delete actions, hover class behavior, one-time startup loading, complete-array saves for add/toggle/delete, and retained UI plus the exact non-blocking save-error message after a rejected invocation.

## Final verification

- Full frontend suite: `./node_modules/.bin/vitest run` — exit 0; 2 files passed, 8 tests passed.
- Type check: `./node_modules/.bin/tsc` — exit 0, no diagnostics.
- Production bundle: `./node_modules/.bin/vite build` — exit 0; 9 modules transformed, output generated successfully.
- Diff hygiene: `git diff --check` — exit 0.

The first `pnpm build` wrapper attempt did not reach TypeScript or Vite: the managed pnpm wrapper tried an offline registry metadata/install check and then aborted its non-TTY modules-directory purge. The script's two underlying local binaries were therefore run directly and both passed.

## Files changed

- `package.json` — adds the approved DOM test dependencies.
- `pnpm-lock.yaml` — locks jsdom and Testing Library dependencies.
- `src/main.test.ts` — DOM and persistence-flow regression tests.
- `src/persistence.ts` — focused `load_tasks` and `save_tasks` invoke adapters.
- `src/render.ts` — focused `renderApp(root, tasks, handlers)` DOM renderer.
- `src/main.ts` — load-once startup and immutable render-then-save action flow.
- `src/style.css` — fixed-window sticky-note layout and task states.
- `.superpowers/sdd/task-4-report.md` — this report.

## Accepted visual inventory compliance

- Uses one full-window `#fff4b8` sticky-note surface at the configured 360×460 primary viewport, with 22–24px outer insets and no nested card or secondary panel.
- Renders only the accepted heading, semantic scrollable list, non-blocking status line, and bottom-anchored direct input.
- Uses the macOS system sans-serif stack, near-charcoal heading, compact warm separators, restrained radii, and focused warm outlines.
- Open and completed toggles both use `#777`; only completed text is struck through.
- Each row contains sibling toggle/delete buttons and a code-native circular indicator; delete is hidden until hover/focus (plus the accepted test mirror class).
- Input has the accessible label and placeholder `New task`, adds trimmed non-empty text on Enter, and introduces no add button.
- No sample data or out-of-scope account, sync, reminder, metadata, filtering, toolbar, counter, or default-task features were added.

## Self-review

- DOM text is created with `textContent`, so persisted task text is not interpreted as markup.
- State transitions reuse the existing immutable reducers; every mutation renders before awaiting persistence.
- Save rejection is handled, does not produce an unhandled rejection, keeps the new array visible, and allows subsequent interaction.
- Startup invokes `load_tasks` exactly once and handles load rejection without an unhandled promise.
- The task-list flex sizing ensures overflow scrolls while the input remains anchored at the bottom.

## Concerns

No implementation concerns. The only environment concern is the managed `pnpm build` wrapper's offline/non-TTY dependency check; direct local TypeScript and Vite verification passed.

## Post-commit visual overflow fix

Real-app visual QA after commit `ef1ddf1` reproduced a clipped bottom input border in the native 360×460 Tauri window. Computer Use accessibility also reported a page scrollbar at `0.375`. The native title bar is included in the configured 460px window height, so the WebView content area is shorter than 460px; `.sticky-note { height: 100%; min-height: 460px; }` forced the document beyond the available content height.

### Focused RED

Command:

```text
node -e "const fs=require('fs');const css=fs.readFileSync('src/style.css','utf8');if (/\.sticky-note\s*\{[^}]*min-height:\s*460px/s.test(css)) { console.error('FAIL: .sticky-note still forces a 460px content min-height'); process.exit(1) } console.log('PASS: .sticky-note does not force a 460px content min-height')"
```

Before the fix: exit 1 with `FAIL: .sticky-note still forces a 460px content min-height`.

### Minimal fix and focused GREEN

Removed only `min-height: 460px` from `.sticky-note`, retaining `height: 100%` and every other accepted visual token and behavior. The identical focused assertion then exited 0 with `PASS: .sticky-note does not force a 460px content min-height`.

### Regression verification

- Full frontend suite: `./node_modules/.bin/vitest run` — exit 0; 2 files passed, 8 tests passed.
- Type check: `./node_modules/.bin/tsc` — exit 0, no diagnostics.
- Production bundle: `./node_modules/.bin/vite build` — exit 0; 9 modules transformed and bundle generated.
- Parent will rebuild the native Tauri application and rerun real-app visual QA against the corrected content sizing.

## Reviewer follow-up: serialized persistence and coverage

The reviewer identified that each mutation started `save_tasks` concurrently. An older full-array snapshot could therefore finish after a newer snapshot, and an older rejection could overwrite the shared save status. The follow-up serializes immutable snapshots while retaining immediate render-before-save behavior.

### Focused RED

After adding deferred-promise queue coverage and the requested input/stylesheet contracts, the first focused command was:

```text
./node_modules/.bin/vitest run src/main.test.ts
```

The initial run exited 1 with two failures: the intended queue assertion saw two active `save_tasks` calls instead of one, and the stylesheet test exposed a jsdom-only `import.meta.url` path issue. After correcting only the stylesheet test path, the identical focused command exited 1 with 7 tests passing and the single intended production failure:

```text
AssertionError: expected save_tasks calls to have a length of 1 but got 2
```

This proved that the second persistence request began before the first deferred request settled.

### Minimal implementation

- Added one promise-backed snapshot queue in `src/main.ts`.
- Each mutation still updates immutable in-memory state and renders immediately, then captures and queues the complete snapshot.
- Both success and rejection handlers resolve the queue so the following snapshot always runs.
- Each queued attempt captures a monotonically increasing version; only the current version may update `saveError`, preventing a stale completion from changing the latest status.
- No visual CSS or markup changed.

### Focused GREEN and coverage

Command:

```text
./node_modules/.bin/vitest run src/main.test.ts
```

Final result: exit 0; 1 test file passed, 8 tests passed.

Deterministic deferred promises prove that the second save does not start before the first settles, the queue continues after the first rejection, and the latest complete snapshot is saved last. They also prove that a stale rejection does not leave the status visible after a newer success, while the latest rejection shows exactly `Changes are not saved yet.` and retains the latest UI.

Additional DOM coverage proves trimmed surrounding spaces on Enter, whitespace-only Enter is ignored, and non-Enter keys do not add. The stylesheet contract proves `.task__delete` defaults to `opacity: 0` with `pointer-events: none`, while hover and focus-within selectors restore `opacity: 1` and `pointer-events: auto`; the existing real DOM test continues to exercise the hover mirror class.

### Final verification

- Full frontend suite: `./node_modules/.bin/vitest run` — exit 0; 2 files passed, 11 tests passed.
- Type check: `./node_modules/.bin/tsc` — exit 0, no diagnostics.
- Production bundle: `./node_modules/.bin/vite build` — exit 0; 9 modules transformed and bundle generated.
- Diff hygiene: `git diff --check` — exit 0.

An intermediate type-check correctly rejected a static `node:fs` test import because the browser application intentionally omits Node type declarations. The stylesheet test now uses a test-local dynamic import with a targeted `@ts-expect-error`; the final type-check and all tests pass without adding a runtime or type dependency.
