/* eslint-disable unicorn/no-process-exit */
import { spawn } from 'node:child_process'
import netlify from '@netlify/vite-plugin-tanstack-start'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite'
import { VitePWA } from 'vite-plugin-pwa'

const config = defineConfig({
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 60_001,
    host: true, // Allow access from any host (enables subdomain.localhost)
  },
  worker: { format: 'es' },
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    netlify(),
    viteReact(),
    livestoreDevtoolsPlugin({ schemaPath: './src/livestore/schema.ts' }),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Score Keeper',
        short_name: 'Score Keeper',
        description: 'Squash score tracking application',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/logo192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    // Running `wrangler dev` as part of `vite dev` needed for `@livestore/sync-cf`
    {
      name: 'wrangler-dev',
      configureServer: async (server) => {
        const wrangler = spawn(
          './node_modules/.bin/wrangler',
          ['dev', '--port', '8787'],
          {
            stdio: ['ignore', 'inherit', 'inherit'],
          },
        )

        const shutdown = () => {
          if (wrangler.killed === false) {
            wrangler.kill()
          }
          process.exit(0)
        }

        server.httpServer?.on('close', shutdown)
        process.on('SIGTERM', shutdown)
        process.on('SIGINT', shutdown)

        wrangler.on('exit', (code) =>
          console.error(`wrangler dev exited with code ${code}`),
        )
      },
    },
  ],
})

export default config
