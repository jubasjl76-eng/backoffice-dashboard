import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Source maps + upload only when a Sentry auth token is present (CI release
// builds). Local / tokenless builds skip it entirely.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

// In the compose stack nginx proxies /api to the backend; for `npm run dev`
// we proxy it here so the console talks to a locally-running backend on :3000.
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT || 'backoffice-dashboard',
      authToken: sentryAuthToken,
      disable: !sentryAuthToken,
      telemetry: false,
    }),
  ],
  build: {
    sourcemap: sentryAuthToken ? 'hidden' : false,
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
