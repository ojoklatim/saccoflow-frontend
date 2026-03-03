import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/saccoflow-frontend/',
  build: {
    outDir: 'dist',
  },
});
