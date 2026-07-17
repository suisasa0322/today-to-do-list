# Today To Do List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Tauri macOS sticky-note todo application with persistent tasks, completion toggles, and hover-only deletion.

**Architecture:** A Vite TypeScript frontend holds the task reducer and sticky-note UI. Tauri's Rust core creates a standard movable macOS window and provides read/write commands to one application-data JSON file. The frontend loads once at startup and persists the full task array after each state change.

**Tech Stack:** Tauri 2, Rust, Vite, TypeScript, vanilla CSS, Vitest, Playwright.

## Global Constraints

- Target macOS only for v1; window is movable and not always-on-top.
- Store data locally only; no account, cloud sync, reminder, launch-at-login, automatic daily rollover, category, priority, tag, or due-date feature.
- Use a pale-yellow sticky-note card with gray incomplete text, line-through completed text, and a delete control visible only on task-row hover.
- Add a task only when the trimmed input is non-empty and Enter is pressed.
- Persist after add, toggle, and delete; preserve a malformed data-file backup before beginning with an empty list.

---

## File Structure

- `package.json`: frontend scripts and JavaScript development dependencies.
- `vite.config.ts`: Vite and Vitest configuration.
- `src/types.ts`: `Task` and persistence-result types shared by UI and state code.
- `src/task-store.ts`: pure reducer functions for adding, toggling, deleting, and replacing task arrays.
- `src/persistence.ts`: typed wrapper around Tauri commands.
- `src/main.ts`: startup loading, event wiring, rendering, and save-error presentation.
- `src/render.ts`: DOM rendering for task rows and the input shell.
- `src/style.css`: sticky-note visual system and hover behavior.
- `src/task-store.test.ts`: reducer tests.
- `src/persistence.test.ts`: command-wrapper tests with a Tauri invoke mock.
- `src/main.test.ts`: DOM interaction tests.
- `src-tauri/Cargo.toml`: Rust dependencies.
- `src-tauri/tauri.conf.json`: product metadata and a standard macOS window (`alwaysOnTop: false`).
- `src-tauri/src/lib.rs`: Tauri startup and command registration.
- `src-tauri/src/models.rs`: serde task/data-file models.
- `src-tauri/src/storage.rs`: atomic save, load, and corrupt-file backup operations.
- `src-tauri/src/commands.rs`: `load_tasks` and `save_tasks` command definitions.
- `src-tauri/src/storage_tests.rs`: Rust persistence tests.
- `tests/e2e/todo.spec.ts`: Playwright UI behavior checks.
- `docs/superpowers/plans/2026-07-12-today-to-do-list.md`: this plan.

### Task 1: Prepare the Tauri workspace and development toolchain

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/style.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `pnpm dev`, `pnpm tauri dev`, `pnpm test`, and `pnpm build` scripts.

- [ ] **Step 1: Install the required local toolchain after approval**

Run:

```bash
brew install node rust
corepack enable
corepack prepare pnpm@latest --activate
```

Expected: `node --version`, `pnpm --version`, and `cargo --version` each print a version.

- [ ] **Step 2: Scaffold the application and record a failing startup check**

Run:

```bash
pnpm create tauri-app@latest . --template vanilla-ts --manager pnpm --identifier com.suisasa.todaytodolist
pnpm install
pnpm tauri dev
```

Expected before configuration: the generator-created application launches but does not display a sticky-note todo UI.

- [ ] **Step 3: Configure a minimal standard window**

Set the main window configuration to a 360 by 460 window with `resizable: true`, `alwaysOnTop: false`, and title `Today To Do List`:

```json
{
  "app": { "windows": [{ "label": "main", "title": "Today To Do List", "width": 360, "height": 460, "resizable": true, "alwaysOnTop": false }] }
}
```

- [ ] **Step 4: Verify the configured shell builds**

Run: `pnpm tauri build --debug`

Expected: PASS and a macOS app bundle is produced under `src-tauri/target/debug/bundle/macos/`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts index.html src src-tauri
git commit -m "chore: scaffold Tauri desktop app"
```

### Task 2: Define the task domain and implement pure task state changes

**Files:**
- Create: `src/types.ts`
- Create: `src/task-store.ts`
- Test: `src/task-store.test.ts`

**Interfaces:**
- Produces: `Task`, `addTask(tasks, text, now, id)`, `toggleTask(tasks, id)`, and `deleteTask(tasks, id)`.

- [ ] **Step 1: Write the failing reducer tests**

```ts
import { addTask, deleteTask, toggleTask } from './task-store';

it('adds trimmed non-empty text', () => {
  expect(addTask([], '  Buy milk  ', '2026-07-12T00:00:00.000Z', 'task-1'))
    .toEqual([{ id: 'task-1', text: 'Buy milk', completed: false, createdAt: '2026-07-12T00:00:00.000Z' }]);
});

it('does not add blank text', () => expect(addTask([], '   ', 'now', 'task-1')).toEqual([]));
it('toggles completion and removes by id', () => {
  const tasks = [{ id: 'task-1', text: 'Buy milk', completed: false, createdAt: 'now' }];
  expect(toggleTask(tasks, 'task-1')[0].completed).toBe(true);
  expect(deleteTask(tasks, 'task-1')).toEqual([]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/task-store.test.ts`

Expected: FAIL because `src/task-store.ts` does not exist.

- [ ] **Step 3: Implement the exact types and immutable reducers**

```ts
export type Task = { id: string; text: string; completed: boolean; createdAt: string };

export const addTask = (tasks: Task[], text: string, createdAt: string, id: string): Task[] => {
  const trimmed = text.trim();
  return trimmed ? [...tasks, { id, text: trimmed, completed: false, createdAt }] : tasks;
};
export const toggleTask = (tasks: Task[], id: string): Task[] => tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
export const deleteTask = (tasks: Task[], id: string): Task[] => tasks.filter(task => task.id !== id);
```

- [ ] **Step 4: Run the reducer tests**

Run: `pnpm vitest run src/task-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/task-store.ts src/task-store.test.ts
git commit -m "feat: add task state reducer"
```

### Task 3: Add resilient Rust local persistence commands

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/storage.rs`
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/storage_tests.rs`

**Interfaces:**
- Consumes: frontend JSON-shaped `Task` values.
- Produces: `load_from_path(path: &Path) -> Result<Vec<Task>, StorageError>`, `save_to_path(path: &Path, tasks: &[Task]) -> Result<(), StorageError>`, `#[tauri::command] async fn load_tasks(...) -> Result<Vec<Task>, String>`, and `#[tauri::command] async fn save_tasks(tasks: Vec<Task>, ...) -> Result<(), String>`.

- [ ] **Step 1: Write failing persistence tests**

```rust
use crate::models::Task;
use crate::storage::{load_from_path, save_to_path};
use tempfile::tempdir;

#[test]
fn load_after_save_returns_the_same_tasks() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("tasks.json");
    let tasks = vec![Task { id: "task-1".into(), text: "Buy milk".into(), completed: false, created_at: "2026-07-12T00:00:00Z".into() }];
    save_to_path(&path, &tasks).unwrap();
    assert_eq!(load_from_path(&path).unwrap(), tasks);
}

#[test]
fn corrupt_data_is_renamed_and_load_returns_empty() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("tasks.json");
    std::fs::write(&path, "not json").unwrap();
    assert_eq!(load_from_path(&path).unwrap(), Vec::<Task>::new());
    assert_eq!(std::fs::read_dir(directory.path()).unwrap().count(), 1);
}
```

- [ ] **Step 2: Run the Rust tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml storage_tests`

Expected: FAIL because the storage module does not exist.

- [ ] **Step 3: Implement atomic data-file persistence**

Use `app.path().app_data_dir()` and file name `tasks.json`. Serialize `Vec<Task>` to `tasks.json.tmp`, call `sync_all`, then rename it to `tasks.json`. On deserialize failure rename `tasks.json` to `tasks-<unix-seconds>.corrupt.json` and return `Vec::new()`.

Register the commands in `lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![commands::load_tasks, commands::save_tasks])
```

- [ ] **Step 4: Run all Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri
git commit -m "feat: persist tasks locally"
```

### Task 4: Build the sticky-note task interface and save flow

**Files:**
- Create: `src/persistence.ts`
- Create: `src/render.ts`
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Test: `src/main.test.ts`

**Interfaces:**
- Consumes: `Task`, reducer functions, and Tauri commands `load_tasks` and `save_tasks`.
- Produces: `renderApp(root, tasks, handlers)` and `persistTasks(tasks): Promise<void>`.

- [ ] **Step 1: Write the failing DOM tests**

```ts
it('adds a task when Enter is pressed', () => {
  const input = screen.getByLabelText('New task');
  fireEvent.change(input, { target: { value: 'Buy milk' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'Buy milk' })).toHaveClass('task--open');
});
it('strikes a clicked task through', () => {
  fireEvent.click(screen.getByRole('button', { name: 'Buy milk' }));
  expect(screen.getByRole('button', { name: 'Buy milk' })).toHaveClass('task--done');
});
it('shows delete only while hovering the task row', () => {
  const row = screen.getByRole('listitem', { name: 'Buy milk' });
  expect(within(row).getByRole('button', { name: 'Delete Buy milk' })).toHaveClass('task__delete');
  fireEvent.mouseEnter(row);
  expect(row).toHaveClass('task--hovered');
  fireEvent.mouseLeave(row);
  expect(row).not.toHaveClass('task--hovered');
});
```

- [ ] **Step 2: Run the UI tests to verify they fail**

Run: `pnpm vitest run src/main.test.ts`

Expected: FAIL because the rendering and persistence modules do not exist.

- [ ] **Step 3: Implement startup and persistence**

In `src/persistence.ts`, call `invoke<Task[]>('load_tasks')` and `invoke<void>('save_tasks', { tasks })`. In `main.ts`, load once on startup; after an add, toggle, or delete, render the new array and call `save_tasks`. If saving rejects, retain the rendered array and render a non-blocking status line reading `Changes are not saved yet.`

- [ ] **Step 4: Implement task-row markup and CSS behavior**

Render each row as a container with sibling task-toggle and delete buttons. Apply `.task--open { color: #777; }`, `.task--done { color: #777; text-decoration: line-through; }`, and hide `.task__delete` until `.task:hover .task__delete` or `.task:focus-within .task__delete`. Use a pale-yellow card background such as `#fff4b8`.

- [ ] **Step 5: Run the frontend test suite**

Run: `pnpm vitest run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src src/main.test.ts
git commit -m "feat: add sticky note todo interface"
```

### Task 5: Verify the complete desktop flow and document local development

**Files:**
- Create: `tests/e2e/todo.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: built Tauri application and frontend task UI.
- Produces: repeatable manual and automated verification commands.

- [ ] **Step 1: Write the failing end-to-end scenarios**

```ts
test('adds, completes, deletes, and restores a task after restart', async () => {
  await app.window.getByLabel('New task').fill('Buy milk');
  await app.window.getByLabel('New task').press('Enter');
  await expect(app.window.getByRole('button', { name: 'Buy milk' })).toHaveClass(/task--open/);
  await app.window.getByRole('button', { name: 'Buy milk' }).click();
  await app.restart();
  await expect(app.window.getByRole('button', { name: 'Buy milk' })).toHaveClass(/task--done/);
  await app.window.getByRole('listitem', { name: 'Buy milk' }).hover();
  await app.window.getByRole('button', { name: 'Delete Buy milk' }).click();
  await expect(app.window.getByRole('button', { name: 'Buy milk' })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the end-to-end test to establish the initial result**

Run: `pnpm playwright test tests/e2e/todo.spec.ts`

Expected: FAIL until the desktop launch fixture is configured.

- [ ] **Step 3: Configure the Tauri launch fixture and implement the scenario**

Launch `pnpm tauri dev`, wait for the window, add a task through the bottom input, assert gray incomplete text, click to assert line-through, restart, assert restored line-through, then hover and delete the task.

- [ ] **Step 4: Update README with exact local commands**

Add:

```markdown
## Development

pnpm install
pnpm tauri dev

## Tests

pnpm vitest run
pnpm playwright test
```

- [ ] **Step 5: Run complete verification**

Run:

```bash
pnpm vitest run
pnpm playwright test
pnpm tauri build --debug
```

Expected: all commands PASS; manual smoke test confirms a movable non-topmost window and restart persistence.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/todo.spec.ts README.md
git commit -m "test: verify desktop todo workflow"
```

## Self-review

- Spec coverage: Tasks 2 and 4 cover add, toggle, deletion, gray/strike-through styling, hover deletion, and blank-input rejection. Task 3 covers local persistence and corrupt-data recovery. Tasks 1 and 5 cover the standard non-topmost movable macOS window and end-to-end verification. Out-of-scope features are not introduced.
- Prohibited-marker scan: no deferred implementation markers are present.
- Type consistency: all frontend state uses `Task`; all persistence commands consume and return `Task[]`; reducer names are consistent across tasks.

## Execution Handoff

Plan will be committed at `docs/superpowers/plans/2026-07-12-today-to-do-list.md`.

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using executing-plans, with checkpoints.
