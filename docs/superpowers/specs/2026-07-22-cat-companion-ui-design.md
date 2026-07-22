# Cat Companion UI Design

**Date:** 2026-07-22

**Status:** Approved for implementation

**Application:** Today To Do List

**Scope:** Visual polish, a decorative cat topper, and paw-driven completion and reopening animations

## Goal

Make the existing macOS sticky-note application feel warmer and more distinctive without changing its task model or local-first behavior. The approved design keeps the yellow note, places the existing winking white cat at the upper-right of the content, and makes each task completion feel as though the cat swiped a paw across the text.

The final UI must preserve the recognizable watercolor cat rather than replace it with a simplified cartoon. The upper-right resting paws and the animated swipe paw must have convincing anatomy and visible fur detail; the circular CSS shapes used in brainstorming were layout placeholders only.

## Existing Baseline

The application is a 360 by 460 Tauri 2 window with a TypeScript and native DOM/CSS frontend. `renderApp` rebuilds the note from the current task array. `main.ts` owns task state, persistence sequencing, and shutdown safety. Completed tasks currently use a browser `line-through`, and all task data is stored locally through the existing Rust commands.

This work must not change:

- the `Task` data model;
- the JSON storage path or format;
- ordered saves and final-save shutdown protection;
- corrupt-data recovery;
- add, toggle, delete, and hover-delete behavior;
- the application name, identifier, or window behavior.

## Approved Visual Direction

### Overall layout

The yellow sticky-note identity remains. The interface receives a restrained polish rather than a redesign:

- keep the title at the upper-left;
- add a small warm-brown eyebrow line above the title;
- place the cat at the upper-right, with its two front paws resting on the header divider;
- slightly increase task-row breathing room and use softer rounded hover surfaces;
- use a muted warm-brown accent for completed checkmarks and hand-drawn strike lines;
- refine the bottom input into a soft rounded field with a small plus cue;
- preserve the current vertical task list, bottom input, and hover-only delete control.

The cat must remain inside the content area beneath the native title bar. It must never obscure the title, task controls, or scrollable list. At narrow sizes or large text scaling, the cat scales down and remains anchored to the upper-right.

### Cat topper

The topper uses the same white cat, pink nose, warm watercolor rendering, and winking expression as `src-tauri/icons/icon-master.png` and the standalone avatar. It includes the head, a small amount of chest, and two fully rendered front paws.

The final resting paws must show:

- a natural wrist-to-paw transition;
- distinct toe lobes instead of circular blobs;
- subtle joint and fur contours;
- restrained pink or warm-beige claw/pad detail;
- lighting and edge softness consistent with the existing portrait.

The topper idles continuously with noticeable but gentle motion: breathing, a small sway, intermittent ear movement, and occasional blinking. The cycles must be staggered so the cat does not feel like a short mechanical loop.

### Task rows

Open tasks remain calm gray. Completed tasks use a warm filled check indicator, slightly muted text, and a hand-drawn warm-brown strike. Hover and focus states remain obvious without becoming visually heavy. The delete button remains hidden until hover or focus, and its accessible label remains unchanged.

## Image Assets

Implementation will create aligned, transparent raster assets derived from the approved cat portrait:

- `src/assets/cat-topper-open.png`: base topper with refined resting paws and the open-eye pose;
- `src/assets/cat-topper-blink.png`: canvas-aligned blink frame for cross-fading;
- `src/assets/cat-topper-ear-twitch.png`: canvas-aligned ear-motion frame;
- `src/assets/cat-swipe-paw.png`: side-facing white foreleg and paw for the swipe.

The topper frames must have identical pixel dimensions, registration, lighting, crop, and transparent margins. They must cross-fade without the head, body, or paws jumping. The swipe asset must show a furry forearm, four believable toes, and a small pink pad where appropriate. It must read as a real paw from the same cat at the rendered size, not as a circle, emoji, icon, or generic vector shape.

Source resolution must be at least twice the maximum rendered size. The expected desktop rendering is approximately 120–140 CSS pixels wide for the topper and 50–70 CSS pixels wide for the swipe paw. Assets must remain crisp on Retina displays and must not include the avatar's blue lower band or beige square background.

These assets are application UI assets only. The existing app icon and standalone avatar remain unchanged.

## Interaction and Motion

### Completing a task

When an open task is toggled:

1. The task state changes and enters the existing save queue immediately.
2. The newly rendered row receives a one-shot `completing` effect.
3. The swipe paw moves from right to left across the text region over approximately 650 milliseconds.
4. A warm hand-drawn strike is revealed with the paw, and the check indicator fills.
5. The transient paw disappears while the completed styling remains.

The paw and strike stay within the text region. They must not cross the completion indicator or delete button. For wrapped task text, the paw makes one horizontal pass across the text block while the completed strike resolves across every visible text line. The final static state must remain legible at every supported width.

### Reopening a task

When a completed task is toggled back to open:

1. The task state changes and enters the save queue immediately.
2. The row receives a one-shot `reopening` effect.
3. The paw moves from left to right over approximately 550 milliseconds.
4. The hand-drawn strike retracts or fades with the paw.
5. The row settles into the existing open state.

### Replay and rapid input

Animations are transient UI feedback and are never persisted. Restoring tasks at launch shows their final open or completed state without replaying any paw animation.

If the same task is toggled again while an effect is running, the existing effect is canceled with the discarded DOM, and the latest direction starts from the newly rendered state. The last user action wins. Persistence must never wait for an animation, and save status renders must not initiate an effect on their own.

### Reduced motion

Under `prefers-reduced-motion: reduce`:

- disable travel, swaying, ear movement, and blink cross-fades;
- show the topper as a static image;
- replace completion and reopening travel with a short, approximately 120-millisecond state fade;
- keep all functional and visual state distinctions intact.

No sound, haptics, confetti, particles, or network-loaded effects are included.

## Frontend Architecture

### Decorative header

`renderApp` adds a decorative header container for the topper frames. The container and all cat images use `aria-hidden="true"` and cannot receive pointer or keyboard input. CSS owns the idle animation and responsive sizing.

### Task effect controller

The persisted `Task` type remains unchanged. A frontend-only motion descriptor identifies the affected task and direction:

```ts
type TaskMotion = {
  taskId: string;
  direction: 'complete' | 'reopen';
  token: number;
};
```

`main.ts` determines the direction from the task's state before toggling it. The save path renders the new task array first, then passes the descriptor to a small task-effect controller. The controller locates the new row by task ID, adds the direction class, and removes transient state after `animationend` with a timeout fallback.

Every new toggle increments the token. Completion callbacks only clear the currently active token, so stale callbacks cannot cancel a newer effect. A later render naturally discards any in-flight DOM animation; ordinary renders caused by loading or save-status changes do not contain a motion descriptor and therefore cannot replay it.

The controller uses CSS classes, custom properties, `transform`, and `opacity`. It does not use Canvas, video, a runtime animation library, or network access.

### Strike and paw containment

Each task row gains a text-effect wrapper that contains the task text, the animated strike layer, and the transient paw image. CSS sizing is relative to that wrapper, keeping the effect away from the indicator and delete button. The final completed state retains a CSS text-decoration fallback so wrapped lines and asset failures remain visibly completed.

## Failure and Degradation Behavior

- If a topper frame fails to load, the title and every task control remain correctly positioned.
- If the swipe-paw image fails to load, the strike animation and state change still run.
- If CSS animation events do not fire, a timeout removes the transient class.
- Persistence failures continue to use the existing error message and editing protections; animation success must never imply save success.
- Missing or corrupt UI assets must not modify or delete task data.

## Accessibility

- Keep the current task buttons, `aria-pressed` state, labels, focus rings, and keyboard behavior.
- Hide all decorative cat and paw images from assistive technology.
- Do not make completion depend on seeing the animation; the check, color, strike, and pressed state communicate the result.
- Maintain readable contrast for open, completed, error, hover, and focus states.
- Honor system reduced-motion preferences as defined above.

## Testing and Verification

### Automated frontend tests

Add or update focused tests to verify:

- the topper is decorative and does not alter the heading or task semantics;
- completing a task requests a right-to-left effect;
- reopening requests a left-to-right effect;
- rapid repeated toggles leave the last state and latest effect token active;
- normal renders and restored completed tasks do not request animation replay;
- animation completion and timeout cleanup cannot clear a newer effect;
- reduced motion produces the non-travel fallback;
- long and wrapped task text retains completed styling.

### End-to-end tests

Extend the existing Playwright workflow to verify add, complete, reopen, delete, reload, keyboard interaction, and persistent final state. Assert effect classes or state markers without depending on exact millisecond timing. Emulate reduced motion in a separate check.

### Asset and build checks

Verify that all transparent cat assets exist, have the expected aligned dimensions, contain alpha transparency, and are included in the Vite production bundle. Existing icon verification remains unchanged.

Run the complete TypeScript, Vitest, Playwright, Rust, and Tauri build checks required by the project. Inspect the built macOS app at 360 by 460 and resized widths with:

- no tasks, one task, and a scrollable list;
- open, completing, completed, reopening, and save-error states;
- short, long, and wrapped task text;
- default and reduced-motion settings.

The final local installation must use the existing backup-safe installer and must preserve `~/Library/Application Support/com.suisasa.todaytodolist/tasks.json`.

## Non-Goals

This feature does not add accounts, synchronization, due dates, reminders, priorities, categories, sorting, sounds, a menu-bar mode, a new data format, or a new application icon. It does not replace the existing cat with a cartoon style or change the application into a full UI rewrite.

## Acceptance Criteria

- The upper-right cat visibly matches the existing watercolor winking cat and has refined, anatomically recognizable resting paws.
- The topper fits without obstructing the title, tasks, scrolling, input, or native window controls.
- The cat has the approved noticeable idle animation and becomes static under reduced motion.
- Completing a task plays one right-to-left paw swipe and leaves a warm hand-drawn strike.
- Reopening plays one left-to-right swipe and removes the strike.
- The animated paw has a furry forearm, four recognizable toes, and subtle pad detail rather than a circular placeholder.
- Launching, rerendering, or restoring completed tasks does not replay the effect.
- Rapid toggles, long text, missing decorative assets, and persistence errors preserve correct task behavior.
- Existing task data, storage safety, accessibility, and macOS installation behavior remain intact.
