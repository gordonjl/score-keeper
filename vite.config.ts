/* eslint-disable unicorn/no-process-exit */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import netlify from '@netlify/vite-plugin-tanstack-start'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

// Simple plugin to generate version.json in dist/client
function versionPlugin(): Plugin {
  return {
    name: 'version-plugin',
    closeBundle() {
      const version = {
        version: Date.now().toString(),
        timestamp: new Date().toISOString(),
      }
      const outputPath = resolve(__dirname, 'dist/client/version.json')
      writeFileSync(outputPath, JSON.stringify(version, null, 2))
      console.log(`✓ Generated version.json: ${version.version}`)
    },
  }
}

const config = defineConfig({
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 60_001,
    host: true, // Allow access from any host (enables subdomain.localhost)
  },
  worker: { format: 'es' },
  optimizeDeps: {
    exclude: ['@livestore/wa-sqlite'],
  },
  plugins: [
    // CRITICAL: TanStack Start MUST be first, then React
    // https://tanstack.com/router/latest/docs/framework/react/start/getting-started
    tanstackStart(),
    viteReact(),
    // Path aliases and other plugins can come after
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    versionPlugin(),
    // Temporarily disabled to test JSX runtime issue
    // livestoreDevtoolsPlugin({ schemaPath: './src/livestore/schema.ts' }),
    netlify(),
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
