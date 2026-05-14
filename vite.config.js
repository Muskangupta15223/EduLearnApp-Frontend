import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'react';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }
          if (id.includes('framer-motion')) {
            return 'motion';
          }
          if (id.includes('node_modules/axios')) {
            return 'axios';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/login/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/courses': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/modules': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/lessons': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/enrollments': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/payments': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/notifications': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/quizzes': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/assignments': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/attempts': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/questions': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/submissions': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
