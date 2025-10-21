import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import netlify from '@netlify/vite-plugin-tanstack-start'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { devtools } from '@tanstack/devtools-vite'
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
    devtools(),
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
    netlify(),
  ],
  test: {
    globals: true,
    setupFiles: './vitest.setup.ts',
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
  },
})

export default config
