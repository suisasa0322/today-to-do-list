import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distDirectory = resolve(process.cwd(), 'dist');

test('adds, completes, deletes, and restores a task after restart', async ({ page }) => {
  await page.addInitScript(() => {
    const storageKey = 'today-to-do-list:e2e:tasks';
    type TauriCallback = (payload: unknown) => unknown;
    type InvokeArgs = {
      event?: string;
      eventId?: number;
      handler?: number;
      tasks?: unknown[];
    };
    const callbacks = new Map<number, TauriCallback>();
    let nextCallbackId = 1;
    const tauriWindow = window as Window & {
      __TAURI_INTERNALS__: {
        invoke: (command: string, args?: InvokeArgs) => Promise<unknown>;
        metadata: { currentWindow: { label: string } };
        transformCallback: (callback: TauriCallback, once?: boolean) => number;
        unregisterCallback: (id: number) => void;
      };
      __TAURI_EVENT_PLUGIN_INTERNALS__: {
        unregisterListener: (event: string, id: number) => void;
      };
    };

    tauriWindow.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' } },
      transformCallback(callback, once = false) {
        const id = nextCallbackId++;
        callbacks.set(id, payload => {
          if (once) callbacks.delete(id);
          return callback(payload);
        });
        return id;
      },
      unregisterCallback(id) {
        callbacks.delete(id);
      },
      async invoke(command, args = {}) {
        if (command === 'plugin:event|listen') {
          if (args.event !== 'tauri://close-requested' || typeof args.handler !== 'number') {
            throw new Error(`Unexpected Tauri listen request: ${JSON.stringify(args)}`);
          }
          return args.handler;
        }
        if (command === 'plugin:event|unlisten') {
          if (typeof args.eventId !== 'number') {
            throw new Error(`Unexpected Tauri unlisten request: ${JSON.stringify(args)}`);
          }
          callbacks.delete(args.eventId);
          return null;
        }
        if (command === 'plugin:window|destroy') return null;
        if (command === 'load_tasks') {
          return JSON.parse(localStorage.getItem(storageKey) ?? '[]');
        }
        if (command === 'save_tasks') {
          localStorage.setItem(storageKey, JSON.stringify(args.tasks ?? []));
          return null;
        }
        throw new Error(`Unexpected Tauri command: ${command}`);
      },
    };
    tauriWindow.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener(_event, id) {
        callbacks.delete(id);
      },
    };
  });
  await page.route('http://today-to-do-list.test/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const requestedPath = resolve(distDirectory, pathname === '/' ? 'index.html' : `.${pathname}`);
    const filePath = requestedPath.startsWith(distDirectory) && existsSync(requestedPath)
      ? requestedPath
      : resolve(distDirectory, 'index.html');
    await route.fulfill({ path: filePath });
  });
  await page.goto('/');

  await page.getByLabel('New task').fill('Buy milk');
  await page.getByLabel('New task').press('Enter');

  const task = page.getByRole('button', { name: 'Buy milk' });
  await expect(task).toHaveClass(/task--open/);
  await expect(task).toHaveCSS('color', 'rgb(113, 104, 93)');

  await page.reload();

  const restoredOpenTask = page.getByRole('button', { name: 'Buy milk' });
  await expect(restoredOpenTask).toHaveClass(/task--open/);
  await expect(restoredOpenTask).toHaveCSS('color', 'rgb(113, 104, 93)');

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

  const deleteButton = page.getByRole('button', { name: 'Delete Buy milk' });
  await expect(deleteButton).toHaveCSS('opacity', '0');
  await expect(deleteButton).toHaveCSS('pointer-events', 'none');

  await taskRow.hover();

  await expect(deleteButton).toHaveCSS('opacity', '1');
  await expect(deleteButton).toHaveCSS('pointer-events', 'auto');
  await deleteButton.click();
  await expect(restoredDoneTask).toHaveCount(0);

  await page.reload();

  await expect(page.getByRole('button', { name: 'Buy milk' })).toHaveCount(0);
});
