import { defineConfig } from 'vite';
import purgeCSSPlugin from 'vite-plugin-purgecss';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    purgeCSSPlugin({
      content: ['./**/*.html', './**/*.js'],
      safelist: [/active/, /open/, /show/, /hidden/, /hero/, /nav/],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        kurumsal: resolve('kurumsal.html'),
        urunler: resolve('urunler.html'),
        gazbeton: resolve('gazbeton.html'),
        haberler: resolve('haberler.html'),
        insanKaynaklari: resolve('insan-kaynaklari.html'),
        politikalar: resolve('politikalar.html'),
      },
    },
  },
});
