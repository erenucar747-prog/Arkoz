# CLAUDE.md — Arkoz Gazbeton Web Sitesi Geliştirici Rehberi

Bu dosya, bu repoda çalışan AI asistanlar (Claude Code vb.) için güncel proje bağlamını ve kurallarını içerir.

## Proje Hakkında

**Arkoz Gazbeton** — Türkiye'nin en modern gazbeton üretim tesisinin kurumsal web sitesi.
Havza, Samsun'da faaliyet gösteren şirketin 450.000 m³ kapasiteli tesisini tanıtan, saf HTML/CSS/JS ile yazılmış çok sayfalı bir web sitesidir.

- **Yayın:** GitHub Pages — `main` branch kökünden doğrudan servis edilir (build adımı yok)
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
├── styles.css              # Tüm stiller (6700+ satır, CSS değişkenleri)
├── script.js               # Etkileşimler ve animasyonlar (770+ satır)
├── logo.png                # Arkoz Gazbeton logosu
├── slide1.jpeg             # Hero slider görseli
├── slide2.jpeg             # Hero slider görseli
├── slide3.jpeg             # Hero slider görseli
├── slide4.jpeg             # Hero slider görseli
├── arkoz-konfor-sunar.jpg  # İçerik görseli
├── arkoz-maksimum-yalitim.jpg  # İçerik görseli
├── images/
│   └── factory-1..5.jpg   # Fabrika görselleri
├── assets/
│   ├── css/fonts.css       # Yerel @font-face tanımları (Poppins)
│   ├── fonts/*.woff2       # Poppins latin + latin-ext (12 dosya)
│   └── js/lenis.min.js     # KULLANIM DIŞI — smooth scroll kaldırıldı (takılma nedeniyle, sahibi onayı); geri dönüş için tutuluyor
├── components/
│   ├── cookie-banner.js    # KVKK çerez onayı: banner + granular modal
│   └── cookie-banner.css
├── _arsiv/
│   └── yapay-zeka-asistani/ # SİTEDEN KALDIRILDI — widget JS/CSS + politika sekmesi; hiçbir sayfa yüklemez
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
| 3D / Shader | Saf WebGL / GLSL — harici 3D kütüphanesi kullanılmaz |
| Font | Poppins — **repoda barındırılır** (`assets/fonts/`), harici font isteği yok |
| Deploy | GitHub Pages, `main` branch kökünden |

> **Not:** Yazı tipi repoda barındırılır; sayfa açılışında üçüncü tarafa giden tek istek ana sayfadaki gömülü video oynatıcılarıdır (sahibi kararı: onay beklemeden yüklenir). Yapay zeka asistanı siteden kaldırıldı — kodu `_arsiv/yapay-zeka-asistani/` altında durur, hiçbir sayfadan yüklenmez.

---

## Tasarım Sistemi

### Renkler (CSS değişkenleri — `styles.css`)
- **Birincil:** `#B8A88A` (krem/bej — Arkoz marka rengi)
- **Koyu arka plan bölümleri:** `#0a0a0a`, `#111`
- **Beyaz arka plan bölümleri:** `#ffffff`, `#f8f8f8`
- **Metin (açık zemin):** `#1a1a1a`
- **Metin (koyu zemin):** `#f0f0f0`

### Tipografi
- **Font:** Poppins (300, 400, 500, 600, 700, 800) — yerel `@font-face`, `font-display: swap`
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
7. **Mission** — "Ethereal Beams" shader animasyonu (saf WebGL)
8. **İletişim** — adres, telefon, e-posta

---

## Animasyon Sistemi

Projede birden fazla WebGL/shader animasyonu kullanılmaktadır:

- **Intro ekranı:** Saf WebGL GLSL shader (sin tabanlı dalgalar), logo fade-in; `pageshow` eventi ile her yüklemede tetiklenir
- **Mission bölümü:** "Ethereal Beams" shader (saf WebGL; Three.js bağımlılığı kaldırıldı)
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
- (`gh-pages` branch'i artık kullanılmıyor — yayın doğrudan `main` kökünden)
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
- WebGL: `animate()` döngüsü ile render, `resize` eventi dinlenir

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
3. **Gereksiz dosya oluşturma** — mevcut HTML/CSS/JS ile çalış, yeni yapı kurma
4. **Animasyonları koru** — Shader kodları hassastır; dokunmadan önce tam bağlamı anla
5. **Tüm sayfalarda tutarlılık** — Nav, footer ve stil değişkenleri tüm `.html` dosyalarına yansıtılmalıdır
6. **Yıkıcı eylemler için sor** — Force push, dosya silme veya history sıfırlama öncesinde kullanıcıya sor
7. **Bu dosyayı güncelle** — Önemli yeni yapı veya kurallar eklendiğinde CLAUDE.md'yi güncelle
8. **Kod Kalitesi Araçlarını Kullan** — Kod düzenlemesi (cleanup) veya kod yazımı sonrası mutlaka `npm run format` ile kodu standartlara oturt, `npm run lint` ile hataları kontrol et.

---

## Kullanıcı Tercihleri (Geçmiş Oturumlardan Öğrenildi)

### KESİNLİKLE DOKUNMA
- **Animasyonlar, renkler, görsel efektler** — Blur, WebGL shader, CSS geçişleri, renk değerleri hiçbir şekilde değiştirilmez. Bu kural 2 farklı oturumda revert ile pekiştirildi.
- **`background-attachment: fixed`** `.advantage-card__glow` üzerinde — kaldırma, değiştirme
- **`filter: blur(80px)`** hero blob'larında — değiştirme
- WebGL renderer'larda `antialias`, `pixelRatio` — görsel kalite ayarları dokunulmaz

### YAPILMAZ / GEÇMİŞTE SORUN ÇIKARDI
- API anahtarını doğrudan JS dosyasına yazmak (PR #111-115 döngüsü — chatbot API key sorunu)
- Görsel değişiklik içeren performans optimizasyonu önerileri
- İstenilmeden ek özellik veya "iyileştirme" eklemek

### BAŞARILI TAMAMLANAN ÇALIŞMALAR
- AI chat widget — sunucu tarafı uç nokta üzerinden, tüm sayfalarda (PR #140-147) — **2026-08'de siteden kaldırıldı, kod `_arsiv/` altında**
- Kurumsal sayfa Background Paths animasyonu (PR #136)
- Gazbeton detay sayfası — 9 sekme, tam içerik (PR #117)
- Mobil hero görsel oranı — 49vw/55vw dinamik yükseklik (PR #126-132)
- Banner slaytlarda hero yazılarını gizleme (PR #121-123)
- Performans: `powerPreference:'high-performance'`, `fetchpriority`, `contain:layout style` (görsel değişiklik yok)
