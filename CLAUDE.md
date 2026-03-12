# Arkoz - Proje Rehberi (CLAUDE.md)

## Proje Hakkında

**Arkoz**, modern ve şık bir web sitesidir. Amaç; kullanıcıya etkileyici bir görsel deneyim sunmak, hızlı yüklenmek ve mobil uyumlu olmaktır.

## Dosya Yapısı

```
Arkoz/
├── index.html        # Ana sayfa
├── styles.css        # Tüm stiller (CSS değişkenleri, animasyonlar)
├── script.js         # Etkileşimler ve animasyonlar
├── README.md         # Proje özeti
└── CLAUDE.md         # Bu dosya - geliştirici rehberi
```

## Teknoloji Yığını

- **HTML5** — Semantik markup
- **CSS3** — Custom properties (değişkenler), Flexbox, Grid, animasyonlar
- **Vanilla JS** — Framework bağımlılığı yok, hafif ve hızlı

## Geliştirme Kuralları

### Kodlama Standartları
- BEM metodolojisi ile CSS sınıf isimlendirmesi yapılır
- CSS değişkenleri (`--renk-birincil` gibi) renk ve boyut yönetimi için kullanılır
- JS'de `const`/`let` kullan, `var` kullanma
- Tüm görseller `alt` etiketi içermelidir (erişilebilirlik)

### Tasarım Sistemi
- **Birincil Renk:** `#6C63FF` (mor-mavi)
- **İkincil Renk:** `#FF6584` (pembe)
- **Arka Plan:** `#0D0D0D` (koyu)
- **Metin:** `#F0F0F0` (açık gri)
- **Font:** Inter (Google Fonts)
- **Border Radius:** `12px` (kartlar), `50px` (butonlar)

### Performans
- CSS animasyonları `transform` ve `opacity` kullan (GPU hızlandırma)
- Resimleri optimize et ve lazy load ekle
- JS dosyalarını `defer` ile yükle

### Mobil Öncelikli Yaklaşım
- Breakpoint'ler: `768px` (tablet), `480px` (mobil)
- Dokunma hedefleri minimum `44px` olmalı

## Komutlar

```bash
# Geliştirme sunucusu başlat
npx serve .

# Dosyaları izle (live reload için)
npx browser-sync start --server --files "*.html, *.css, *.js"
```

## Yapılacaklar / Gelecek Özellikler

- [ ] İletişim formu (backend entegrasyonu)
- [ ] Blog/Haberler bölümü
- [ ] Çok dil desteği (TR/EN)
- [ ] Dark/Light mode toggle
- [ ] PWA desteği
