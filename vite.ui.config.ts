import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { DEFAULT_STUDIO_PORT } from './src/shared/contracts';

const root = fileURLToPath(new URL('.', import.meta.url));
const PRELOAD_FONTS = ['inter-latin-wght-normal.woff2', 'source-serif-4-latin-opsz-normal.woff2'];

function preloadFonts(): Plugin {
  return {
    name: 'studio-preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const assets = Object.values(ctx.bundle ?? {}).filter((item) => item.type === 'asset');
        return PRELOAD_FONTS.flatMap((font) => {
          const asset = assets.find((item) => item.originalFileNames.some((name) => name.endsWith(`/${font}`)));
          if (!asset) return [];
          return [{ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${asset.fileName}`, crossorigin: '' }, injectTo: 'head' as const }];
        });
      },
    },
  };
}

export default defineConfig({
  root,
  plugins: [react(), tailwindcss(), preloadFonts()],
  build: {
    outDir: 'dist/ui',
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: fileURLToPath(new URL('./index.html', import.meta.url)),
      output: {
        manualChunks: (id) => (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id) ? 'react' : undefined),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${DEFAULT_STUDIO_PORT}`,
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
});
