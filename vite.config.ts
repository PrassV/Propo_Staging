import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Default API URL - use environment variable or fallback to Railway URL
  const apiUrl = env.VITE_API_URL || 'https://propostaging-production.up.railway.app';
  
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        }
      }
    },
    define: {
      // Define environment variables for client-side code
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_APP_URL': JSON.stringify(env.VITE_APP_URL || 'https://propo-staging.vercel.app')
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': [
              'react',
              'react-dom',
              'react-router-dom'
            ],
            'vendor-supabase': [
              '@supabase/supabase-js'
            ],
            'vendor-charts': [
              'recharts'
            ],
            'vendor-ui': [
              'lucide-react',
              'react-dropzone',
              'react-hot-toast'
            ],
            'vendor-utils': [
              'uuid'
            ]
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    optimizeDeps: {
      exclude: ['lucide-react']
    }
  };
});
