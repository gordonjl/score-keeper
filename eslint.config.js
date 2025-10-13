//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  ...tanstackConfig,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
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
