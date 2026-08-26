# Arşiv — Yapay Zeka Asistanı

Bu klasördeki kod **web sitesinde çalışmaz**. Asistan, sahibi kararıyla siteden kaldırıldı;
kod yalnızca ileride geri alınabilsin diye burada tutulur. Hiçbir HTML sayfası bu klasörden
dosya yüklemez; yayın iş akışı (`.github/workflows/deploy.yml`) klasörü yayın dışı bırakır.

## İçerik

| Dosya                        | Eski yeri                    | Açıklama                                                   |
| ---------------------------- | ---------------------------- | ---------------------------------------------------------- |
| `chat-widget.js`             | `components/chat-widget.js`  | Sohbet paneli, oturum içi onay ekranı, sunucu uç noktası çağrısı |
| `chat-widget.css`            | `components/chat-widget.css` | Widget stilleri                                            |
| `politikalar-ai-sekmesi.html`| `politikalar.html`           | "AI Asistan ve Veri İşleme" sekmesi (aydınlatma + açık rıza metni) |
| `kaldirma.diff`              | —                            | Kaldırma işleminin tam `git diff` çıktısı — bayt bayt geri alma için |

Sunucu tarafı uç nokta ayrı depodadır: `erenucar747-prog/Arkoz-ai` (`api/chat.js`). Bu depo
kaldırılmadı; yalnızca site artık ona istek atmaz.

## En kısa geri alma yolu

`kaldirma.diff`, kaldırma sırasında değişen 16 dosyanın tamamını (widget JS/CSS'inin tam
içeriği dâhil) içerir. Site o günkü hâlindeyse tek komutla geri alınır:

```bash
git apply -R _arsiv/yapay-zeka-asistani/kaldirma.diff
```

Site sonradan değiştiyse diff uygulanmayabilir; o zaman aşağıdaki liste elle izlenir.

## Siteden kaldırılan diğer parçalar (geri alırken eklenmeli)

1. **7 HTML sayfası** — `</body>` öncesi, çerez bileşeninden sonra:
   ```html
   <!-- AI Chat Widget (shared component) -->
   <link rel="stylesheet" href="components/chat-widget.css" />
   <script src="components/chat-widget.js" defer></script>
   ```
2. **`components/cookie-banner.js`** — `CATEGORIES` dizisine `functional` ile `marketing`
   arasına eklenir:
   ```js
   {
     id: 'ai',
     title: 'Yapay Zeka Asistanı',
     desc: 'Web sitemizdeki yapay zeka asistanı hizmetini etkinleştirir. Kapalıyken asistan yüklenmez. Açık olsa dahi asistan, ilk açılışında ayrıca onayınızı ister.',
     link: { href: POLICY_URL + '#ai', label: 'Aydınlatma Metni' },
     locked: false,
     defaultValue: false,
   },
   ```
   Banner metni de asistanı anacak şekilde güncellenir ("onayınıza bağlı tek teknoloji yapay
   zeka asistanıdır ve siz onaylamadıkça çalıştırılmaz").
3. **`politikalar.html`** — çerez tablosuna `arkoz_ai_session_consent` satırı (oturum
   depolaması, sekme kapanınca silinir, kategori: Yapay Zeka Asistanı) ve "Onay Kategorileri"
   bölümüne asistan paragrafı; "üç kategori" → "dört kategori".
4. **`styles.css`** — `@media print` gizleme listesine `#ai-chat-widget,`.
5. **`vite.config.js`** — PurgeCSS safelist'e `'ai-msg--typing'` (ve eski `'typing'` girdisi;
   ikisi de widget'ın "Yazıyor…" balonuna aitti).
6. **`script.js`** — Lenis yapılandırmasındaki `prevent` seçeneği (Lenis zaten kullanım dışı;
   geri alınırsa `node.closest('#ai-chat-widget')` ile widget içinde kaydırmayı serbest bırakır).
7. **`components/cookie-banner.css`** — mobilde çerez banner'ının asistan düğmesiyle
   çakışmasını önleyen kural (widget `body`'ye `has-ai-fab` sınıfını ekler):
   ```css
   @media (max-width: 560px) {
     body.has-ai-fab .cb-banner {
       bottom: 86px;
     }
   }
   ```

## Hukuki not

Asistan kaldırıldığı için sitede oturum depolaması anahtarı `arkoz_ai_session_consent`
yazılmaz ve sohbet mesajı hiçbir yere gönderilmez. Çerez politikası ve aydınlatma metinleri
buna göre güncellendi; asistan geri alınırsa metinlerin de geri alınması gerekir.
