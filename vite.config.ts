import { defineConfig } from 'vite';

export default defineConfig({
  // Other configurations... keep these as they are
  build: {
    // Example settings, maintain existing settings
    outDir: 'dist',
    rollupOptions: {
      input: 'src/main.js',
      output: {
        // Example output settings
        format: 'esm',
      },
    },
    // More build settings if they exist
  },
});