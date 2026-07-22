// @vitest-environment jsdom

import { fireEvent, screen, waitFor, within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp, type AppHandlers } from './render';
import { addTask, deleteTask, toggleTask } from './task-store';
import type { Task } from './types';

const invoke = vi.hoisted(() => vi.fn());
const destroy = vi.hoisted(() => vi.fn());
const onCloseRequested = vi.hoisted(() => vi.fn());
const playMotion = vi.hoisted(() => vi.fn());
const cancelMotion = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ destroy, onCloseRequested }),
}));
vi.mock('./task-motion', () => ({
  createTaskMotionController: () => ({ cancel: cancelMotion, play: playMotion }),
}));

const milk: Task = {
  id: 'task-1',
  text: 'Buy milk',
  completed: false,
  createdAt: '2026-07-12T00:00:00.000Z',
};

const deferred = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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
  destroy.mockReset();
  onCloseRequested.mockReset();
  playMotion.mockReset();
  cancelMotion.mockReset();
  onCloseRequested.mockResolvedValue(() => undefined);
  vi.resetModules();
});

afterEach(() => vi.restoreAllMocks());

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

describe('sticky-note task interface', () => {
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

  it('adds a task when Enter is pressed', () => {
    renderHarness();
    const input = screen.getByLabelText('New task');
    fireEvent.change(input, { target: { value: '  Buy milk  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Buy milk' }).classList.contains('task--open')).toBe(true);
    expect(screen.getByLabelText('New task')).toHaveProperty('value', '');
  });

  it('does not add whitespace-only text when Enter is pressed', () => {
    renderHarness();
    const input = screen.getByLabelText('New task');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('does not add a task for a non-Enter key', () => {
    renderHarness();
    const input = screen.getByLabelText('New task');
    fireEvent.change(input, { target: { value: 'Buy milk' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('keeps delete hidden by default and reveals it on hover or focus-within', async () => {
    // @ts-expect-error Node types are intentionally absent from this browser application.
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/style.css', 'utf8');
    expect(css).toMatch(/\.task__delete\s*\{[^}]*opacity:\s*0;[^}]*pointer-events:\s*none;/s);
    expect(css).toMatch(
      /\.task:hover \.task__delete,\s*\.task--hovered \.task__delete,\s*\.task:focus-within \.task__delete\s*\{[^}]*opacity:\s*1;[^}]*pointer-events:\s*auto;/s,
    );
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

it('serializes full snapshots and only shows the latest save result', async () => {
  const firstSave = deferred();
  const secondSave = deferred();
  const thirdSave = deferred();
  const saves = [firstSave, secondSave, thirdSave];
  let saveIndex = 0;
  invoke.mockImplementation((command: string) =>
    command === 'load_tasks' ? Promise.resolve([milk]) : saves[saveIndex++].promise,
  );
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');

  await import('./main');
  await screen.findByRole('button', { name: 'Buy milk' });

  fireEvent.click(screen.getByRole('button', { name: 'Buy milk' }));

  expect(screen.getByRole('button', { name: 'Buy milk' }).classList.contains('task--done')).toBe(true);
  expect(invoke).toHaveBeenNthCalledWith(1, 'load_tasks');
  await waitFor(() =>
    expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(1),
  );
  expect(invoke).toHaveBeenNthCalledWith(2, 'save_tasks', {
    tasks: [{ ...milk, completed: true }],
  });

  const input = screen.getByLabelText('New task');
  fireEvent.change(input, { target: { value: 'Reply to email' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'Reply to email' })).toBeTruthy();
  expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(1);

  firstSave.reject(new Error('stale failure'));
  await waitFor(() =>
    expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(2),
  );
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
  expect(screen.queryByText('Changes are not saved yet.')).toBeNull();

  secondSave.resolve();
  await secondSave.promise;
  await flushMicrotasks();
  expect(screen.queryByText('Changes are not saved yet.')).toBeNull();

  const milkRow = screen.getByRole('listitem', { name: 'Buy milk' });
  fireEvent.click(within(milkRow).getByRole('button', { name: 'Delete Buy milk' }));
  expect(screen.queryByRole('button', { name: 'Buy milk' })).toBeNull();
  await waitFor(() =>
    expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(3),
  );
  expect(invoke).toHaveBeenNthCalledWith(4, 'save_tasks', {
    tasks: [
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000001',
        text: 'Reply to email',
        completed: false,
      }),
    ],
  });

  thirdSave.reject(new Error('latest failure'));
  await waitFor(() => expect(screen.getByText('Changes are not saved yet.')).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Buy milk' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Reply to email' })).toBeTruthy();
  expect(invoke.mock.calls.filter(([command]) => command === 'load_tasks')).toHaveLength(1);
});

it('locks the empty interface after load fails and cannot overwrite disk state', async () => {
  invoke.mockRejectedValueOnce(new Error('permission denied'));

  await import('./main');

  expect(await screen.findByText('Tasks could not be loaded. Editing is disabled.')).toBeTruthy();
  const input = screen.getByLabelText('New task');
  expect(input).toHaveProperty('disabled', true);
  fireEvent.change(input, { target: { value: 'Must not be saved' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(0);
});

it('locks mutations and single-shots repeated close requests while flushing the pre-close tail', async () => {
  const firstSave = deferred();
  const latestSave = deferred();
  let saveIndex = 0;
  invoke.mockImplementation((command: string) => {
    if (command === 'load_tasks') return Promise.resolve([milk]);
    return [firstSave, latestSave][saveIndex++].promise;
  });
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000002');

  await import('./main');
  await screen.findByRole('button', { name: 'Buy milk' });
  fireEvent.click(screen.getByRole('button', { name: 'Buy milk' }));
  const input = screen.getByLabelText('New task');
  fireEvent.change(input, { target: { value: 'Latest task' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(1));

  const closeHandler = onCloseRequested.mock.calls[0]?.[0];
  expect(closeHandler).toBeTypeOf('function');
  const preventDefault = vi.fn();
  const closing = closeHandler({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(destroy).not.toHaveBeenCalled();
  const lockedInput = screen.getByLabelText('New task');
  expect(lockedInput).toHaveProperty('disabled', true);
  fireEvent.change(lockedInput, { target: { value: 'Too late' } });
  fireEvent.keyDown(lockedInput, { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Buy milk' }));
  expect(screen.queryByRole('button', { name: 'Too late' })).toBeNull();

  const repeatedPreventDefault = vi.fn();
  const repeatedClosing = closeHandler({ preventDefault: repeatedPreventDefault });
  expect(repeatedPreventDefault).toHaveBeenCalledOnce();

  firstSave.reject(new Error('stale failure'));
  await waitFor(() => expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(2));
  expect(destroy).not.toHaveBeenCalled();
  expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')[1]).toEqual([
    'save_tasks',
    {
      tasks: [
        { ...milk, completed: true },
        expect.objectContaining({ text: 'Latest task' }),
      ],
    },
  ]);

  latestSave.resolve();
  await Promise.all([closing, repeatedClosing]);
  expect(destroy).toHaveBeenCalledOnce();
  expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(2);
});

it('keeps the app open and unlocks editing when the latest save fails during close', async () => {
  const latestSave = deferred();
  const retrySave = deferred();
  let saveIndex = 0;
  invoke.mockImplementation((command: string) => {
    if (command === 'load_tasks') return Promise.resolve([milk]);
    return [latestSave, retrySave][saveIndex++].promise;
  });
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000003')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000004');

  await import('./main');
  await screen.findByRole('button', { name: 'Buy milk' });
  fireEvent.click(screen.getByRole('button', { name: 'Buy milk' }));
  await waitFor(() => expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(1));

  const closeHandler = onCloseRequested.mock.calls[0]?.[0];
  expect(closeHandler).toBeTypeOf('function');
  const preventDefault = vi.fn();
  const repeatedPreventDefault = vi.fn();
  const closing = closeHandler({ preventDefault });
  const repeatedClosing = closeHandler({ preventDefault: repeatedPreventDefault });

  expect(preventDefault).toHaveBeenCalledOnce();
  expect(repeatedPreventDefault).toHaveBeenCalledOnce();
  expect(screen.getByLabelText('New task')).toHaveProperty('disabled', true);
  expect(destroy).not.toHaveBeenCalled();

  latestSave.reject(new Error('disk full'));
  await Promise.all([closing, repeatedClosing]);

  expect(destroy).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Buy milk' }).classList.contains('task--done')).toBe(true);
  expect(screen.getByText('Changes are not saved yet.')).toBeTruthy();
  expect(screen.getByLabelText('New task')).toHaveProperty('disabled', false);
  expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(1);

  const input = screen.getByLabelText('New task');
  fireEvent.change(input, { target: { value: 'Try saving again' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'Try saving again' })).toBeTruthy();
  await waitFor(() => expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(2));
  retrySave.resolve();
});

it('locks startup and never loads tasks when close-listener registration fails', async () => {
  onCloseRequested.mockRejectedValueOnce(new Error('event plugin unavailable'));
  invoke.mockResolvedValue([milk]);

  await import('./main');

  expect(await screen.findByText('Safe shutdown could not be initialized. Editing is disabled.')).toBeTruthy();
  expect(screen.getByLabelText('New task')).toHaveProperty('disabled', true);
  expect(invoke.mock.calls.filter(([command]) => command === 'load_tasks')).toHaveLength(0);
  expect(invoke.mock.calls.filter(([command]) => command === 'save_tasks')).toHaveLength(0);
});
