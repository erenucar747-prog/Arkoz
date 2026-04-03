# Arkoz Gazbeton — Kurumsal Web Sitesi

Türkiye'nin en modern gazbeton üretim tesisinin kurumsal web sitesi. Havza, Samsun'da faaliyet gösteren **Arkoz Gazbeton**'un 450.000 m³ kapasiteli tesisini tanıtan, saf HTML/CSS/JS ile yazılmış çok sayfalı bir web sitesidir.

**Canlı Site:** [GitHub Pages üzerinden yayınlanmaktadır]

---

## Sayfalar

| Dosya | Açıklama |
|-------|----------|
| `index.html` | Ana sayfa — hero slider, gazbeton tanıtımı, ürünler, iletişim |
| `kurumsal.html` | Kurumsal sayfa — hakkımızda, misyon, vizyon |
| `urunler.html` | Ürünler — Arkoz Blok ve Asmolen teknik tablolar |
| `gazbeton.html` | Gazbeton nedir? detay sayfası |
| `haberler.html` | Haberler ve duyurular |
| `insan-kaynaklari.html` | İnsan Kaynakları |
| `politikalar.html` | Gizlilik, çerez ve diğer politikalar |

---

## Teknoloji Yığını

- **Markup:** HTML5 (semantik, `lang="tr"`)
- **Stil:** CSS3 — custom properties, Flexbox, Grid, animasyonlar (`styles.css`)
- **Etkileşim:** Vanilla JavaScript — framework bağımlılığı yok (`script.js`)
- **3D / Shader:** Three.js r128 (CDN) — WebGL shader animasyonları
- **Font:** Inter (Google Fonts)
- **Deploy:** GitHub Actions → GitHub Pages (`gh-pages` branch)

---

## Dosya Yapısı

```
Arkoz/
├── index.html
├── kurumsal.html
├── urunler.html
├── gazbeton.html
├── haberler.html
├── insan-kaynaklari.html
├── politikalar.html
├── styles.css
├── script.js
├── logo.png
├── slide1.jpeg
├── slide2.jpeg
├── slide3.jpeg
├── slide4.jpeg
├── arkoz-konfor-sunar.jpg
├── arkoz-maksimum-yalitim.jpg
├── images/
│   ├── factory-1.jpg
│   ├── factory-2.jpg
│   ├── factory-3.jpg
│   ├── factory-4.jpg
│   └── factory-5.jpg
├── components/            # Referans bileşenler (React/TSX — kullanılmaz)
│   ├── glowing-effect-demo.tsx
│   └── ui/
│       └── glowing-effect.tsx
├── lib/
│   └── utils.ts
├── README.md
└── CLAUDE.md
```

---

## Yerel Geliştirme

```bash
# Yerel sunucu başlat
npx serve .

# Ya da live reload ile
npx browser-sync start --server --files "*.html, *.css, *.js"
```

---

## Tasarım Sistemi

- **Birincil renk:** `#B8A88A` (krem/bej — Arkoz marka rengi)
- **Font:** Inter (300–900)
- **CSS metodolojisi:** BEM (`blok__element--modifier`)
- **Kartlar:** `border-radius: 12px`
- **Butonlar:** `border-radius: 50px`

---

## Deploy

`main` branch'e yapılan her push, GitHub Actions aracılığıyla `gh-pages` branch'ine otomatik olarak deploy edilir.
