/**
 * Arkoz Gazbeton — KVKK Cookie Consent (read-only state)
 *
 * NOT: Çerez onay banner'ı, tercih modalı ve köşedeki "Çerez Tercihleri" reopen
 * pill'i UX'ten kaldırıldı. Bu modül artık HİÇBİR DOM enjekte etmez — yalnızca
 * daha önce kaydedilmiş onayı (localStorage `arkoz_cookie_consent_v2`) okuyan
 * read-only bir yardımcı sunar (geriye dönük uyumluluk). Açılışta hiçbir şey
 * render edilmez.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'arkoz_cookie_consent_v2';
  const CONSENT_VERSION = 2;

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

  // DOM'a dokunmayan, zararsız read-only yardımcı (geriye dönük uyumluluk).
  window.ArkozConsent = {
    get: () => loadConsent(),
    isGranted: (category) => {
      const c = loadConsent();
      return !!(c && c[category] === true);
    },
  };
})();
