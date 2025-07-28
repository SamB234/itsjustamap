import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Keep this one to ensure NODE_ENV is defined for various libraries
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    // This is still important for Mapbox GL JS pre-bundling
    include: ['mapbox-gl'] 
  },
  server: {
    // Keep this one if you need to access your dev server from external IPs or within Docker/Render environments
    host: true 
  }
});
