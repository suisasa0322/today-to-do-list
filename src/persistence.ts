import { invoke } from '@tauri-apps/api/core';
import type { Task } from './types';

export const loadTasks = (): Promise<Task[]> => invoke<Task[]>('load_tasks');

export const persistTasks = (tasks: Task[]): Promise<void> =>
  invoke<void>('save_tasks', { tasks });
