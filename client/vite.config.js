import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub project pages are served from https://<owner>.github.io/<repo>/,
// so production builds need that repo name as the base path. Local dev
// keeps the default root base.
const isGithubPagesBuild = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGithubPagesBuild ? '/vegroupscheduling/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
