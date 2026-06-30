import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'app',
  envDir: '..', // .env.local lives at repo root, not inside app/
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [react()],
  server: { port: 4174 }
});
