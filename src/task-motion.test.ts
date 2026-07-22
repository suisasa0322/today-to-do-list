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
