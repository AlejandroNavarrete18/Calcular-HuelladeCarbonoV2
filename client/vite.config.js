import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DEFAULT_API_TARGET = 'http://localhost:3001';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET || DEFAULT_API_TARGET;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: { '/api': apiTarget },
    },
  };
});
