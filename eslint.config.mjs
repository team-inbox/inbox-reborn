import fs from 'node:fs';
import js from '@eslint/js';
import globals from 'globals';

// The content script is split over src/content/*.js, classic scripts that
// share one scope in the order the manifest loads them. For each file, the
// top-level bindings of the other files are globals; its own are not, so a
// name declared twice is still an error.
const CONTENT_DIR = 'src/content';
const contentFiles = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.js'));
const topLevelBindings = (file) => {
  const code = fs.readFileSync(`${CONTENT_DIR}/${file}`, 'utf8');
  return [...code.matchAll(/^(const|let|var|function|async function)\s+([\w$]+)/gm)].map((m) => ({
    name: m[2],
    writable: m[1] === 'let' || m[1] === 'var',
  }));
};
const bindingsByFile = Object.fromEntries(contentFiles.map((f) => [f, topLevelBindings(f)]));
const contentScriptConfigs = contentFiles.map((file) => ({
  files: [`${CONTENT_DIR}/${file}`],
  languageOptions: {
    globals: Object.fromEntries(
      contentFiles
        .filter((other) => other !== file)
        .flatMap((other) => bindingsByFile[other])
        .map(({ name, writable }) => [name, writable ? 'writable' : 'readonly']),
    ),
  },
  rules: {
    // A top-level binding may be used, or reassigned, from another file;
    // test/content-files.test.js checks those across the whole set
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', vars: 'local' }],
    'prefer-const': 'off',
  },
}));

export default [
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'docs/', 'website/'],
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
  ...contentScriptConfigs,
  {
    files: ['build.js', 'scripts/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
];
