import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The casino is served at /casino/ on the site's one origin, next to the portal
// (/), the game (/play/) and the services (/items/, /social/, /identity/). In
// development this server passes the services' paths to their own dev servers,
// as the portal's does; open it through the portal (http://localhost:5174/casino/)
// or alone (http://localhost:5175/casino/).
export default defineConfig({
  base: '/casino/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      // the game's dev server: the items' sprites (/play/resources/textures) and its language files
      '^/play(/|$)': { target: process.env.BALATRO_GAME ?? 'http://localhost:5173' },
      // the item service (make run in ../BalatroItemService): the casino itself, and its live stream
      '/items': {
        target: process.env.BALATRO_ITEMS ?? 'http://127.0.0.1:8004',
        rewrite: (path) => path.replace(/^\/items/, ''),
      },
      // the social service (make run in ../BalatroSocial): friends to challenge, profile pictures
      '/social': {
        target: process.env.BALATRO_SOCIAL ?? 'http://127.0.0.1:8005',
        rewrite: (path) => path.replace(/^\/social/, ''),
      },
      // the identity service (make run): refreshing the session
      '/identity': {
        target: process.env.BALATRO_IDENTITY ?? 'http://127.0.0.1:8001',
        rewrite: (path) => path.replace(/^\/identity/, ''),
      },
      // the game API: whether it runs without sign-in
      '/api': process.env.BALATRO_API ?? 'http://127.0.0.1:8000',
    },
  },
  build: { target: 'es2022' },
});
