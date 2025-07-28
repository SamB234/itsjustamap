import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.MAPBOX_ACCESS_TOKEN': JSON.stringify(process.env.MAPBOX_ACCESS_TOKEN || 'YOUR_MAPBOX_ACCESS_TOKEN'), 
  },
  optimizeDeps: {
    include: ['mapbox-gl'] 
  },
  server: {
    host: true 
  }
});
