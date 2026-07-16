import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distDirectory = resolve(process.cwd(), 'dist');

test('adds, completes, deletes, and restores a task after restart', async ({ page }) => {
  await page.addInitScript(() => {
    const storageKey = 'today-to-do-list:e2e:tasks';
    const tauriWindow = window as Window & {
      __TAURI_INTERNALS__: {
        invoke: (command: string, args?: { tasks?: unknown[] }) => Promise<unknown>;
      };
    };

    tauriWindow.__TAURI_INTERNALS__ = {
      async invoke(command, args = {}) {
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
  await expect(task).toHaveCSS('color', 'rgb(119, 119, 119)');

  await page.reload();

  const restoredOpenTask = page.getByRole('button', { name: 'Buy milk' });
  await expect(restoredOpenTask).toHaveClass(/task--open/);
  await expect(restoredOpenTask).toHaveCSS('color', 'rgb(119, 119, 119)');

  await restoredOpenTask.click();
  await expect(restoredOpenTask).toHaveClass(/task--done/);
  await expect(restoredOpenTask).toHaveCSS('text-decoration-line', 'line-through');

  await page.reload();

  const restoredDoneTask = page.getByRole('button', { name: 'Buy milk' });
  await expect(restoredDoneTask).toHaveClass(/task--done/);
  await expect(restoredDoneTask).toHaveCSS('text-decoration-line', 'line-through');

  const taskRow = page.getByRole('listitem', { name: 'Buy milk' });
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
