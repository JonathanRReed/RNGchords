// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  server: {
    host: 'localhost',
    port: 4321,
  },
  vite: {
    server: {
      strictPort: true,
      hmr: {
        host: 'localhost',
        clientPort: 4321,
      },
      warmup: {
        clientFiles: ['./src/components/RngChordsApp.tsx', './src/lib/audio/playback.ts'],
      },
    },
  },
});
