import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In the compose stack nginx proxies /api to the backend; for `npm run dev`
// we proxy it here so the console talks to a locally-running backend on :3000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
