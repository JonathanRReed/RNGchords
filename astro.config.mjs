// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const site = process.env.SITE_URL ?? 'https://rngchords.jonathanrreed.com';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  site,
  build: {
    inlineStylesheets: 'never',
  },
  server: {
    host: 'localhost',
    // Preferred port, but not strict: if 4321 is busy (e.g. another local
    // project is holding it) the dev server falls back to the next open port
    // instead of failing to start. HMR auto-detects the chosen port — do NOT
    // hardcode hmr.clientPort, or the websocket reconnect-loops on any other
    // port and the page loads without hydrating (dead buttons).
    port: 4321,
  },
  vite: {
    server: {
      warmup: {
        clientFiles: ['./src/components/RngChordsApp.tsx', './src/lib/audio/playback.ts'],
      },
    },
  },
});
