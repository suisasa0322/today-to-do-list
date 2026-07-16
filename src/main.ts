import "./style.css";
import { loadTasks, persistTasks } from './persistence';
import { renderApp, type AppHandlers } from './render';
import { addTask, deleteTask, toggleTask } from './task-store';
import type { Task } from './types';

const root = document.querySelector<HTMLElement>('#app')!;
let tasks: Task[] = [];
let saveError = false;

const render = () => renderApp(root, tasks, handlers);

const save = (nextTasks: Task[]) => {
  tasks = nextTasks;
  saveError = false;
  render();
  void persistTasks(tasks).catch(() => {
    saveError = true;
    render();
  });
};

const handlers: AppHandlers = {
  onAdd(text) {
    save(addTask(tasks, text, new Date().toISOString(), crypto.randomUUID()));
  },
  onToggle(id) {
    save(toggleTask(tasks, id));
  },
  onDelete(id) {
    save(deleteTask(tasks, id));
  },
  get saveError() {
    return saveError;
  },
};

void loadTasks()
  .then(loadedTasks => {
    tasks = loadedTasks;
    render();
  })
  .catch(() => render());
