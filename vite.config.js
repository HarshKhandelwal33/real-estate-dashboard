import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/real-estate-dashboard/',
  server: {
    open: true,
  },
});