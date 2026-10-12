import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true, // abre el navegador solo
    proxy: { '/api': 'http://127.0.0.1:4000' },
  },
});
