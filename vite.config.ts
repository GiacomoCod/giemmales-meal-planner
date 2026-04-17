import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      // Non registrare SW in sviluppo per evitare problemi di cache
      devOptions: {
        enabled: false // SW disabilitato in sviluppo
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Home Planner',
        short_name: 'Planner',
        description: 'Gestione pasti, pulizie e finanze della tua casa.',
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    // Ottimizzazione immagini: converte in WebP/AVIF e comprime
    ViteImageOptimizer({
      // Formati di output
      webp: {
        quality: 75, // Qualità WebP (0-100)
        lossless: false
      },
      avif: {
        quality: 65, // Qualità AVIF (0-100) - più aggressiva
        lossless: false
      },
      // Soglie per skip ottimizzazione (solo stringhe, no RegExp)
      exclude: [
        'favicon.ico',
        'favicon.svg',
        'icon-192.png',
        'icon-512.png',
        'apple-touch-icon.png',
        'mask-icon.svg',
        'icons.svg'
      ],
      // Cache per build successive più veloci
      cache: true,
      cacheLocation: './node_modules/.vite-image-cache'
    })
  ],
  server: {
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('date-fns')) return 'vendor-date';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react')) return 'vendor-react';
        }
      }
    },
    // Asset inline threshold (più alto per immagini piccole)
    assetsInlineLimit: 4096 // 4KB (default)
  }
})
