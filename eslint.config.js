//  @ts-check

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { tanstackConfig } from '@tanstack/eslint-config'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  // ESLint recommended rules
  js.configs.recommended,
  
  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  
  // TanStack specific rules (includes additional TypeScript rules)
  ...tanstackConfig,
  
  // React Hooks rules
  {
    name: 'react-hooks',
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error', // Upgrade from warn to error
    },
  },
  
  // Project-specific overrides
  {
    name: 'project-overrides',
    rules: {
      // Prefer type over interface (project convention)
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // Allow empty functions (sometimes needed for default props)
      '@typescript-eslint/no-empty-function': 'off',
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
)
