import { build } from 'vite';

export default async function globalSetup(): Promise<void> {
  await build();
}
