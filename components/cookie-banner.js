/**
 * Arkoz Gazbeton — KVKK Cookie Consent (opt-in)
 *
 * - Categories: essential (always on), functional, ai (yapay zeka asistanı),
 *   marketing (reserved for future).
 * - Persists JSON consent in localStorage as `arkoz_cookie_consent_v2`.
 * - Until the user makes a choice, NO non-essential script is initialized.
 * - Dispatches `arkoz:consent-changed` (CustomEvent) so other components (e.g.
 *   chat-widget) can gate themselves on the AI category.
 * - "Tercihleri Yönet" button (and the small reopen pill in the corner) lets
 *   users change their decision at any time — required by KVKK Çerez Rehberi.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'arkoz_cookie_consent_v2';
  const CONSENT_VERSION = 2;
  const SHOW_DELAY_MS = 900;
  const POLICY_URL = 'politikalar.html';

  // Categories shown in the preferences modal. `essential` is always-on by law.
  const CATEGORIES = [
    {
      id: 'essential',
      title: 'Zorunlu Çerezler',
      desc: 'Sitenin temel işleyişi (oturum yönetimi, çerez tercih kaydı, intro animasyon kontrolü) için gereklidir. Devre dışı bırakılamaz.',
      locked: true,
      defaultValue: true,
    },
    {
      id: 'functional',
      title: 'İşlevsel Çerezler',
      desc: 'Tercihlerinizi (görsel ayarlar, sayfa içi gezinme yumuşatması) hatırlamak ve site kullanımını kolaylaştırmak için kullanılır.',
      locked: false,
      defaultValue: true,
    },
    {
      id: 'ai',
      title: 'AI Asistan ve Yurt Dışı Veri Aktarımı',
      desc: 'Web sitemizdeki yapay zeka asistanı hizmetini etkinleştirir. Kapalıyken asistan yüklenmez. Detay için Aydınlatma Metni.',
      locked: false,
      defaultValue: false,
    },
    {
      id: 'marketing',
      title: 'Pazarlama ve Analitik',
      desc: 'Site içeriğini ve kampanyaları kişiselleştirmek için ileride eklenebilecek üçüncü taraf çerezler (örn. analitik araçlar). Şu an pasiftir.',
      locked: false,
      defaultValue: false,
    },
  ];

  // ---------- State ----------

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
      // localStorage unavailable (private mode) — fall through. The banner will
      // simply re-appear next visit, which is the safer default for KVKK.
    }
    window.dispatchEvent(
      new CustomEvent('arkoz:consent-changed', { detail: consent })
    );
  }

  // ---------- DOM Injection ----------

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
        Bu site, deneyiminizi geliştirmek için çerez ve benzer teknolojiler kullanır.
        Çerez tercihinizi seçiniz; onayınız olmadan zorunlu olmayan hiçbir çerez
        yüklenmez. Detaylar:
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
      const disabled = c.locked ? 'disabled' : '';
      const lockBadge = c.locked
        ? '<span class="cb-category__lock">Zorunlu</span>'
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
                <input type="checkbox" data-cb-category="${c.id}" ${checked} ${disabled} />
                <span class="cb-toggle__slider"></span>
              </label>`
            }
          </div>
          <p class="cb-category__desc">${c.desc}</p>
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
          <a href="${POLICY_URL}#kvkk" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a>.
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

  // ---------- Behavior ----------

  function showBanner(banner) {
    setTimeout(() => banner.classList.add('is-visible'), SHOW_DELAY_MS);
  }

  function hideBanner(banner) {
    banner.classList.remove('is-visible');
  }

  function openModal(modal) {
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const firstFocus = modal.querySelector(
      'input:not([disabled]), button[data-cb-action="save"]'
    );
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
      consent[c.id] = c.locked; // only essential stays true
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
        // Rebuild to reflect current consent values
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
          const c = readModalState(modal);
          saveConsent(c);
          closeModal(modal);
          hideBanner(banner);
          reopen.classList.add('is-visible');
        } else if (a === 'reject-all') {
          const c = rejectAll();
          saveConsent(c);
          closeModal(modal);
          hideBanner(banner);
          reopen.classList.add('is-visible');
        }
      });

      // Esc closes modal
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal(modal);
      });
    }

    banner.addEventListener('click', (e) => {
      const action = e.target.closest('[data-cb-action]');
      if (!action) return;
      const a = action.getAttribute('data-cb-action');
      if (a === 'accept') {
        const c = acceptAll();
        saveConsent(c);
        hideBanner(banner);
        reopen.classList.add('is-visible');
      } else if (a === 'reject') {
        const c = rejectAll();
        saveConsent(c);
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
      // User already chose — keep banner hidden, show reopen pill so they can revisit.
      reopen.classList.add('is-visible');
      // Re-broadcast current consent so late-loading components can initialize.
      window.dispatchEvent(
        new CustomEvent('arkoz:consent-changed', { detail: existing })
      );
    } else {
      // First visit — show banner, do NOT broadcast (no consent yet).
      showBanner(banner);
    }
  }

  // Expose a tiny read-only helper for other components (e.g. chat-widget).
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
