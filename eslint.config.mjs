import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'reports/**',
      'dist/**',
    ],
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  // Type-aware rules (e.g. no-floating-promises) only where a tsconfig covers the files.
  {
    files: ['src/**/*.ts', 'playwright.config.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],

    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  {
    ...playwright.configs['flat/recommended'],
    files: ['src/**/*.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Assertions live in page-object methods named expect*, so teach the rule about them.
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^expect'] }],
    },
  },

  prettier,
);
