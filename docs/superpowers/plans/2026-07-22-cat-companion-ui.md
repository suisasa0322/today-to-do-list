# Cat Companion UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the yellow sticky-note UI, add the approved watercolor cat topper, and play refined paw-swipe effects when tasks are completed or reopened without changing task persistence.

**Architecture:** Four transparent cat assets provide aligned topper frames and a separate swipe paw. The existing renderer adds decorative layers and task effect containers, while a focused `task-motion.ts` controller owns one-shot DOM animation classes; `main.ts` only chooses the motion direction after updating task state. CSS handles layout, idle motion, bidirectional effects, and reduced-motion fallbacks without a new runtime dependency.

**Tech Stack:** Tauri 2, TypeScript 5.9, native DOM/CSS, Vite 7, Vitest 4 with jsdom, Playwright 1.61, zsh asset verification, Rust/Cargo

## Global Constraints

- Keep the `Task` type, JSON format, storage path, ordered save queue, corrupt-data recovery, and close-before-save protections unchanged.
- Keep add, toggle, delete, hover-delete, keyboard, focus, application name, bundle identifier, and native window behavior unchanged.
- Preserve the recognizable watercolor white cat, pink nose, warm lighting, and winking expression; do not substitute a cartoon, emoji, circular paw, or generic vector icon.
- The final resting paws need a natural wrist transition, distinct toe lobes, fur contours, and subtle pad or claw detail.
- The swipe paw needs a furry forearm, four recognizable toes, and restrained pink pad detail.
- Use local transparent PNG assets only; add no network request, animation library, Canvas, video, sound, haptics, confetti, or particles.
- Complete swipes run right-to-left in approximately 650 milliseconds; reopen swipes run left-to-right in approximately 550 milliseconds.
- Under `prefers-reduced-motion: reduce`, show a static topper and an approximately 120-millisecond non-travel state fade.
- Do not delete, rewrite, or migrate `~/Library/Application Support/com.suisasa.todaytodolist/tasks.json`.
- Preserve the user's unrelated `handover.md` deletion and `todolisthandover.md` untracked file; never stage them in feature commits.

---

## File Structure

### New files

- `src/assets/cat-topper-open.png`: open-eye topper base with refined resting paws.
- `src/assets/cat-topper-blink.png`: canvas-aligned blink frame.
- `src/assets/cat-topper-ear-twitch.png`: canvas-aligned ear-motion frame.
- `src/assets/cat-swipe-paw.png`: transparent side-facing swipe foreleg and paw.
- `scripts/verify-ui-cat-assets.sh`: dimensions, alpha, alignment, and presence verification.
- `src/task-motion.ts`: one-shot task motion controller and public motion types.
- `src/task-motion.test.ts`: focused controller tests.
- `src/cat-motion.css`: topper and task motion styling, keyframes, and reduced-motion rules.
- `src/vite-env.d.ts`: Vite static-asset module declarations.

### Modified files

- `src/render.ts`: header companion markup, task IDs, strike wrapper, and paw image.
- `src/main.ts`: choose complete/reopen direction and call the controller after rendering.
- `src/main.test.ts`: decorative semantics and main/controller integration tests.
- `src/style.css`: polished note, header, task row, completion, and input styles.
- `tests/e2e/todo.spec.ts`: completion, reopening, replay, and reduced-motion checks.
- `README.md`: add the UI asset verifier to documented checks.

---

### Task 1: Produce and verify the transparent cat assets

**Files:**
- Create: `scripts/verify-ui-cat-assets.sh`
- Create: `src/assets/cat-topper-open.png`
- Create: `src/assets/cat-topper-blink.png`
- Create: `src/assets/cat-topper-ear-twitch.png`
- Create: `src/assets/cat-swipe-paw.png`

**Interfaces:**
- Consumes: `src-tauri/icons/icon-master.png` as the approved character and rendering reference.
- Produces: four transparent PNG paths imported by `src/render.ts`; topper frames are exactly `1024x768`, and the swipe paw is exactly `512x256`.

- [ ] **Step 1: Write the failing asset verifier**

Create `scripts/verify-ui-cat-assets.sh` with this complete content:

```zsh
#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ASSET_DIR="$REPO_ROOT/src/assets"
TOPPERS=(
  "$ASSET_DIR/cat-topper-open.png"
  "$ASSET_DIR/cat-topper-blink.png"
  "$ASSET_DIR/cat-topper-ear-twitch.png"
)
SWIPE="$ASSET_DIR/cat-swipe-paw.png"

read_property() {
  local property="$1"
  local path="$2"
  sips -g "$property" "$path" | awk -v key="$property:" '$1 == key { print $2 }'
}

for path in "${TOPPERS[@]}" "$SWIPE"; do
  [[ -f "$path" ]] || { print -u2 "Missing UI cat asset: $path"; exit 1; }
  [[ "$(read_property hasAlpha "$path")" == "yes" ]] || {
    print -u2 "UI cat asset must contain alpha transparency: $path"
    exit 1
  }
done

for path in "${TOPPERS[@]}"; do
  [[ "$(read_property pixelWidth "$path")" == "1024" ]] || {
    print -u2 "Topper width must be 1024: $path"
    exit 1
  }
  [[ "$(read_property pixelHeight "$path")" == "768" ]] || {
    print -u2 "Topper height must be 768: $path"
    exit 1
  }
done

[[ "$(read_property pixelWidth "$SWIPE")" == "512" ]] || {
  print -u2 "Swipe paw width must be 512: $SWIPE"
  exit 1
}
[[ "$(read_property pixelHeight "$SWIPE")" == "256" ]] || {
  print -u2 "Swipe paw height must be 256: $SWIPE"
  exit 1
}

print "UI cat assets verified: 3 aligned 1024x768 toppers and 1 transparent 512x256 swipe paw"
```

- [ ] **Step 2: Run the verifier to prove the assets are absent**

Run:

```bash
zsh scripts/verify-ui-cat-assets.sh
```

Expected: FAIL with `Missing UI cat asset` naming `src/assets/cat-topper-open.png`.

- [ ] **Step 3: Generate the open topper with the image generation skill**

Read and use the `imagegen` skill. Reference `src-tauri/icons/icon-master.png` and use this prompt verbatim, with the output saved as `src/assets/cat-topper-open.png`:

```text
Edit the referenced watercolor cat into a transparent-background UI character asset. Preserve the exact recognizable white cat, warm cream watercolor rendering, pink nose, one open brown eye and one winking eye. Show the head, a small amount of fluffy chest, and two anatomically believable front paws resting over a thin horizontal ledge. Each resting paw must have a natural wrist transition, distinct toe lobes, subtle fur and joint contours, and restrained warm-pink pad or claw detail. Remove the beige square background and the blue lower band completely. Center the cat within a 4:3 transparent canvas with generous transparent margins, no text, no border, no shadow baked into the image. The two paws must be fully visible and more refined than simple round shapes.
```

Normalize the saved asset to the exact canvas size without adding a background:

```bash
sips --resampleHeightWidth 768 1024 src/assets/cat-topper-open.png
```

Expected: `src/assets/cat-topper-open.png` reports `pixelWidth: 1024`, `pixelHeight: 768`, and `hasAlpha: yes` under `sips -g pixelWidth -g pixelHeight -g hasAlpha`.

- [ ] **Step 4: Create aligned blink and ear-twitch frames**

Use image editing with `src/assets/cat-topper-open.png` as the sole reference. Save the first edit to `src/assets/cat-topper-blink.png` with this prompt:

```text
Keep this transparent cat topper pixel-aligned: identical 4:3 canvas, crop, head, chest, resting paws, fur, colors, lighting, and transparent margins. Change only the open brown eye so both eyes are softly closed for one natural blink frame. Do not move or redraw any other feature.
```

Save the second edit to `src/assets/cat-topper-ear-twitch.png` with this prompt:

```text
Keep this transparent cat topper pixel-aligned: identical 4:3 canvas, crop, eyes, face, chest, resting paws, fur, colors, lighting, and transparent margins. Change only the outer tip of the cat's right ear by rotating it a few degrees as a subtle ear twitch. Do not move or redraw any other feature.
```

Normalize both outputs:

```bash
sips --resampleHeightWidth 768 1024 src/assets/cat-topper-blink.png
sips --resampleHeightWidth 768 1024 src/assets/cat-topper-ear-twitch.png
```

Expected: all three topper files are transparent and exactly `1024x768`.

- [ ] **Step 5: Generate the refined side-facing swipe paw**

Use `src-tauri/icons/icon-master.png` as the character reference and save the result as `src/assets/cat-swipe-paw.png` with this prompt:

```text
Create one isolated transparent-background UI animation asset matching the referenced watercolor white cat. Show a side-facing fluffy white foreleg ending in an anatomically believable paw reaching toward the left. The paw must show a natural furry wrist, four recognizable toe shapes, subtle joint definition, and a small restrained warm-pink paw pad where visible. Match the cat's warm cream watercolor lighting and soft fur edges. No head, no body, no text, no symbols, no circle, no emoji, no generic vector style, no background, and no baked shadow. Compose it horizontally on a transparent 2:1 canvas with the toes at the left and foreleg at the right.
```

Normalize it:

```bash
sips --resampleHeightWidth 256 512 src/assets/cat-swipe-paw.png
```

Expected: the asset is transparent, exactly `512x256`, and the toes remain distinct at a rendered width of 60 CSS pixels.

- [ ] **Step 6: Visually inspect and run the verifier**

Use the local image viewer to inspect all four images at original detail. Reject and regenerate any frame whose head, paws, crop, or transparency jumps relative to the open topper.

Run:

```bash
zsh scripts/verify-ui-cat-assets.sh
```

Expected: PASS with `UI cat assets verified: 3 aligned 1024x768 toppers and 1 transparent 512x256 swipe paw`.

- [ ] **Step 7: Commit the verified assets**

```bash
git add scripts/verify-ui-cat-assets.sh src/assets/cat-topper-open.png src/assets/cat-topper-blink.png src/assets/cat-topper-ear-twitch.png src/assets/cat-swipe-paw.png
git commit -m "feat: add refined cat companion assets"
```

---

### Task 2: Add a one-shot task motion controller

**Files:**
- Create: `src/task-motion.ts`
- Create: `src/task-motion.test.ts`

**Interfaces:**
- Consumes: a rendered root with task rows containing `data-task-id`.
- Produces: `TaskMotion`, `TaskMotionDirection`, and `createTaskMotionController(root, prefersReducedMotion?)` returning `{ play(motion): void; cancel(): void }`.

- [ ] **Step 1: Write the failing controller tests**

Create `src/task-motion.test.ts`:

```ts
// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from 'vitest';
import { createTaskMotionController, type TaskMotion } from './task-motion';

const makeRoot = () => {
  document.body.innerHTML = '<main id="app"><li class="task" data-task-id="task-1"></li></main>';
  return document.querySelector<HTMLElement>('#app')!;
};

beforeEach(() => vi.useFakeTimers());

it('plays and cleans up a completion motion', () => {
  const root = makeRoot();
  const controller = createTaskMotionController(root, () => false);
  const motion: TaskMotion = { taskId: 'task-1', direction: 'complete', token: 1 };
  controller.play(motion);
  const row = root.querySelector<HTMLElement>('[data-task-id="task-1"]')!;
  expect(row.classList.contains('task--motion-completing')).toBe(true);
  expect(row.dataset.motionDirection).toBe('complete');
  row.dispatchEvent(new Event('animationend'));
  expect(row.classList.contains('task--motion-completing')).toBe(false);
  expect(row.dataset.motionDirection).toBeUndefined();
});

it('cancels stale motion before playing the latest direction', () => {
  const root = makeRoot();
  const controller = createTaskMotionController(root, () => false);
  controller.play({ taskId: 'task-1', direction: 'complete', token: 1 });
  controller.play({ taskId: 'task-1', direction: 'reopen', token: 2 });
  const row = root.querySelector<HTMLElement>('[data-task-id="task-1"]')!;
  expect(row.classList.contains('task--motion-completing')).toBe(false);
  expect(row.classList.contains('task--motion-reopening')).toBe(true);
  expect(row.dataset.motionToken).toBe('2');
});

it('marks reduced motion and uses timeout cleanup when animationend is absent', () => {
  const root = makeRoot();
  const controller = createTaskMotionController(root, () => true);
  controller.play({ taskId: 'task-1', direction: 'complete', token: 3 });
  const row = root.querySelector<HTMLElement>('[data-task-id="task-1"]')!;
  expect(row.classList.contains('task--motion-reduced')).toBe(true);
  vi.advanceTimersByTime(250);
  expect(row.classList.contains('task--motion-active')).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm vitest run src/task-motion.test.ts
```

Expected: FAIL because `./task-motion` does not exist.

- [ ] **Step 3: Implement the controller**

Create `src/task-motion.ts`:

```ts
export type TaskMotionDirection = 'complete' | 'reopen';

export type TaskMotion = {
  taskId: string;
  direction: TaskMotionDirection;
  token: number;
};

export type TaskMotionController = {
  play: (motion: TaskMotion) => void;
  cancel: () => void;
};

const timeoutFor = (motion: TaskMotion, reduced: boolean) =>
  reduced ? 250 : motion.direction === 'complete' ? 900 : 800;

const findTaskRow = (root: HTMLElement, taskId: string) =>
  [...root.querySelectorAll<HTMLElement>('[data-task-id]')]
    .find(row => row.dataset.taskId === taskId);

export const createTaskMotionController = (
  root: HTMLElement,
  prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
): TaskMotionController => {
  let cancelActive: (() => void) | undefined;

  const cancel = () => {
    cancelActive?.();
    cancelActive = undefined;
  };

  const play = (motion: TaskMotion) => {
    cancel();
    const row = findTaskRow(root, motion.taskId);
    if (!row) return;

    const directionClass = motion.direction === 'complete'
      ? 'task--motion-completing'
      : 'task--motion-reopening';
    const reduced = prefersReducedMotion();
    row.classList.add('task--motion-active', directionClass);
    if (reduced) row.classList.add('task--motion-reduced');
    row.dataset.motionDirection = motion.direction;
    row.dataset.motionToken = String(motion.token);

    let settled = false;
    let timeout = 0;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      row.removeEventListener('animationend', cleanup);
      row.classList.remove(
        'task--motion-active',
        'task--motion-completing',
        'task--motion-reopening',
        'task--motion-reduced',
      );
      delete row.dataset.motionDirection;
      delete row.dataset.motionToken;
      if (cancelActive === cleanup) cancelActive = undefined;
    };

    row.addEventListener('animationend', cleanup);
    timeout = window.setTimeout(cleanup, timeoutFor(motion, reduced));
    cancelActive = cleanup;
  };

  return { cancel, play };
};
```

- [ ] **Step 4: Run the focused and complete unit suites**

Run:

```bash
pnpm vitest run src/task-motion.test.ts
pnpm test
```

Expected: both commands PASS.

- [ ] **Step 5: Commit the controller**

```bash
git add src/task-motion.ts src/task-motion.test.ts
git commit -m "feat: add task paw motion controller"
```

---

### Task 3: Render the decorative cat and task effect layers

**Files:**
- Create: `src/vite-env.d.ts`
- Modify: `src/render.ts:1-96`
- Modify: `src/main.test.ts:1-120`

**Interfaces:**
- Consumes: the four exact asset paths from Task 1.
- Produces: `.cat-companion`, `.task__text-effect`, `.task__strike`, `.task__swipe-paw`, and task rows with `data-task-id` for Task 2 and Task 4.

- [ ] **Step 1: Add failing renderer assertions**

Inside the existing `describe('sticky-note task interface', ...)` block in `src/main.test.ts`, add:

```ts
  it('renders the cat as decoration and exposes task rows to the motion controller', () => {
    renderHarness([milk]);
    const companion = document.querySelector<HTMLElement>('.cat-companion')!;
    const row = screen.getByRole('listitem', { name: 'Buy milk' });
    expect(companion.getAttribute('aria-hidden')).toBe('true');
    expect(companion.querySelectorAll('img')).toHaveLength(3);
    expect(row.getAttribute('data-task-id')).toBe('task-1');
    expect(within(row).getByRole('button', { name: 'Buy milk' })).toBeTruthy();
    expect(row.querySelector('.task__strike')?.getAttribute('aria-hidden')).toBe('true');
    expect(row.querySelector<HTMLImageElement>('.task__swipe-paw')?.alt).toBe('');
  });
```

- [ ] **Step 2: Run the renderer test and verify failure**

Run:

```bash
pnpm vitest run src/main.test.ts -t "renders the cat as decoration"
```

Expected: FAIL because `.cat-companion` and the effect elements are absent.

- [ ] **Step 3: Add Vite asset types and renderer imports**

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

Add these imports before the `Task` type import in `src/render.ts`:

```ts
import catSwipePawUrl from './assets/cat-swipe-paw.png';
import catTopperBlinkUrl from './assets/cat-topper-blink.png';
import catTopperEarTwitchUrl from './assets/cat-topper-ear-twitch.png';
import catTopperOpenUrl from './assets/cat-topper-open.png';
```

- [ ] **Step 4: Add the complete cat-companion builder**

Add above `makeTaskRow` in `src/render.ts`:

```ts
const makeCatCompanion = (): HTMLElement => {
  const companion = document.createElement('div');
  companion.className = 'cat-companion';
  companion.setAttribute('aria-hidden', 'true');

  const frames = [
    ['cat-companion__frame cat-companion__frame--open', catTopperOpenUrl],
    ['cat-companion__frame cat-companion__frame--blink', catTopperBlinkUrl],
    ['cat-companion__frame cat-companion__frame--ear', catTopperEarTwitchUrl],
  ] as const;

  frames.forEach(([className, source]) => {
    const image = document.createElement('img');
    image.className = className;
    image.src = source;
    image.alt = '';
    companion.append(image);
  });
  return companion;
};
```

- [ ] **Step 5: Replace task text creation with an effect wrapper**

In `makeTaskRow`, set the task ID immediately after assigning `row.className`:

```ts
  row.dataset.taskId = task.id;
```

Replace the current `task__text` block and `toggle.append(indicator, text)` with:

```ts
  const textEffect = document.createElement('span');
  textEffect.className = 'task__text-effect';

  const text = document.createElement('span');
  text.className = 'task__text';
  text.textContent = task.text;

  const strike = document.createElement('span');
  strike.className = 'task__strike';
  strike.setAttribute('aria-hidden', 'true');

  const paw = document.createElement('img');
  paw.className = 'task__swipe-paw';
  paw.src = catSwipePawUrl;
  paw.alt = '';
  paw.setAttribute('aria-hidden', 'true');

  textEffect.append(text, strike, paw);
  toggle.append(indicator, textEffect);
```

- [ ] **Step 6: Replace the plain heading with the complete header structure**

Replace the existing heading creation and `shell.append(heading, list, footer)` with:

```ts
  const header = document.createElement('header');
  header.className = 'sticky-note__header';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'sticky-note__eyebrow';
  eyebrow.textContent = 'A little plan for today';
  const heading = document.createElement('h1');
  heading.textContent = 'Today To Do List';
  header.append(eyebrow, heading, makeCatCompanion());

  // Keep the existing list, footer, status, label, and input construction.
  shell.append(header, list, footer);
```

- [ ] **Step 7: Run renderer and build checks**

Run:

```bash
pnpm vitest run src/main.test.ts -t "renders the cat as decoration"
pnpm build
```

Expected: PASS, and Vite emits hashed files for all four cat PNGs under `dist/assets`.

- [ ] **Step 8: Commit the renderer structure**

```bash
git add src/vite-env.d.ts src/render.ts src/main.test.ts
git commit -m "feat: render cat companion task layers"
```

---

### Task 4: Wire toggle direction into the save-and-render flow

**Files:**
- Modify: `src/main.ts:1-70`
- Modify: `src/main.test.ts:1-220`

**Interfaces:**
- Consumes: `createTaskMotionController` and `TaskMotion` from Task 2, plus task rows from Task 3.
- Produces: one controller call per user toggle with monotonically increasing tokens; loading and save-status renders never call `play`.

- [ ] **Step 1: Mock and test direction selection in `src/main.test.ts`**

Add these hoisted mocks beside the existing Tauri mocks:

```ts
const playMotion = vi.hoisted(() => vi.fn());
const cancelMotion = vi.hoisted(() => vi.fn());

vi.mock('./task-motion', () => ({
  createTaskMotionController: () => ({ cancel: cancelMotion, play: playMotion }),
}));
```

Reset both mocks in `beforeEach`, then add this top-level test:

```ts
it('plays the latest completion direction without replaying on load', async () => {
  invoke.mockImplementation((command: string) =>
    command === 'load_tasks' ? Promise.resolve([milk]) : Promise.resolve(null),
  );

  await import('./main');
  await screen.findByRole('button', { name: 'Buy milk' });
  expect(playMotion).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Buy milk' }));
  expect(playMotion).toHaveBeenLastCalledWith({
    taskId: 'task-1',
    direction: 'complete',
    token: 1,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Buy milk' }));
  expect(playMotion).toHaveBeenLastCalledWith({
    taskId: 'task-1',
    direction: 'reopen',
    token: 2,
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm vitest run src/main.test.ts -t "plays the latest completion direction"
```

Expected: FAIL because `main.ts` never creates or calls the controller.

- [ ] **Step 3: Create the controller and allow `save` to play optional motion**

Add the imports in `src/main.ts`:

```ts
import { createTaskMotionController, type TaskMotion } from './task-motion';
```

After `root`, add:

```ts
const motionController = createTaskMotionController(root);
let motionToken = 0;
```

Replace `render` and the beginning of `save` with:

```ts
const render = () => {
  motionController.cancel();
  renderApp(root, tasks, handlers);
};

const save = (nextTasks: Task[], motion?: TaskMotion) => {
  tasks = nextTasks;
  saveError = false;
  render();
  if (motion) motionController.play(motion);
```

Keep the existing snapshot, version, and save queue body immediately after this block unchanged.

- [ ] **Step 4: Replace the toggle handler with direction-aware logic**

Replace `onToggle` in `src/main.ts`:

```ts
  onToggle(id) {
    if (editingLocked()) return;
    const current = tasks.find(task => task.id === id);
    if (!current) return;
    save(toggleTask(tasks, id), {
      taskId: id,
      direction: current.completed ? 'reopen' : 'complete',
      token: ++motionToken,
    });
  },
```

- [ ] **Step 5: Run focused, full unit, and build checks**

Run:

```bash
pnpm vitest run src/main.test.ts -t "plays the latest completion direction"
pnpm test
pnpm build
```

Expected: all commands PASS; existing ordered-save and safe-close tests remain green.

- [ ] **Step 6: Commit the integration**

```bash
git add src/main.ts src/main.test.ts
git commit -m "feat: play paw motion on task toggles"
```

---

### Task 5: Apply the polished note layout and cat animations

**Files:**
- Create: `src/cat-motion.css`
- Modify: `src/main.ts:1-3`
- Modify: `src/style.css:1-168`
- Modify: `src/main.test.ts:60-130`

**Interfaces:**
- Consumes: class names and assets from Tasks 1–4.
- Produces: the approved idle, complete, reopen, fallback, and reduced-motion presentation.

- [ ] **Step 1: Add failing CSS contract assertions**

Add this test to the existing sticky-note `describe` block in `src/main.test.ts`:

```ts
  it('defines bidirectional paw motion and a reduced-motion fallback', async () => {
    // @ts-expect-error Node types are intentionally absent from this browser application.
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/cat-motion.css', 'utf8');
    expect(css).toContain('@keyframes paw-swipe-complete');
    expect(css).toContain('@keyframes paw-swipe-reopen');
    expect(css).toContain('.task--motion-completing');
    expect(css).toContain('.task--motion-reopening');
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toContain('.cat-companion__frame--blink');
    expect(css).toContain('.cat-companion__frame--ear');
  });
```

- [ ] **Step 2: Run the CSS contract test and verify failure**

Run:

```bash
pnpm vitest run src/main.test.ts -t "defines bidirectional paw motion"
```

Expected: FAIL because `src/cat-motion.css` does not exist.

- [ ] **Step 3: Create the focused motion stylesheet**

Create `src/cat-motion.css` with this complete content:

```css
.cat-companion {
  position: absolute;
  z-index: 2;
  top: -22px;
  right: -16px;
  width: clamp(118px, 38vw, 142px);
  aspect-ratio: 4 / 3;
  pointer-events: none;
  transform-origin: 65% 80%;
  animation: cat-breathe 3.8s ease-in-out infinite;
}

.cat-companion__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cat-companion__frame--blink,
.cat-companion__frame--ear {
  opacity: 0;
}

.cat-companion__frame--blink {
  animation: cat-blink 7.4s linear infinite;
}

.cat-companion__frame--ear {
  animation: cat-ear-twitch 9.1s linear infinite;
}

.task__text-effect {
  position: relative;
  display: inline-block;
  min-width: 0;
  max-width: 100%;
}

.task__strike {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 0;
  width: 100%;
  height: 2px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, #bd745d 5%, #bd745d 95%, transparent);
  border-radius: 999px;
  opacity: 0;
  transform: scaleX(0) rotate(-0.6deg);
  transform-origin: left;
}

.task__swipe-paw {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 100%;
  width: clamp(50px, 18vw, 66px);
  height: auto;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-50%);
}

.task--motion-completing .task--done .task__text,
.task--motion-reopening .task__text {
  text-decoration-color: transparent;
}

.task--motion-completing .task__strike {
  animation: strike-complete 650ms ease-out both;
}

.task--motion-completing .task__swipe-paw {
  animation: paw-swipe-complete 650ms cubic-bezier(.25, .05, .2, 1) both;
}

.task--motion-reopening .task__strike {
  animation: strike-reopen 550ms ease-in both;
}

.task--motion-reopening .task__swipe-paw {
  animation: paw-swipe-reopen 550ms cubic-bezier(.3, .05, .3, 1) both;
}

@keyframes cat-breathe {
  0%, 100% { transform: translateY(0) rotate(0); }
  34% { transform: translateY(3px) rotate(.7deg); }
  68% { transform: translateY(-1px) rotate(-.4deg); }
}

@keyframes cat-blink {
  0%, 42%, 46%, 100% { opacity: 0; }
  43%, 45% { opacity: 1; }
}

@keyframes cat-ear-twitch {
  0%, 66%, 72%, 100% { opacity: 0; }
  67%, 69%, 71% { opacity: 1; }
}

@keyframes strike-complete {
  0% { opacity: 0; transform: scaleX(0) rotate(-.6deg); }
  12% { opacity: 1; }
  100% { opacity: 1; transform: scaleX(1) rotate(-.6deg); }
}

@keyframes strike-reopen {
  0% { opacity: 1; transform: scaleX(1) rotate(-.6deg); transform-origin: right; }
  100% { opacity: 0; transform: scaleX(0) rotate(-.6deg); transform-origin: right; }
}

@keyframes paw-swipe-complete {
  0% { left: 100%; opacity: 0; transform: translateY(-50%) rotate(-8deg); }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { left: -66px; opacity: 0; transform: translateY(-50%) rotate(5deg); }
}

@keyframes paw-swipe-reopen {
  0% { left: -66px; opacity: 0; transform: translateY(-50%) scaleX(-1) rotate(-5deg); }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { left: 100%; opacity: 0; transform: translateY(-50%) scaleX(-1) rotate(8deg); }
}

@media (max-width: 300px) {
  .cat-companion { width: 108px; right: -22px; }
}

@media (prefers-reduced-motion: reduce) {
  .cat-companion,
  .cat-companion__frame--blink,
  .cat-companion__frame--ear {
    animation: none;
  }

  .cat-companion__frame--blink,
  .cat-companion__frame--ear,
  .task__swipe-paw {
    display: none;
  }

  .task--motion-completing .task__strike {
    animation: reduced-strike-in 120ms linear both;
  }

  .task--motion-reopening .task__strike {
    animation: reduced-strike-out 120ms linear both;
  }
}

@keyframes reduced-strike-in {
  from { opacity: 0; transform: scaleX(1); }
  to { opacity: 1; transform: scaleX(1); }
}

@keyframes reduced-strike-out {
  from { opacity: 1; transform: scaleX(1); }
  to { opacity: 0; transform: scaleX(1); }
}
```

- [ ] **Step 4: Import the motion stylesheet**

Add immediately after the current style import in `src/main.ts`:

```ts
import './cat-motion.css';
```

- [ ] **Step 5: Replace the base visual tokens and affected layout selectors**

Update `src/style.css` so the affected selectors have these exact declarations; preserve `.visually-hidden` and the existing error/status behavior:

```css
:root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #57493c;
  background: #fff2b6;
  font-synthesis: none;
}

#app { width: 100%; height: 100%; background: #fff2b6; }

.sticky-note {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 23px 20px 17px;
  background: radial-gradient(circle at 18% 10%, rgb(255 255 255 / 34%), transparent 27%), #fff2b6;
}

.sticky-note__header {
  position: relative;
  flex: 0 0 88px;
  border-bottom: 1px solid #dec978;
}

.sticky-note__eyebrow {
  width: calc(100% - 120px);
  margin: 0 0 4px;
  color: #a97357;
  font-size: .62rem;
  font-weight: 750;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.sticky-note h1 {
  width: calc(100% - 118px);
  margin: 0;
  color: #4d4137;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.4rem, 7vw, 1.7rem);
  line-height: 1.05;
  letter-spacing: -.03em;
}

.task-list { flex: 1; min-height: 0; margin: 12px 0 0; padding: 0; overflow-y: auto; list-style: none; }
.task { display: flex; align-items: stretch; min-height: 48px; border-bottom: 1px solid rgb(210 188 101 / 42%); border-radius: 10px; }
.task:hover, .task--hovered, .task:focus-within { background: rgb(255 225 119 / 30%); }
.task button { border: 0; color: #71685d; background: transparent; font: inherit; }
.task__toggle { display: flex; flex: 1; gap: 10px; align-items: center; min-width: 0; padding: 8px 5px; text-align: left; cursor: pointer; }
.task--open { color: #71685d; }
.task--done { color: #9a8e7d; }
.task--done .task__text { text-decoration: line-through; text-decoration-color: #bd745d; text-decoration-thickness: 2px; }
.task__indicator { display: grid; flex: 0 0 21px; place-items: center; width: 21px; height: 21px; box-sizing: border-box; border: 1.5px solid #9c907b; border-radius: 50%; font-size: .78rem; line-height: 1; text-decoration: none; }
.task--done .task__indicator { color: #fff9e8; background: #c98768; border-color: #c98768; }
.task__text { overflow-wrap: anywhere; }
.task__delete { width: 36px; padding: 0 8px; color: #b48269 !important; opacity: 0; pointer-events: none; font-size: 1.25rem !important; cursor: pointer; }
.task:hover .task__delete, .task--hovered .task__delete, .task:focus-within .task__delete { opacity: 1; pointer-events: auto; }
.task button:focus-visible, .new-task input:focus-visible { outline: 2px solid #946e3c; outline-offset: -2px; }
.sticky-note__footer { margin-top: auto; padding-top: 12px; }
.save-status { min-height: 16px; margin: 0 0 5px; color: #805e1c; font-size: .75rem; }
.new-task { position: relative; display: block; }
.new-task::before { position: absolute; z-index: 1; top: 11px; left: 12px; display: grid; place-items: center; width: 22px; height: 22px; content: "+"; color: #95684f; background: #ffe39a; border-radius: 50%; pointer-events: none; }
.new-task input { box-sizing: border-box; width: 100%; height: 45px; padding: 0 13px 0 43px; border: 1px solid #bdab69; border-radius: 12px; color: #574f45; background: rgb(255 255 255 / 23%); box-shadow: inset 0 1px rgb(255 255 255 / 38%); font: inherit; }
.new-task input::placeholder { color: #938776; }
```

- [ ] **Step 6: Run unit, build, and asset checks**

Run:

```bash
pnpm vitest run src/main.test.ts -t "defines bidirectional paw motion"
pnpm test
pnpm build
zsh scripts/verify-ui-cat-assets.sh
```

Expected: all commands PASS.

- [ ] **Step 7: Inspect the UI at required sizes**

Run:

```bash
pnpm tauri dev
```

Expected: at `360x460`, the refined paws rest on the header divider without covering the title; completing swipes right-to-left; reopening swipes left-to-right; resizing down to 300 CSS pixels keeps the cat clear of the task list and controls.

- [ ] **Step 8: Commit the visual layer**

```bash
git add src/cat-motion.css src/style.css src/main.ts src/main.test.ts
git commit -m "feat: polish todo ui with cat paw motion"
```

---

### Task 6: Extend the end-to-end workflow and verify the macOS build

**Files:**
- Modify: `tests/e2e/todo.spec.ts:88-122`
- Modify: `README.md:17-25`

**Interfaces:**
- Consumes: complete implementation from Tasks 1–5.
- Produces: repeatable behavioral, asset, build, bundle, and installation verification.

- [ ] **Step 1: Add failing E2E assertions for both directions and no replay**

Replace the completion/reload portion of `tests/e2e/todo.spec.ts` beginning at the first `restoredOpenTask.click()` with:

```ts
  const taskRow = page.getByRole('listitem', { name: 'Buy milk' });

  await restoredOpenTask.click();
  await expect(taskRow).toHaveAttribute('data-motion-direction', 'complete');
  await expect(page.getByRole('button', { name: 'Buy milk' })).toHaveClass(/task--done/);

  await expect(taskRow).not.toHaveAttribute('data-motion-direction', 'complete');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Buy milk' }).click();
  await expect(taskRow).toHaveAttribute('data-motion-direction', 'reopen');
  await expect(taskRow).toHaveClass(/task--motion-reduced/);
  await expect(page.getByRole('button', { name: 'Buy milk' })).toHaveClass(/task--open/);

  await expect(taskRow).not.toHaveAttribute('data-motion-direction', 'reopen');
  await page.getByRole('button', { name: 'Buy milk' }).click();
  await expect(page.getByRole('button', { name: 'Buy milk' })).toHaveClass(/task--done/);

  await page.reload();

  const restoredDoneTask = page.getByRole('button', { name: 'Buy milk' });
  await expect(restoredDoneTask).toHaveClass(/task--done/);
  await expect(page.getByRole('listitem', { name: 'Buy milk' })).not.toHaveAttribute('data-motion-direction');
```

Keep the existing hover-delete, delete, final reload, and absence assertions after this block. Remove the now-duplicate earlier declarations of `restoredDoneTask` and `taskRow`.

- [ ] **Step 2: Run E2E and verify the new checks fail before the complete implementation**

Run:

```bash
pnpm playwright test tests/e2e/todo.spec.ts
```

Expected before Tasks 1–5 are complete: FAIL on the first missing `data-motion-direction` assertion. Expected now: PASS.

- [ ] **Step 3: Document the complete local test entry points**

Replace the README `## Tests` block with:

```markdown
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
```

- [ ] **Step 4: Run the complete automated verification**

Run each command separately:

```bash
pnpm test
pnpm build
pnpm playwright test
cargo test --manifest-path src-tauri/Cargo.toml
zsh scripts/verify-icon-assets.sh
zsh scripts/verify-ui-cat-assets.sh
zsh scripts/install-macos-app.test.sh
```

Expected: every command exits `0`; Vitest and Playwright report no failures; Rust reports all tests passed; both asset scripts print their verified messages; installer regression cases pass.

- [ ] **Step 5: Build and inspect the macOS application bundle**

Run:

```bash
pnpm tauri build --debug
```

Expected: PASS and create `src-tauri/target/debug/bundle/macos/Today To Do List.app`.

Verify the bundle without touching task data:

```bash
APP="src-tauri/target/debug/bundle/macos/Today To Do List.app"
test -d "$APP"
test "$(plutil -extract CFBundleIdentifier raw "$APP/Contents/Info.plist")" = "com.suisasa.todaytodolist"
test -f "$APP/Contents/Resources/icon.icns"
find "$APP/Contents/Resources" -type f | grep -E 'cat-(topper|swipe)' >/dev/null
```

Expected: all checks exit `0`. Do not delete or edit `~/Library/Application Support/com.suisasa.todaytodolist/tasks.json`.

- [ ] **Step 6: Install with the existing backup-safe installer and perform the manual acceptance pass**

Run:

```bash
zsh scripts/install-macos-app.command
```

Expected: print `Installed: /Applications/Today To Do List.app`; if an older app exists, also print its timestamped backup path.

Open `/Applications/Today To Do List.app` and verify:

- the same existing tasks load;
- the cat and its refined resting paws remain clear of the title and divider;
- breathing, sway, intermittent ear movement, and blinking are visible but not mechanical;
- complete and reopen swipes use the refined four-toe paw and correct directions;
- rapid repeated toggles end in the last selected state;
- long wrapped text remains readable and struck when complete;
- scrolling, hover-delete, keyboard focus, saving, close, reopen, and save-error behavior remain functional;
- reduced motion removes travel and idle movement.

- [ ] **Step 7: Commit E2E coverage and documentation**

```bash
git add tests/e2e/todo.spec.ts README.md
git commit -m "test: verify cat companion todo workflow"
```

- [ ] **Step 8: Record final evidence**

Run:

```bash
git status --short
git log -7 --oneline
```

Expected: only the user's pre-existing `handover.md` deletion and `todolisthandover.md` untracked file remain; the six feature commits appear in order, and no task data or temporary brainstorming files are staged.

---

## Plan Self-Review Checklist

- Task 1 covers transparent, aligned, high-resolution, anatomically refined assets and explicitly rejects circular placeholder paws.
- Tasks 2 and 4 cover direction selection, one-shot playback, rapid toggles, timeout cleanup, no launch replay, and persistence independence.
- Tasks 3 and 5 cover layout polish, decorative accessibility, containment, static completion fallback, idle movement, blink, ear twitch, and reduced motion.
- Task 6 covers unit, E2E, asset, Rust, build, bundle, installation, resizing, long text, and data-preservation verification.
- Every public type and selector used by a later task is introduced by an earlier task with the same spelling.
- No dependency, task schema, storage format, bundle identity, sound, network effect, or unrelated feature is added.
