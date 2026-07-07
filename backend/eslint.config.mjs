import js from '@eslint/js';
import globals from 'globals';

export default [
  // ---------- Files to skip entirely ----------
  {
    ignores: [
      'node_modules/',
      'coverage/',
      'eslint.config.mjs', 
    ],
  },

  // ---------- Base recommended rules ----------
  js.configs.recommended,

  // ---------- Project-specific config ----------
  {
    files: ['**/*.js'], 
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // ---------- Hygiene ----------
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',

      // ---------- Backend-specific ----------
      'no-console': 'off',
      'no-process-exit': 'off',
      'require-await': 'off',

      // ---------- Style ----------
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
    },
  },
];