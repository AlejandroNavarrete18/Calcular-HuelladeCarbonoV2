import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

/**
 * Configuración única de ESLint para todo el monorepo.
 * Regla de estilo del proyecto: PROHIBIDO el operador ternario (`cond ? a : b`); usa `if` normales.
 */
export default defineConfig([
  globalIgnores(['**/node_modules/', '**/dist/', '**/coverage/', 'server/.dry-run/']),

  // Reglas comunes a todo el código JavaScript
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
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Permite variables con mayúscula usadas solo en JSX
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
]);
