import { defineConfig } from 'vite';
import purgeCSSPlugin from 'vite-plugin-purgecss';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    purgeCSSPlugin({
      content: ['./**/*.html', './**/*.js'],
      // Tüm sınıflar JS tarafından dinamik eklendiği için (classList.add/toggle
      // ve BEM modifier'lar) PurgeCSS yanlış pozitif riski yüksek. Aşağıdaki
      // safelist tüm dinamik sınıfları + tüm BEM modifier kalıplarını kapsar.
      safelist: {
        standard: [
          // JS tarafından doğrudan eklenen literal sınıflar
          'active',
          'open',
          'show',
          'visible',
          'scrolled',
          'fade-out',
          'is-out',
          'is-in',
          'in-view',
          'reveal',
          'reveal-delay-1',
          'reveal-delay-2',
          'reveal-delay-3',
          'reveal-delay-4',
          'will-animate',
          'typing',
          'ai-msg--typing',
          'hero__content--hidden',
          'hero__slide--active',
          'hero__slide--bright',
          'hero__slide--transitioning',
          'hero__dot--active',
          'nav__link--active',
          'whatsapp-float',
          'tab-panel',
          'tab',
        ],
        // BEM modifier'lar ve animasyon class'ları için kapsayıcı kalıplar
        deep: [/__/, /--/, /^is-/, /^has-/, /^reveal/, /^advantage-card/, /^toast/, /^intro/],
        greedy: [/__/, /--/],
      },
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
