import catSwipePawUrl from './assets/cat-swipe-paw.png';
import catTopperBlinkUrl from './assets/cat-topper-blink.png';
import catTopperEarTwitchUrl from './assets/cat-topper-ear-twitch.png';
import catTopperOpenUrl from './assets/cat-topper-open.png';
import type { Task } from './types';

export type AppHandlers = {
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  saveError?: boolean;
  loadError?: boolean;
  lifecycleError?: boolean;
  editingLocked?: boolean;
};

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

const makeTaskRow = (task: Task, handlers: AppHandlers): HTMLLIElement => {
  const row = document.createElement('li');
  row.className = 'task';
  row.dataset.taskId = task.id;
  row.setAttribute('aria-label', task.text);
  row.addEventListener('mouseenter', () => row.classList.add('task--hovered'));
  row.addEventListener('mouseleave', () => row.classList.remove('task--hovered'));

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.disabled = handlers.editingLocked ?? false;
  toggle.className = task.completed ? 'task__toggle task--done' : 'task__toggle task--open';
  toggle.setAttribute('aria-pressed', String(task.completed));
  toggle.setAttribute('aria-label', task.text);
  toggle.addEventListener('click', () => handlers.onToggle(task.id));

  const indicator = document.createElement('span');
  indicator.className = 'task__indicator';
  indicator.setAttribute('aria-hidden', 'true');
  indicator.textContent = task.completed ? '✓' : '';

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

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.disabled = handlers.editingLocked ?? false;
  remove.className = 'task__delete';
  remove.setAttribute('aria-label', `Delete ${task.text}`);
  remove.textContent = '×';
  remove.addEventListener('click', () => handlers.onDelete(task.id));

  textEffect.append(text, strike, paw);
  toggle.append(indicator, textEffect);
  row.append(toggle, remove);
  return row;
};

export const renderApp = (root: HTMLElement, tasks: Task[], handlers: AppHandlers): void => {
  root.replaceChildren();

  const shell = document.createElement('section');
  shell.className = 'sticky-note';

  const header = document.createElement('header');
  header.className = 'sticky-note__header';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'sticky-note__eyebrow';
  eyebrow.textContent = 'A little plan for today';
  const heading = document.createElement('h1');
  heading.textContent = 'Today To Do List';
  header.append(eyebrow, heading, makeCatCompanion());

  const list = document.createElement('ul');
  list.className = 'task-list';
  list.setAttribute('aria-label', 'Tasks');
  tasks.forEach(task => list.append(makeTaskRow(task, handlers)));

  const footer = document.createElement('div');
  footer.className = 'sticky-note__footer';

  const status = document.createElement('p');
  status.className = 'save-status';
  status.setAttribute('role', 'status');
  status.textContent = handlers.lifecycleError
    ? 'Safe shutdown could not be initialized. Editing is disabled.'
    : handlers.loadError
      ? 'Tasks could not be loaded. Editing is disabled.'
      : handlers.saveError
        ? 'Changes are not saved yet.'
        : '';

  const label = document.createElement('label');
  label.className = 'new-task';
  const labelText = document.createElement('span');
  labelText.className = 'visually-hidden';
  labelText.textContent = 'New task';
  const input = document.createElement('input');
  input.type = 'text';
  input.disabled = handlers.editingLocked ?? false;
  input.placeholder = 'New task';
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || !input.value.trim()) return;
    handlers.onAdd(input.value);
    input.value = '';
  });
  label.append(labelText, input);
  footer.append(status, label);
  shell.append(header, list, footer);
  root.append(shell);
};
