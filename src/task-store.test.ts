import { addTask, deleteTask, toggleTask } from './task-store';
import { expect, it } from 'vitest';

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
