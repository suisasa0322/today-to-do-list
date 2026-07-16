// @vitest-environment jsdom

import { fireEvent, screen, waitFor, within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp, type AppHandlers } from './render';
import { addTask, deleteTask, toggleTask } from './task-store';
import type { Task } from './types';

const invoke = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const milk: Task = {
  id: 'task-1',
  text: 'Buy milk',
  completed: false,
  createdAt: '2026-07-12T00:00:00.000Z',
};

const renderHarness = (initialTasks: Task[] = []) => {
  const root = document.querySelector<HTMLElement>('#app')!;
  let tasks = initialTasks;
  const handlers: AppHandlers = {
    onAdd(text) {
      tasks = addTask(tasks, text, '2026-07-12T00:00:00.000Z', 'task-added');
      renderApp(root, tasks, handlers);
    },
    onToggle(id) {
      tasks = toggleTask(tasks, id);
      renderApp(root, tasks, handlers);
    },
    onDelete(id) {
      tasks = deleteTask(tasks, id);
      renderApp(root, tasks, handlers);
    },
  };
  renderApp(root, tasks, handlers);
};

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  invoke.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe('sticky-note task interface', () => {
  it('adds a task when Enter is pressed', () => {
    renderHarness();
    const input = screen.getByLabelText('New task');
    fireEvent.change(input, { target: { value: 'Buy milk' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Buy milk' }).classList.contains('task--open')).toBe(true);
    expect(input).toHaveProperty('value', '');
  });

  it('strikes a clicked task through', () => {
    renderHarness([milk]);
    fireEvent.click(screen.getByRole('button', { name: 'Buy milk' }));
    expect(screen.getByRole('button', { name: 'Buy milk' }).classList.contains('task--done')).toBe(true);
  });

  it('shows delete only while hovering the task row', () => {
    renderHarness([milk]);
    const row = screen.getByRole('listitem', { name: 'Buy milk' });
    expect(within(row).getByRole('button', { name: 'Delete Buy milk' }).classList.contains('task__delete')).toBe(true);
    fireEvent.mouseEnter(row);
    expect(row.classList.contains('task--hovered')).toBe(true);
    fireEvent.mouseLeave(row);
    expect(row.classList.contains('task--hovered')).toBe(false);
  });

  it('deletes a task from its sibling row action', () => {
    renderHarness([milk]);
    const row = screen.getByRole('listitem', { name: 'Buy milk' });
    fireEvent.click(within(row).getByRole('button', { name: 'Delete Buy milk' }));
    expect(screen.queryByRole('button', { name: 'Buy milk' })).toBeNull();
  });
});

it('loads once, saves the full updated array, and keeps failed changes visible', async () => {
  invoke
    .mockResolvedValue(undefined)
    .mockResolvedValueOnce([milk])
    .mockRejectedValueOnce(new Error('disk unavailable'));
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');

  await import('./main');
  await screen.findByRole('button', { name: 'Buy milk' });

  fireEvent.click(screen.getByRole('button', { name: 'Buy milk' }));

  expect(screen.getByRole('button', { name: 'Buy milk' }).classList.contains('task--done')).toBe(true);
  await waitFor(() => expect(screen.getByText('Changes are not saved yet.')).toBeTruthy());
  expect(invoke).toHaveBeenNthCalledWith(1, 'load_tasks');
  expect(invoke).toHaveBeenNthCalledWith(2, 'save_tasks', {
    tasks: [{ ...milk, completed: true }],
  });

  const input = screen.getByLabelText('New task');
  fireEvent.change(input, { target: { value: 'Reply to email' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.queryByText('Changes are not saved yet.')).toBeNull();
  expect(invoke).toHaveBeenNthCalledWith(3, 'save_tasks', {
    tasks: [
      { ...milk, completed: true },
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000001',
        text: 'Reply to email',
        completed: false,
      }),
    ],
  });

  const milkRow = screen.getByRole('listitem', { name: 'Buy milk' });
  fireEvent.click(within(milkRow).getByRole('button', { name: 'Delete Buy milk' }));
  expect(screen.queryByRole('button', { name: 'Buy milk' })).toBeNull();
  expect(invoke).toHaveBeenNthCalledWith(4, 'save_tasks', {
    tasks: [
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000001',
        text: 'Reply to email',
        completed: false,
      }),
    ],
  });
  expect(invoke.mock.calls.filter(([command]) => command === 'load_tasks')).toHaveLength(1);
});
