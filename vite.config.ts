import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            '@supabase/supabase-js',
            'recharts'
          ],
          'ui': [
            'lucide-react',
            'react-dropzone',
            'react-hot-toast'
          ]
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
});
