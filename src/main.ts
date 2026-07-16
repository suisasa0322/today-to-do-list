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
let saveQueue: Promise<void> = Promise.resolve();
let saveVersion = 0;

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
    if (loadError) return;
    save(addTask(tasks, text, new Date().toISOString(), crypto.randomUUID()));
  },
  onToggle(id) {
    if (loadError) return;
    save(toggleTask(tasks, id));
  },
  onDelete(id) {
    if (loadError) return;
    save(deleteTask(tasks, id));
  },
  get saveError() {
    return saveError;
  },
  get loadError() {
    return loadError;
  },
};

const appWindow = getCurrentWindow();
void appWindow.onCloseRequested(async event => {
  event.preventDefault();
  await saveQueue;
  await appWindow.destroy();
});

void loadTasks()
  .then(loadedTasks => {
    tasks = loadedTasks;
    render();
  })
  .catch(() => {
    loadError = true;
    render();
  });
