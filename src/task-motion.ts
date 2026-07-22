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
      row.removeEventListener('animationend', onAnimationEnd);
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

    const onAnimationEnd = (event: Event) => {
      if (event.target === row) cleanup();
    };

    row.addEventListener('animationend', onAnimationEnd);
    timeout = window.setTimeout(cleanup, timeoutFor(motion, reduced));
    cancelActive = cleanup;
  };

  return { cancel, play };
};
