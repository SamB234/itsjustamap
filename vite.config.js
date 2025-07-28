import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // This tells Vite to pre-bundle mapbox-gl and ensure its workers are handled correctly
    // It can sometimes resolve 'cannot access before initialization' errors related to large libs
    include: ['mapbox-gl'],
    exclude: ['@mapbox/mapbox-gl-geocoder'] // Exclude if you use this, to avoid double-handling
  },
  build: {
    // This can help if assets like mapbox's worker.js are not found
    assetsInclude: ['**/*.css', '**/*.html', '**/*.js'], 
  }
});
