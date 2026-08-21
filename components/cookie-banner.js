/**
 * Arkoz Gazbeton — KVKK Çerez Onayı (opt-in)
 *
 * - Kategoriler: essential (her zaman açık), functional, ai, marketing.
 * - Onay JSON olarak localStorage'da `arkoz_cookie_consent_v2` anahtarında tutulur.
 * - Kullanıcı seçim yapana kadar zorunlu olmayan HİÇBİR kaynak yüklenmez.
 * - Onay değiştiğinde `arkoz:consent-changed` (CustomEvent) yayınlanır; diğer
 *   bileşenler (sohbet asistanı, gömülü video) kendilerini buna göre açar/kapatır.
 * - "Tercihleri Yönet" butonu ve sol alttaki kalıcı "Çerez Tercihleri" bağlantısı
 *   kararın her an değiştirilmesini sağlar — KVKK Çerez Rehberi gereği.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'arkoz_cookie_consent_v2';
  const CONSENT_VERSION = 2;
  const SHOW_DELAY_MS = 900;
  const POLICY_URL = 'politikalar.html';

  // Tercih modalında gösterilen kategoriler. `essential` kanunen her zaman açık.
  const CATEGORIES = [
    {
      id: 'essential',
      title: 'Zorunlu Çerezler',
      desc: 'Sitenin teknik işleyişi için gereklidir: çerez tercihinizin kaydı, açılış animasyonunun oturumda bir kez gösterilmesi ve form güvenliği. İzleme veya profilleme yapmaz, üçüncü taraflarla paylaşılmaz. Devre dışı bırakılamaz.',
      locked: true,
      defaultValue: true,
    },
    {
      id: 'functional',
      title: 'İşlevsel Çerezler',
      desc: 'Yalnızca ana sayfadaki gömülü tanıtım videolarının yüklenmesini sağlar. Kapalıyken video yerine tıklanabilir bir kapak gösterilir ve üçüncü taraf sunucuya hiçbir istek gönderilmez.',
      locked: false,
      defaultValue: false,
    },
    {
      id: 'ai',
      title: 'Yapay Zeka Asistanı',
      desc: 'Sitedeki yapay zeka asistanını etkinleştirir. Kapalıyken asistan sayfaya hiç eklenmez. Açık olsa dahi asistan, ilk açılışında ayrıca onayınızı ister.',
      link: { href: POLICY_URL + '#ai', label: 'Aydınlatma Metni' },
      locked: false,
      defaultValue: false,
    },
    {
      id: 'marketing',
      title: 'Pazarlama ve Analitik',
      desc: 'Şu an bu kategoride hiçbir teknoloji çalışmamaktadır. Açsanız dahi cihazınıza pazarlama veya analitik kaydı yazılmaz. İleride eklenirse bu metin önceden güncellenir.',
      locked: false,
      defaultValue: false,
    },
  ];

  // ---------- Durum ----------

  function defaultConsent() {
    const o = { version: CONSENT_VERSION, timestamp: null };
    CATEGORIES.forEach((c) => {
      o[c.id] = c.defaultValue;
    });
    return o;
  }

  function loadConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== CONSENT_VERSION) return null;
      return parsed;
    } catch (_e) {
      return null;
    }
  }

  function saveConsent(consent) {
    consent.timestamp = new Date().toISOString();
    consent.version = CONSENT_VERSION;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (_e) {
      // localStorage kapalı (gizli mod) — banner sonraki ziyarette yeniden çıkar.
      // KVKK açısından güvenli varsayılan budur.
    }
    window.dispatchEvent(new CustomEvent('arkoz:consent-changed', { detail: consent }));
  }

  // ---------- DOM ----------

  function buildBanner() {
    const wrap = document.createElement('aside');
    wrap.className = 'cb-banner';
    wrap.id = 'arkozCookieBanner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'false');
    wrap.setAttribute('aria-labelledby', 'cb-banner-title');
    wrap.innerHTML = `
      <p class="cb-banner__title" id="cb-banner-title">Çerez Tercihleriniz</p>
      <p class="cb-banner__text">
        Bu sitede reklam ve takip çerezi kullanılmaz. Yalnızca teknik olarak zorunlu
        kayıtlar ile onayınıza bağlı gömülü video ve yapay zeka asistanı bulunur.
        Seçim yapmadığınız sürece zorunlu olmayan hiçbir teknoloji çalıştırılmaz. Detaylar:
        <a href="${POLICY_URL}#cerez">Çerez Politikası</a> ve
        <a href="${POLICY_URL}#kvk">KVKK Aydınlatma Metni</a>.
      </p>
      <div class="cb-banner__actions">
        <button type="button" class="cb-banner__btn cb-banner__btn--reject" data-cb-action="reject">Sadece Zorunlu</button>
        <button type="button" class="cb-banner__btn cb-banner__btn--manage" data-cb-action="manage">Tercihleri Yönet</button>
        <button type="button" class="cb-banner__btn cb-banner__btn--accept" data-cb-action="accept">Tümünü Kabul Et</button>
      </div>
    `;
    return wrap;
  }

  function buildModal(currentConsent) {
    const overlay = document.createElement('div');
    overlay.className = 'cb-modal';
    overlay.id = 'arkozCookieModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cb-modal-title');

    const categoriesHTML = CATEGORIES.map((c) => {
      const checked = currentConsent[c.id] ? 'checked' : '';
      const lockBadge = c.locked ? '<span class="cb-category__lock">Zorunlu</span>' : '';
      const extraLink = c.link
        ? ` <a href="${c.link.href}" target="_blank" rel="noopener">${c.link.label}</a>`
        : '';
      return `
        <div class="cb-category">
          <div class="cb-category__head">
            <h4 class="cb-category__title">${c.title}</h4>
            ${
              c.locked
                ? lockBadge
                : `
              <label class="cb-toggle" aria-label="${c.title}">
                <input type="checkbox" data-cb-category="${c.id}" ${checked} />
                <span class="cb-toggle__slider"></span>
              </label>`
            }
          </div>
          <p class="cb-category__desc">${c.desc}${extraLink}</p>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="cb-modal__panel">
        <div class="cb-modal__header">
          <h3 class="cb-modal__title" id="cb-modal-title">Çerez Tercihleri</h3>
          <button type="button" class="cb-modal__close" data-cb-action="close" aria-label="Kapat">×</button>
        </div>
        <p class="cb-modal__intro">
          Her kategori için ayrı onay verebilirsiniz. Tercihiniz cihazınızda saklanır;
          istediğiniz zaman sol alttaki "Çerez Tercihleri" bağlantısından değiştirebilirsiniz.
          <a href="${POLICY_URL}#kvk" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a>.
        </p>
        ${categoriesHTML}
        <div class="cb-modal__actions">
          <button type="button" class="cb-modal__btn cb-modal__btn--secondary" data-cb-action="reject-all">Tümünü Reddet</button>
          <button type="button" class="cb-modal__btn cb-modal__btn--save" data-cb-action="save">Tercihlerimi Kaydet</button>
        </div>
      </div>
    `;
    return overlay;
  }

  function buildReopenPill() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cb-reopen';
    btn.id = 'arkozCookieReopen';
    btn.setAttribute('aria-label', 'Çerez tercihlerini değiştir');
    btn.textContent = '🍪 Çerez Tercihleri';
    return btn;
  }

  // ---------- Davranış ----------

  function showBanner(banner) {
    setTimeout(() => banner.classList.add('is-visible'), SHOW_DELAY_MS);
  }

  function hideBanner(banner) {
    banner.classList.remove('is-visible');
  }

  function openModal(modal) {
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const firstFocus = modal.querySelector('input:not([disabled]), button[data-cb-action="save"]');
    if (firstFocus) firstFocus.focus();
  }

  function closeModal(modal) {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function readModalState(modal) {
    const consent = defaultConsent();
    CATEGORIES.forEach((c) => {
      if (c.locked) {
        consent[c.id] = true;
      } else {
        const cb = modal.querySelector(`input[data-cb-category="${c.id}"]`);
        consent[c.id] = cb ? !!cb.checked : false;
      }
    });
    return consent;
  }

  function acceptAll() {
    const consent = defaultConsent();
    CATEGORIES.forEach((c) => {
      consent[c.id] = true;
    });
    return consent;
  }

  function rejectAll() {
    const consent = defaultConsent();
    CATEGORIES.forEach((c) => {
      consent[c.id] = c.locked; // yalnızca zorunlu açık kalır
    });
    return consent;
  }

  // ---------- Init ----------

  function init() {
    if (document.getElementById('arkozCookieBanner')) return; // idempotent
    const existing = loadConsent();

    const banner = buildBanner();
    const reopen = buildReopenPill();
    document.body.appendChild(banner);
    document.body.appendChild(reopen);

    let modal = null;

    function ensureModal() {
      if (modal) {
        // Güncel onay değerlerini yansıtmak için yeniden kur
        modal.remove();
      }
      modal = buildModal(loadConsent() || defaultConsent());
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
        const action = e.target.closest('[data-cb-action]');
        if (!action) return;
        const a = action.getAttribute('data-cb-action');
        if (a === 'close') {
          closeModal(modal);
        } else if (a === 'save') {
          saveConsent(readModalState(modal));
          closeModal(modal);
          hideBanner(banner);
          reopen.classList.add('is-visible');
        } else if (a === 'reject-all') {
          saveConsent(rejectAll());
          closeModal(modal);
          hideBanner(banner);
          reopen.classList.add('is-visible');
        }
      });

      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal(modal);
      });
    }

    banner.addEventListener('click', (e) => {
      const action = e.target.closest('[data-cb-action]');
      if (!action) return;
      const a = action.getAttribute('data-cb-action');
      if (a === 'accept') {
        saveConsent(acceptAll());
        hideBanner(banner);
        reopen.classList.add('is-visible');
      } else if (a === 'reject') {
        saveConsent(rejectAll());
        hideBanner(banner);
        reopen.classList.add('is-visible');
      } else if (a === 'manage') {
        ensureModal();
        openModal(modal);
      }
    });

    reopen.addEventListener('click', () => {
      ensureModal();
      openModal(modal);
    });

    if (existing) {
      // Kullanıcı daha önce seçim yapmış — banner gizli kalır, pill görünür.
      reopen.classList.add('is-visible');
      // Geç yüklenen bileşenler kendilerini kurabilsin diye mevcut onayı yeniden yayınla.
      window.dispatchEvent(new CustomEvent('arkoz:consent-changed', { detail: existing }));
    } else {
      // İlk ziyaret — banner göster, onay yok, hiçbir şey yayınlama.
      showBanner(banner);
    }
  }

  // Diğer bileşenler (sohbet asistanı, gömülü video) için küçük okuma yardımcısı.
  window.ArkozConsent = {
    get: () => loadConsent(),
    isGranted: (category) => {
      const c = loadConsent();
      return !!(c && c[category] === true);
    },
    open: () => {
      const reopen = document.getElementById('arkozCookieReopen');
      if (reopen) reopen.click();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
