import "./style.css";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { loadTasks, persistTasks } from './persistence';
import { renderApp, type AppHandlers } from './render';
import { addTask, deleteTask, toggleTask } from './task-store';
import type { Task } from './types';

const root = document.querySelector<HTMLElement>('#app')!;
let tasks: Task[] = [];
let saveError = false;
let loadError = false;
let lifecycleError = false;
let closing = false;
let saveQueue: Promise<void> = Promise.resolve();
let saveVersion = 0;
let closePromise: Promise<void> | undefined;

const editingLocked = () => loadError || lifecycleError || closing;

const render = () => renderApp(root, tasks, handlers);

const save = (nextTasks: Task[]) => {
  tasks = nextTasks;
  saveError = false;
  render();
  const snapshot = tasks;
  const version = ++saveVersion;
  saveQueue = saveQueue
    .then(() => persistTasks(snapshot))
    .then(
      () => {
        if (version !== saveVersion) return;
        const statusChanged = saveError;
        saveError = false;
        if (statusChanged) render();
      },
      () => {
        if (version !== saveVersion) return;
        saveError = true;
        render();
      },
    );
};

const handlers: AppHandlers = {
  onAdd(text) {
    if (editingLocked()) return;
    save(addTask(tasks, text, new Date().toISOString(), crypto.randomUUID()));
  },
  onToggle(id) {
    if (editingLocked()) return;
    save(toggleTask(tasks, id));
  },
  onDelete(id) {
    if (editingLocked()) return;
    save(deleteTask(tasks, id));
  },
  get saveError() {
    return saveError;
  },
  get loadError() {
    return loadError;
  },
  get lifecycleError() {
    return lifecycleError;
  },
  get editingLocked() {
    return editingLocked();
  },
};

const appWindow = getCurrentWindow();
const handleCloseRequested = async (event: { preventDefault: () => void }) => {
  event.preventDefault();
  if (!closePromise) {
    closing = true;
    render();
    closePromise = (async () => {
      await saveQueue;
      if (saveError) {
        closing = false;
        closePromise = undefined;
        render();
        return;
      }
      await appWindow.destroy();
    })();
  }
  await closePromise;
};

const start = async () => {
  try {
    await appWindow.onCloseRequested(handleCloseRequested);
  } catch {
    lifecycleError = true;
    render();
    return;
  }

  try {
    tasks = await loadTasks();
    render();
  } catch {
    loadError = true;
    render();
  }
};

void start();
