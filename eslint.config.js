import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['**/node_modules/', '**/dist/', '**/coverage/', 'server/.dry-run/']),

  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    rules: {
      'no-ternary': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // Código que corre en Node.js: servidor, paquete compartido y archivos de configuración
  {
    files: ['server/**/*.js', 'shared/**/*.js', '*.js', 'client/vite.config.js'],
    languageOptions: { globals: globals.node },
  },

  // Interfaz web (React, corre en el navegador)
  {
    files: ['client/**/*.{js,jsx}'],
    ignores: ['client/vite.config.js'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
]);
