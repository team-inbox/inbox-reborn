import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'docs/'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['build.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
];
