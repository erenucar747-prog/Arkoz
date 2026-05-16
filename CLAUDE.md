# CLAUDE.md — Arkoz Gazbeton Web Sitesi Geliştirici Rehberi

Bu dosya, bu repoda çalışan AI asistanlar (Claude Code vb.) için güncel proje bağlamını ve kurallarını içerir.

## Proje Hakkında

**Arkoz Gazbeton** — Türkiye'nin en modern gazbeton üretim tesisinin kurumsal web sitesi.
Havza, Samsun'da faaliyet gösteren şirketin 450.000 m³ kapasiteli tesisini tanıtan, saf HTML/CSS/JS ile yazılmış çok sayfalı bir web sitesidir.

- **Yayın:** GitHub Pages (`gh-pages` branch üzerinden otomatik deploy)
- **Durum:** Aktif geliştirme — 74+ PR ile düzenli güncellemeler yapılmaktadır

---

## Dosya Yapısı

```
Arkoz/
├── index.html              # Ana sayfa (hero slider, gazbeton, ürünler, iletişim)
├── kurumsal.html           # Kurumsal sayfa (hakkımızda, misyon, vizyon)
├── urunler.html            # Ürünler sayfası (Blok, Asmolen — teknik tablolar)
├── gazbeton.html           # Gazbeton detay sayfası
├── haberler.html           # Haberler sayfası
├── insan-kaynaklari.html   # İnsan Kaynakları sayfası
├── politikalar.html        # Politikalar sayfası (gizlilik, çerez vb.)
├── styles.css              # Tüm stiller (1800+ satır, CSS değişkenleri)
├── script.js               # Etkileşimler ve animasyonlar (660+ satır)
├── logo.png                # Arkoz Gazbeton logosu
├── slide1.jpeg             # Hero slider görseli
├── slide2.jpeg             # Hero slider görseli
├── slide3.jpeg             # Hero slider görseli
├── slide4.jpeg             # Hero slider görseli
├── arkoz-konfor-sunar.jpg  # İçerik görseli
├── arkoz-maksimum-yalitim.jpg  # İçerik görseli
├── images/
│   └── factory-1..5.jpg   # Fabrika görselleri
├── components/
│   ├── glowing-effect-demo.tsx   # Shadcn/React referans bileşeni
│   └── ui/
│       └── glowing-effect.tsx    # Glowing border efekt bileşeni
├── lib/
│   └── utils.ts                  # Yardımcı fonksiyonlar
├── README.md
└── CLAUDE.md               # Bu dosya
```

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Markup | HTML5 (semantik, `lang="tr"`) |
| Stil | CSS3 — custom properties, Flexbox, Grid, animasyonlar |
| Etkileşim | Vanilla JavaScript — framework bağımlılığı yok |
| 3D / Shader | Three.js r128 (CDN) — WebGL shader animasyonları |
| Font | Inter (Google Fonts) |
| Deploy | GitHub Actions → GitHub Pages (`gh-pages` branch) |

> **Not:** `components/` klasöründe `.tsx` dosyaları referans amaçlı bulunmaktadır; projenin kendisi React kullanmamaktadır. Glowing efekt saf CSS/JS ile uygulanmıştır.

---

## Tasarım Sistemi

### Renkler (CSS değişkenleri — `styles.css`)
- **Birincil:** `#B8A88A` (krem/bej — Arkoz marka rengi)
- **Koyu arka plan bölümleri:** `#0a0a0a`, `#111`
- **Beyaz arka plan bölümleri:** `#ffffff`, `#f8f8f8`
- **Metin (açık zemin):** `#1a1a1a`
- **Metin (koyu zemin):** `#f0f0f0`

### Tipografi
- **Font:** Inter (300, 400, 600, 700, 900)
- **Başlık vurgusu:** `.hero__title--gradient` — beyaz veya krem renk geçişi

### Bileşenler
- **Kartlar:** `border-radius: 12px`
- **Butonlar:** `border-radius: 50px`, `.btn--primary` / `.btn--secondary`
- **CSS Sınıf Metodolojisi:** BEM (`blok__element--modifier`)

---

## Sayfa Bölümleri (index.html)

1. **Header/Nav** — sticky, scroll'da `scrolled` class alır; burger menü (mobil)
2. **Hero** — video + görsel slider, fade geçiş, ok ve nokta navigasyonu
3. **Intro** — WebGL shader animasyonu (saf GLSL, Three.js kaldırıldı)
4. **Gazbeton** — gazbeton nedir, avantajlar bölümü
5. **Ürünler** — Arkoz Blok ve Asmolen ürün kartları
6. **Kurumsal** — şirket hakkında kısa tanıtım
7. **Mission** — Three.js "Ethereal Beams" shader animasyonu
8. **İletişim** — adres, telefon, e-posta

---

## Animasyon Sistemi

Projede birden fazla WebGL/shader animasyonu kullanılmaktadır:

- **Intro ekranı (v3):** GSAP timeline ile SVG seedling → tree → logo sekansı (~2.7s); `script.js` `initIntro()` IIFE'de implement edilir. GSAP CDN bağımlılığı; CDN yoksa basit logo fade-in fallback. SessionStorage anahtarı `arkoz_intro_v3`. `?intro=force` query ile dev bypass. Sadece homepage'de, `prefers-reduced-motion: reduce` ise tamamen atlanır. Marka renkleri korunur — `--c-accent` (yeşil) + intro-spesifik toprak tonu `#92745b`.
- **Mission bölümü:** Three.js `MeshStandardMaterial.onBeforeCompile` ile "Ethereal Beams" shader; PMREMGenerator ile env map (sol taraf karanlığını giderir)
- **Kurumsal hero:** GodRays WebGL shader (köşegen ışık huzmesi, koyu zemin)
- **Politikalar hero:** Background Paths SVG animasyonu (21st.dev stili)
- **Ürünler hero:** `page-hero` yöntemi (politikalar ile aynı)
- **Glowing border:** `.advantage-card` üzerinde CSS mask + JS ile çapraz tarayıcı desteği

---

## Git Workflow

```bash
# Feature branch oluştur
git checkout -b claude/<açıklama>-<SESSION_ID>

# Belirli dosyaları ekle (git add -A kullanma)
git add index.html styles.css

# Commit mesajı
git commit -m "feat: açıklayıcı mesaj"

# Push
git push -u origin claude/<açıklama>-<SESSION_ID>
```

### Branch Yapısı
- `main` — üretim kodu (GitHub Pages kaynağı)
- `gh-pages` — otomatik build çıktısı (Actions tarafından yönetilir)
- `claude/<açıklama>-<SESSION_ID>` — özellik/düzeltme branch'leri

### Commit Mesaj Kuralları (Conventional Commits)

| Prefix | Kullanım |
|--------|----------|
| `feat:` | Yeni özellik |
| `fix:` | Hata düzeltme |
| `docs:` | Belgeleme değişikliği |
| `refactor:` | Davranış değiştirmeden kod düzenlemesi |
| `style:` | CSS/görsel değişiklikler |
| `chore:` | Build, araç, bağımlılık güncellemeleri |

---

## Kodlama Standartları

### CSS
- CSS değişkenleri `:root` içinde tanımlıdır
- Animasyonlarda `transform` ve `opacity` kullan (GPU hızlandırma)
- Breakpoint'ler: `768px` (tablet), `480px` (mobil)
- `@keyframes` animasyonları dosyanın ilgili bölümünde tutulur

### JavaScript
- `const`/`let` kullan, `var` kullanma
- Tüm DOM sorguları `DOMContentLoaded` içinde veya sonrasında yapılır
- `null` kontrolü yap: `if (!element) return;`
- Three.js nesneleri: `animate()` döngüsü ile render, `resize` eventi dinlenir

### HTML
- Tüm `<img>` etiketlerinde `alt` ve `loading="lazy"` bulunmalı
- Erişilebilirlik: `aria-label`, `aria-hidden` gerekli yerlerde kullanılır
- `<script>` etiketleri `defer` ile veya `</body>` öncesinde yüklenir

---

## Geliştirme Ortamı & Araçlar

Proje artık profesyonel Vite, Prettier ve ESLint araç zincirine sahiptir. Tümü için `package.json` üzerinden npm script'leri tanımlıdır.

```bash
# Yerel geliştirme sunucusu başlat (Vite - Anında live reload)
npm run dev

# Kodu otomatik formatla (Prettier)
npm run format

# Kodda kullanılmayan değişkenleri ve hataları bul (ESLint)
npm run lint

# Üretime (Production) hazır, gereksiz CSS'leri silinmiş paket oluştur
npm run build
```

---

## Güvenlik Kuralları

- Gizli bilgi, API anahtarı veya `.env` dosyası commit'leme
- `--no-verify` ile hook'ları atlatma
- Harici form/backend eklenirse tüm kullanıcı girdilerini doğrula

---

## AI Asistan Talimatları

1. **Önce oku** — Düzenlemeden önce ilgili dosyayı her zaman oku
2. **Minimal değişiklik** — Yalnızca istenen değişikliği yap, kapsam genişletme
3. **Gereksiz dosya oluşturma** — `.tsx` bileşenleri referans amaçlıdır; yeni HTML/CSS/JS ile çalış
4. **Animasyonları koru** — Shader ve Three.js kodları hassastır; dokunmadan önce tam bağlamı anla
5. **Tüm sayfalarda tutarlılık** — Nav, footer ve stil değişkenleri tüm `.html` dosyalarına yansıtılmalıdır
6. **Yıkıcı eylemler için sor** — Force push, dosya silme veya history sıfırlama öncesinde kullanıcıya sor
7. **Bu dosyayı güncelle** — Önemli yeni yapı veya kurallar eklendiğinde CLAUDE.md'yi güncelle
8. **Kod Kalitesi Araçlarını Kullan** — Kod düzenlemesi (cleanup) veya kod yazımı sonrası mutlaka `npm run format` ile kodu standartlara oturt, `npm run lint` ile hataları kontrol et.

---

## Kullanıcı Tercihleri (Geçmiş Oturumlardan Öğrenildi)

### KESİNLİKLE DOKUNMA
- **Animasyonlar, renkler, görsel efektler** — Blur, WebGL shader, Three.js, CSS geçişleri, renk değerleri hiçbir şekilde değiştirilmez. Bu kural 2 farklı oturumda revert ile pekiştirildi.
- **`background-attachment: fixed`** `.advantage-card__glow` üzerinde — kaldırma, değiştirme
- **`filter: blur(80px)`** hero blob'larında — değiştirme
- WebGL renderer'larda `antialias`, `pixelRatio` — görsel kalite ayarları dokunulmaz

### YAPILMAZ / GEÇMİŞTE SORUN ÇIKARDI
- API anahtarını doğrudan JS dosyasına yazmak (PR #111-115 döngüsü — chatbot API key sorunu)
- Görsel değişiklik içeren performans optimizasyonu önerileri
- İstenilmeden ek özellik veya "iyileştirme" eklemek

### BAŞARILI TAMAMLANAN ÇALIŞMALAR
- AI chat widget — Vercel proxy üzerinden, tüm sayfalarda (PR #140-147)
- Kurumsal sayfa Background Paths animasyonu (PR #136)
- Gazbeton detay sayfası — 9 sekme, tam içerik (PR #117)
- Mobil hero görsel oranı — 49vw/55vw dinamik yükseklik (PR #126-132)
- Banner slaytlarda hero yazılarını gizleme (PR #121-123)
- Performans: `powerPreference:'high-performance'`, `fetchpriority`, `contain:layout style` (görsel değişiklik yok)
