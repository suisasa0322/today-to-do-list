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

  await task.click();
  await expect(task).toHaveClass(/task--done/);
  await expect(task).toHaveCSS('text-decoration-line', 'line-through');

  await page.reload();

  const restoredTask = page.getByRole('button', { name: 'Buy milk' });
  await expect(restoredTask).toHaveClass(/task--done/);
  await expect(restoredTask).toHaveCSS('text-decoration-line', 'line-through');

  await page.getByRole('listitem', { name: 'Buy milk' }).hover();
  const deleteButton = page.getByRole('button', { name: 'Delete Buy milk' });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  await expect(restoredTask).toHaveCount(0);
});
