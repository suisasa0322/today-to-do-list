import type { Task } from './types';

export const addTask = (tasks: Task[], text: string, createdAt: string, id: string): Task[] => {
  const trimmed = text.trim();
  return trimmed ? [...tasks, { id, text: trimmed, completed: false, createdAt }] : tasks;
};
export const toggleTask = (tasks: Task[], id: string): Task[] => tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
export const deleteTask = (tasks: Task[], id: string): Task[] => tasks.filter(task => task.id !== id);
