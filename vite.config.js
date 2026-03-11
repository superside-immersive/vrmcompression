import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  assetsInclude: ['**/*.vrm', '**/*.fbx'],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }

          if (id.includes('@react-three/fiber') || id.includes('@react-three/drei') || id.includes('r3f-perf')) {
            return 'react-three';
          }

          if (id.includes('@pixiv/three-vrm')) {
            return 'vrm';
          }

          if (id.includes('three/examples/jsm/loaders') || id.includes('three/examples/jsm/libs')) {
            return 'three-loaders';
          }

          if (id.includes('node_modules/three')) {
            return 'three-core';
          }
        },
      },
    },
  },
});
