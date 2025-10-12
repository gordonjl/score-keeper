//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    ignores: [
      // Build outputs
      'dist/**',
      '.netlify/**',
      // Wrangler temp files
      '.wrangler/**',
      // Config files at root (they're not in tsconfig.json project)
      'eslint.config.js',
      'prettier.config.js',
      'vite.config.ts',
      // Generated files
      'src/routeTree.gen.ts',
    ],
  },
]
