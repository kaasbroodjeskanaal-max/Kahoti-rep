import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Obfuscation, security & hardening optimizations
    build: {
      // 1. Strictly disable source map files, completely blocking reverse-engineering from browser inspect tools.
      sourcemap: false,
      // 2. Enable aggressive minification config to mangle, shrink, compress, and flatten variables, classes, and helper states.
      minify: 'esbuild' as const,
      cssMinify: true,
      // 3. Clear warnings and guarantee a monolithic compiler asset path
      chunkSizeWarningLimit: 1500,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
