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
      // Relax some strict rules for pragmatic development
      '@typescript-eslint/no-floating-promises': [
        'warn',
        {
          // Allow store.commit() to be called without await/void (livestore pattern)
          ignoreVoid: true,
          ignoreIIFE: false,
        },
      ],
      '@typescript-eslint/no-misused-promises': 'warn', // Downgrade to warning
      '@typescript-eslint/no-unsafe-call': 'warn', // Downgrade to warning
      '@typescript-eslint/no-unsafe-member-access': 'warn', // Downgrade to warning
      '@typescript-eslint/no-unsafe-argument': 'warn', // Downgrade to warning
      '@typescript-eslint/no-unsafe-assignment': 'warn', // Downgrade to warning
      '@typescript-eslint/restrict-template-expressions': 'off', // Too strict for logging
      '@typescript-eslint/await-thenable': 'warn', // Downgrade to warning
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Downgrade to warning
      '@typescript-eslint/prefer-optional-chain': 'warn', // Downgrade to warning
      '@typescript-eslint/unbound-method': 'off', // Too strict for callbacks
      'react-compiler/react-compiler': 'off', // Disable React Compiler rules for now
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
