import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      // TODO (M6 polish): switch to 'prompt' and add an in-game "new version" banner.
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      manifest: {
        name: "Hannah's World",
        short_name: "Hannah's World",
        description: 'A cosy dollhouse decorating game.',
        theme_color: '#e67eb4',
        background_color: '#fff1f7',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json}'],
        // House/item art is fetched and cached on demand by the game itself, not precached here.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
