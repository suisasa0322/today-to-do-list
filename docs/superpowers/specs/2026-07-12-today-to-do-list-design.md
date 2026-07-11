# Today To Do List Design

## Goal

Build a local macOS desktop todo application named Today To Do List. It is a simple sticky-note-style task list for everyday use. The first release has no accounts, cloud sync, reminders, or launch-at-login.

## Chosen approach

Use Tauri. The frontend is a small web interface styled as a sticky note; the Rust side owns macOS window configuration and local persistence.

Alternatives considered:

- SwiftUI would provide the most native UI, but Tauri makes the chosen note-like interface easier to iterate on with web styling.
- Electron would also support the UI, but is heavier than needed for a small local app.

## User experience

- Open a normal, movable desktop window. It can be covered by other windows; it is not always on top.
- Show a small pale-yellow sticky-note card headed Today To Do List.
- Show persisted tasks in a compact vertical list.
- Add a task by typing in the input at the bottom and pressing Enter. Empty or whitespace-only input does nothing.
- Click a task to toggle its completion state. Incomplete tasks are gray and not struck through. Completed tasks are struck through.
- Show a small delete control only while the pointer is hovering over a task row.
- Toggling completion again restores the incomplete style.

## Data and persistence

Each task has a stable local id, text, completion flag, and creation timestamp. The application stores all data locally and restores it whenever it opens. Tasks are never automatically cleared at day boundaries.

The persistence layer writes updates atomically. If saved data cannot be decoded, it preserves a backup and starts with an empty list instead of preventing the app from opening.

## Architecture

- Tauri shell: creates the standard macOS window and exposes minimal commands for loading and saving task data.
- Frontend task store: owns in-memory tasks and UI events.
- Persistence adapter: loads initial data, saves after add/toggle/delete, and reports recoverable load errors.
- Sticky note UI: renders the heading, task rows, hover-only deletion affordance, and Enter-to-add input.

## Error handling

- Trim submitted task text and reject empty input.
- Keep prior in-memory tasks visible if a save fails and surface a small non-blocking error.
- Treat corrupted local data as recoverable: back it up, then use an empty task list.

## Verification

- Unit tests cover add, toggle, and delete state changes, including blank input rejection.
- Persistence tests cover round-trip restoration and corrupted-data recovery.
- UI checks verify Enter adds a task, clicking toggles the strike-through state, and the delete control appears only on hover.
- A macOS smoke test verifies the window is movable, not always on top, and data survives a restart.

## Out of scope for v1

- Accounts or authentication
- Cloud sync
- Notifications or reminders
- Launch at login
- Automatic daily clearing or rollover
- Categories, tags, priorities, or due dates
