/* eslint-disable unicorn/no-process-exit */
import { spawn } from 'node:child_process'
import netlify from '@netlify/vite-plugin-tanstack-start'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite'
import { vitePluginVersionMark } from 'vite-plugin-version-mark'

const config = defineConfig({
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 60_001,
    host: true, // Allow access from any host (enables subdomain.localhost)
  },
  worker: { format: 'es' },
  build: {
    outDir: 'dist/client',
  },
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    viteReact(),
    livestoreDevtoolsPlugin({ schemaPath: './src/livestore/schema.ts' }),
    tanstackStart(),
    netlify(),
    vitePluginVersionMark({
      ifShortSHA: true,
      outputFile: (version) => ({
        path: '../version.json', // Server build outputs to dist/client/server, so go up one level
        content: JSON.stringify(
          {
            version,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
      }),
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
