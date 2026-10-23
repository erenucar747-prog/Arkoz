/**
 * Arkoz Gazbeton — Yapay Zeka Asistan Widget
 * - Aynı-origin köprü: istekler yalnızca /api/chat.php adresine gider; dış uç nokta yok.
 * - İki katmanlı kişisel veri kontrolü: tarayıcıda (window.ArkozPII) tespit varsa fetch hiç
 *   çağrılmaz ve metin kutuda kalır; sunucudaki yedek kontrol 422 döndürürse sohbet geçmişi
 *   tamamen sıfırlanır.
 * - Kullanıcı mesajı en fazla 500 karakter; geçmiş yalnızca bellekte, son 20 mesaj.
 * - Yalnızca kanonik üretim alan adında (https://arkozgazbeton.com.tr) kurulur; www dahil başka
 *   hiçbir adreste kurulmaz. window.ArkozPII yoksa hiç kurulmaz (fail-closed).
 * - Çerez tercihlerindeki "Yapay Zeka Asistanı" kategorisi açıksa yüklenir; kategori kapatılınca
 *   (aynı sekmede ya da başka bir sekmede) destroy() ile tamamen kaldırılır.
 * - İlk açılışta bilgilendirme ve açık rıza ekranı; oturum kaydı sessionStorage'da tutulur.
 * - Sayfadan ayrılınca (pagehide) sohbet sıfırlanır.
 */
(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;

  const ENDPOINT = '/api/chat.php';
  const MAX_INPUT_LENGTH = 500;
  const MAX_HISTORY = 20;
  const SEND_DEBOUNCE_MS = 800;
  const TEASER_DELAY_MS = 3000;
  const CONSENT_KEY = 'arkoz_cookie_consent_v2';
  const SESSION_CONSENT_KEY = 'arkoz_ai_session_consent';

  // Yalnızca kanonik alan adı. www ayrı bir origin'dir (çerez tercihi ve oturum kaydı ayrı tutulur);
  // rızanın geri çekilmesi tek origin'de karşılansın diye bilinçli olarak listede yok.
  const ASSISTANT_HOSTS = ['arkozgazbeton.com.tr'];

  const QUICK_ACTIONS = [
    { label: 'Ürün özellikleri', send: 'Ürünlerinizin özellikleri nelerdir?' },
    {
      label: 'Teknik bilgi ve uygulama',
      send: 'Ürünlerinizin teknik değerleri ve uygulaması hakkında bilgi verir misiniz?',
    },
    { label: 'Fiyat teklifi almak istiyorum', local: 'teklif' },
    { label: 'Bayi olmak istiyorum', local: 'bayi' },
  ];

  const LOCAL_REPLIES = {
    teklif:
      'Fiyat teklifi taleplerini sohbet üzerinden almıyoruz; lütfen kişisel bilgilerinizi buraya yazmayın. Teklif için İletişim bölümümüzdeki formu kullanabilir veya 0 (850) 317 55 55 numaralı müşteri hattımızı arayabilirsiniz. Fiyatlar proje ve miktara göre belirlenir.',
    bayi: 'Bayilik başvurularını sohbet üzerinden almıyoruz; lütfen kişisel bilgilerinizi buraya yazmayın. Bayilik için İletişim bölümümüzdeki formu kullanabilir, firma tanıtımınızı info@arkozgazbeton.com.tr adresine gönderebilir veya 0 (850) 317 55 55 numaralı müşteri hattımızı arayabilirsiniz.',
  };

  const SERVER_BLOCKED_FALLBACK =
    'Mesajınız kişisel bir bilgi içerebileceği için yanıtlanmadı ve sunucumuzda kaydedilmedi. Lütfen kişisel bilgilerinizi çıkararak sorunuzu yeniden yazın.';

  const WELCOME_MESSAGE =
    'Merhaba! Ben **Arkoz Gazbeton**’un yapay zeka asistanıyım. Ürünlerimiz ve gazbeton hakkındaki sorularınızı yanıtlayabilirim. Yanıtlarım otomatik olarak üretilir ve bağlayıcı değildir; lütfen kişisel bilgilerinizi yazmayın.';

  // ------------ Saf çekirdek (DOM'suz; testlerde doğrudan kullanılır) ------------
  function isAssistantHost(loc) {
    return !!loc && loc.protocol === 'https:' && ASSISTANT_HOSTS.indexOf(loc.hostname) !== -1;
  }

  function canBoot(win) {
    return (
      !!win &&
      isAssistantHost(win.location) &&
      !!win.ArkozPII &&
      typeof win.ArkozPII.detect === 'function'
    );
  }

  function friendlyError(status) {
    if (status === 429) return 'Çok hızlı yazıyorsunuz, birkaç saniye bekleyip tekrar deneyin.';
    if (status === 403) return 'Bu istek reddedildi. Lütfen sayfayı yenileyip tekrar deneyin.';
    if (status === 400) return 'Mesajınızı anlamadım, lütfen daha kısa yazar mısınız?';
    if (status >= 500) return 'Asistan şu anda yanıt veremiyor, kısa süre sonra tekrar deneyin.';
    return 'Bir hata oluştu, lütfen tekrar deneyin.';
  }

  // Tarayıcıda engellenen mesaj için uyarı metni; liste ORDER sırasıyla LABELS'tan gelir.
  function piiBlockedMessage(types) {
    const pii = root.ArkozPII;
    const order = pii && pii.ORDER ? pii.ORDER : [];
    const labels = pii && pii.LABELS ? pii.LABELS : {};
    const names = order.filter((t) => types.indexOf(t) !== -1).map((t) => labels[t] || t);
    let liste = names[0] || '';
    if (names.length > 1) {
      liste = names.slice(0, -1).join(', ') + ' ve ' + names[names.length - 1];
    }
    return (
      'Mesajınız gönderilmedi: mesajınızda ' +
      liste +
      ' tespit edildi. Lütfen bu bilgiyi silerek sorunuzu yeniden yazın. Size özel teklif veya geri dönüş için İletişim bölümümüzdeki formu kullanabilir ya da 0 (850) 317 55 55 numaralı müşteri hattımızı arayabilirsiniz.'
    );
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Görseller hiçbir zaman <img> olmaz; yalnızca https:// bağlantıya çevrilir.
  function mdToHtml(text) {
    let s = escapeHtml(String(text));
    s = s.replace(
      /!\[([^\]]*?)\]\((https:\/\/[^)\s]+?)\)/g,
      (_m, alt, url) =>
        '<a href="' +
        url +
        '" target="_blank" rel="noopener noreferrer nofollow">' +
        (alt || url) +
        '</a>'
    );
    s = s.replace(
      /\[([^\]]+?)\]\((https:\/\/[^)\s]+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>'
    );
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return s.replace(/\n/g, '<br>');
  }

  function createChatClient(opts) {
    const endpoint = opts.endpoint;
    const fetchImpl = opts.fetchImpl;
    const detect = opts.detect;
    const maxHistory = opts.maxHistory;
    const maxInput = opts.maxInput;

    async function send(history, text) {
      const t = String(text == null ? '' : text).trim();
      if (!t) return { kind: 'empty' };
      if (t.length > maxInput) return { kind: 'too-long' };
      const det = detect(t);
      if (det && det.blocked) return { kind: 'blocked', types: det.types };

      history.push({ role: 'user', content: t });
      while (history.length > maxHistory) history.shift();

      let res;
      try {
        res = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history.slice(-maxHistory) }),
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
        });
      } catch (_e) {
        return { kind: 'error', message: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.' };
      }

      let data = null;
      try {
        data = await res.json();
      } catch (_e) {
        // gövde JSON değil — data null kalır
      }

      if (res.status === 422 || (data && data.blocked === true)) {
        // Sunucu geçmişteki bütün user mesajlarını denetler; sohbetin kalıcı olarak
        // kilitlenmemesi için geçmiş tamamen boşaltılır.
        history.length = 0;
        return {
          kind: 'server-blocked',
          types: (data && data.types) || [],
          message: (data && data.error) || SERVER_BLOCKED_FALLBACK,
        };
      }
      if (!res.ok) {
        return { kind: 'error', message: (data && data.error) || friendlyError(res.status) };
      }
      const reply = data && data.content && data.content[0] && data.content[0].text;
      if (!reply || typeof reply !== 'string') {
        return { kind: 'error', message: 'Boş bir yanıt geldi, lütfen tekrar deneyin.' };
      }
      history.push({ role: 'assistant', content: reply });
      while (history.length > maxHistory) history.shift();
      return { kind: 'ok', reply };
    }

    return { send };
  }

  root.ArkozChatCore = Object.freeze({
    createChatClient,
    mdToHtml,
    isAssistantHost,
    canBoot,
    piiBlockedMessage,
    friendlyError,
    QUICK_ACTIONS,
    LOCAL_REPLIES,
    ENDPOINT,
    MAX_INPUT_LENGTH,
    MAX_HISTORY,
  });

  if (typeof document === 'undefined') return;

  // ------------ DOM / UI ------------
  const LOGO_SRC = (function () {
    // Sayfadaki logo yolunu bul (kök ya da alt yol fark etmez)
    const navLogo = document.querySelector('img[src$="logo.png"]');
    return navLogo ? navLogo.getAttribute('src') : 'logo.png';
  })();

  let initialized = false;
  let resetChat = null;

  function hasSessionConsent() {
    try {
      return sessionStorage.getItem(SESSION_CONSENT_KEY) === '1';
    } catch (_e) {
      return false;
    }
  }

  function setSessionConsent(value) {
    try {
      if (value) sessionStorage.setItem(SESSION_CONSENT_KEY, '1');
      else sessionStorage.removeItem(SESSION_CONSENT_KEY);
    } catch (_e) {
      // sessionStorage kapalı — onay yalnızca bu görünüm boyunca geçerli olur.
    }
  }

  function injectDOM() {
    if (document.getElementById('ai-chat-widget')) return;
    const el = document.createElement('div');
    el.id = 'ai-chat-widget';
    el.innerHTML = `
      <div id="ai-chat-panel" aria-hidden="true" role="dialog" aria-label="Arkoz AI Asistan">
        <div id="ai-chat-header">
          <div id="ai-chat-header-info">
            <img src="${LOGO_SRC}" alt="Arkoz Gazbeton" id="ai-chat-logo" />
            <span id="ai-chat-header-sub">Çevrimiçi — yapay zeka asistan</span>
          </div>
          <div id="ai-chat-header-actions">
            <button id="ai-chat-clear-btn" aria-label="Sohbeti sil" title="Sohbeti sil" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
            <button id="ai-chat-close-btn" aria-label="Kapat" title="Kapat" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div id="ai-chat-messages" aria-live="polite"></div>
        <div id="ai-chat-input-row">
          <input id="ai-chat-input" type="text" placeholder="Mesajınızı yazın…" autocomplete="off" spellcheck="false" enterkeyhint="send" maxlength="${MAX_INPUT_LENGTH}" aria-label="Mesaj"/>
          <span id="ai-chat-counter" aria-live="polite">${MAX_INPUT_LENGTH}</span>
          <button id="ai-chat-send" aria-label="Gönder" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div id="ai-chat-footer">
          <span id="ai-chat-pii-hint">Ad, telefon, e-posta, kimlik numarası gibi kişisel bilgilerinizi yazmayın.</span>
          <strong>Arkoz</strong> Yapay Zeka Asistanı —
          <a href="politikalar.html#ai" target="_blank" rel="noopener">Aydınlatma Metni</a>
        </div>
        <div id="ai-chat-consent" role="dialog" aria-modal="true" aria-label="Yapay Zeka Asistanı Onayı">
          <div id="ai-chat-consent__card" tabindex="-1">
            <h4 id="ai-chat-consent__title">Yapay Zeka Asistanı</h4>
            <p class="ai-chat-consent__text">Bu asistan yapay zeka ile çalışır; yanıtlar otomatik olarak üretilir, bilgilendirme amaçlıdır ve bağlayıcı değildir.</p>
            <p class="ai-chat-consent__text">Sorularınız, yanıt üretilmesi amacıyla yapay zeka hizmet sağlayıcımız tarafından işlenir; IP adresiniz ve tarayıcı bilgileriniz bu kapsamda paylaşılmaz. Sohbet içeriği Şirketimiz tarafından kaydedilmez.</p>
            <p class="ai-chat-consent__text">Lütfen ad-soyad, telefon, e-posta, adres, kimlik, banka veya kart bilgisi ile sağlık, din gibi özel nitelikli kişisel verilerinizi yazmayınız. Telefon numarası, e-posta adresi, T.C. kimlik numarası, IBAN veya vergi kimlik numarası tespit edilen mesajlar gönderilmez.</p>
            <p class="ai-chat-consent__text">Asistanı kullanmak istemezseniz sorularınızı <a href="tel:08503175555">0850 317 55 55</a> numaralı telefonumuzdan, <a href="mailto:info@arkozgazbeton.com.tr">info@arkozgazbeton.com.tr</a> adresinden veya <a href="index.html#iletisim">teklif formumuzdan</a> iletebilirsiniz; sitenin diğer tüm bölümlerini açık rıza vermeden kullanmaya devam edebilirsiniz.</p>
            <label class="ai-chat-consent__check" for="ai-chat-consent-read">
              <input type="checkbox" id="ai-chat-consent-read" />
              <span>Yapay Zeka Asistanı Aydınlatma Metni'ni okudum ve anladım.</span>
            </label>
            <label class="ai-chat-consent__check" for="ai-chat-consent-agree">
              <input type="checkbox" id="ai-chat-consent-agree" />
              <span>Yapay Zeka Asistanı Açık Rıza Metni kapsamında, asistana yazacağım soru metinlerinin yanıt üretilmesi amacıyla yapay zeka hizmet sağlayıcımız tarafından işlenmesine açık rıza veriyorum.</span>
            </label>
            <p id="ai-chat-consent__link">
              <a href="politikalar.html#ai" target="_blank" rel="noopener">Aydınlatma Metni</a>
              <a href="politikalar.html#ai-riza" target="_blank" rel="noopener">Açık Rıza Metni</a>
            </p>
            <div id="ai-chat-consent__actions">
              <button id="ai-chat-consent-accept" type="button" class="ai-chat-consent__btn ai-chat-consent__btn--primary" disabled>Sohbete Başla</button>
              <button id="ai-chat-consent-decline" type="button" class="ai-chat-consent__btn ai-chat-consent__btn--secondary">Vazgeç</button>
            </div>
          </div>
        </div>
      </div>
      <div id="ai-chat-teaser" role="button" tabindex="0" aria-label="Arkoz yapay zeka asistanını aç">
        <p id="ai-chat-teaser-text">
          <strong>Merhaba, ben Gazbo 👋</strong>
          <span id="ai-chat-teaser-role">Arkoz Gazbeton’un kişisel yapay zeka asistanıyım.</span>
        </p>
        <button id="ai-chat-teaser-close" type="button" aria-label="Tanıtımı kapat">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <button id="ai-chat-toggle" aria-label="AI Asistan ile konuş" type="button">
        <svg id="ai-icon-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg id="ai-icon-close" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:none">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    document.body.appendChild(el);
    document.body.classList.add('has-ai-fab');
  }

  // ------------ Çerez tercihi kontrolü ------------
  // "Yapay Zeka Asistanı" kategorisi kapalıyken widget DOM'a hiç girmez.
  function isAIConsented() {
    if (root.ArkozConsent && typeof root.ArkozConsent.isGranted === 'function') {
      return root.ArkozConsent.isGranted('ai');
    }
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return false;
      const c = JSON.parse(raw);
      return !!(c && c.ai === true);
    } catch (_e) {
      return false;
    }
  }

  // ------------ Init ------------
  function init() {
    if (initialized) return;
    initialized = true;

    injectDOM();

    const panel = document.getElementById('ai-chat-panel');
    const msgs = document.getElementById('ai-chat-messages');
    const input = document.getElementById('ai-chat-input');
    const counter = document.getElementById('ai-chat-counter');
    const sendBtn = document.getElementById('ai-chat-send');
    const toggleBtn = document.getElementById('ai-chat-toggle');
    const closeBtn = document.getElementById('ai-chat-close-btn');
    const clearBtn = document.getElementById('ai-chat-clear-btn');
    const iconChat = document.getElementById('ai-icon-chat');
    const iconClose = document.getElementById('ai-icon-close');
    const teaser = document.getElementById('ai-chat-teaser');
    const teaserClose = document.getElementById('ai-chat-teaser-close');
    const consentEl = document.getElementById('ai-chat-consent');
    const consentCard = document.getElementById('ai-chat-consent__card');
    const consentRead = document.getElementById('ai-chat-consent-read');
    const consentAgree = document.getElementById('ai-chat-consent-agree');
    const consentAcceptBtn = document.getElementById('ai-chat-consent-accept');
    const consentDeclineBtn = document.getElementById('ai-chat-consent-decline');

    const history = [];
    let lastSendAt = 0;
    let sending = false;
    let welcomed = false;

    const client = createChatClient({
      endpoint: ENDPOINT,
      fetchImpl: (url, init) => fetch(url, init),
      detect: root.ArkozPII.detect,
      maxHistory: MAX_HISTORY,
      maxInput: MAX_INPUT_LENGTH,
    });

    // ------------ Oturum-içi açık rıza kapısı ------------
    function lockInput(locked) {
      input.disabled = locked;
      sendBtn.disabled = locked;
    }

    function updateConsentButton() {
      consentAcceptBtn.disabled = !(consentRead.checked && consentAgree.checked);
    }

    function showConsentGate() {
      consentEl.classList.add('is-visible');
      panel.classList.add('is-consent');
      lockInput(true);
      setTimeout(() => consentCard.focus({ preventScroll: true }), 60);
    }

    function hideConsentGate() {
      consentEl.classList.remove('is-visible');
      panel.classList.remove('is-consent');
      lockInput(false);
    }

    function showWelcome() {
      if (welcomed) return;
      welcomed = true;
      addMsg(WELCOME_MESSAGE, 'bot');
      renderSuggestions();
    }

    function clearHistory() {
      if (!confirm('Sohbet geçmişini silmek istediğinizden emin misiniz?')) return;
      history.length = 0;
      msgs.innerHTML = '';
      welcomed = false;
      showWelcome();
    }

    // Onay kapısı: kategori kapalıysa widget sökülür, oturum rızası yoksa onay ekranı gösterilir.
    function passesConsentGate() {
      if (!isAIConsented()) {
        destroy();
        return false;
      }
      if (!hasSessionConsent()) {
        showConsentGate();
        return false;
      }
      return true;
    }

    function renderSuggestions() {
      const wrap = document.createElement('div');
      wrap.id = 'ai-chat-suggestions';
      QUICK_ACTIONS.forEach((action) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ai-suggest';
        chip.textContent = action.label;
        chip.addEventListener('click', () => {
          if (action.local) {
            localReply(action);
            return;
          }
          input.value = action.send;
          updateCounter();
          hideSuggestions();
          send();
        });
        wrap.appendChild(chip);
      });
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function hideSuggestions() {
      const w = document.getElementById('ai-chat-suggestions');
      if (w) w.remove();
    }

    // Yerel yanıt: istek atılmaz, geçmişe yazılmaz.
    function localReply(action) {
      if (sending) return;
      if (!passesConsentGate()) return;
      hideSuggestions();
      addMsg(action.label, 'user');
      const d = document.createElement('div');
      d.className = 'ai-msg ai-msg--bot';
      d.textContent = LOCAL_REPLIES[action.local] + ' ';
      const a = document.createElement('a');
      a.href = 'index.html#iletisim';
      a.textContent = 'İletişim formuna git';
      d.appendChild(a);
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }

    // ------------ Teaser (tanıtım baloncuğu) ------------
    function hideTeaser() {
      if (teaser) teaser.classList.remove('is-visible');
    }

    function maybeShowTeaser() {
      // Her sayfa açılışında göster; chat zaten açıksa gösterme.
      if (!teaser) return;
      if (panel.style.display === 'flex') return;
      teaser.classList.add('is-visible');
    }

    function setOpen(open) {
      panel.style.display = open ? 'flex' : 'none';
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      iconChat.style.display = open ? 'none' : 'block';
      iconClose.style.display = open ? 'block' : 'none';
      if (open) {
        hideTeaser();
        if (hasSessionConsent()) {
          hideConsentGate();
          showWelcome();
          setTimeout(() => input.focus(), 50);
        } else {
          showConsentGate();
        }
      } else {
        hideConsentGate();
        // Erişilebilirlik: pencere kapanınca odak açma düğmesine döner.
        if (document.activeElement && panel.contains(document.activeElement)) {
          toggleBtn.focus({ preventScroll: true });
        }
      }
    }

    function addMsg(text, role) {
      const d = document.createElement('div');
      d.className =
        'ai-msg ai-msg--' + (role === 'user' ? 'user' : role === 'error' ? 'error' : 'bot');
      if (role === 'user' || role === 'error') {
        d.textContent = text;
      } else {
        d.innerHTML = mdToHtml(text);
      }
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
      return d;
    }

    function updateCounter() {
      const remaining = MAX_INPUT_LENGTH - input.value.length;
      counter.textContent = remaining;
      counter.classList.toggle('warn', remaining < 50);
    }

    async function send() {
      if (sending) return;
      if (!passesConsentGate()) return;
      const text = input.value.trim();
      if (!text) return;

      const now = Date.now();
      if (now - lastSendAt < SEND_DEBOUNCE_MS) return;
      lastSendAt = now;

      if (text.length > MAX_INPUT_LENGTH) {
        addMsg('Mesajınız çok uzun (en fazla ' + MAX_INPUT_LENGTH + ' karakter).', 'error');
        return;
      }

      // Tarayıcı kişisel veri kontrolü: tespit varsa istek hiç atılmaz, metin kutuda kalır.
      const det = root.ArkozPII.detect(text);
      if (det.blocked) {
        addMsg(piiBlockedMessage(det.types), 'error');
        return;
      }

      input.value = '';
      updateCounter();
      hideSuggestions();
      sending = true;
      lockInput(true);

      const userEl = addMsg(text, 'user');
      const typing = addMsg('Yazıyor…', 'bot');
      typing.classList.add('ai-msg--typing');

      try {
        const r = await client.send(history, text);
        if (r.kind === 'ok') {
          typing.innerHTML = mdToHtml(r.reply);
          typing.classList.remove('ai-msg--typing');
        } else if (r.kind === 'server-blocked' || r.kind === 'blocked') {
          typing.remove();
          userEl.remove();
          input.value = text;
          updateCounter();
          addMsg(r.kind === 'blocked' ? piiBlockedMessage(r.types) : r.message, 'error');
        } else {
          typing.remove();
          addMsg(r.message || friendlyError(0), 'error');
        }
      } finally {
        sending = false;
        lockInput(false);
        input.focus();
        msgs.scrollTop = msgs.scrollHeight;
      }
    }

    // ------------ Events ------------
    toggleBtn.addEventListener('click', function () {
      setOpen(panel.style.display !== 'flex');
    });
    closeBtn.addEventListener('click', function () {
      setOpen(false);
    });
    // Erişilebilirlik: Escape pencereyi (onay ekranı dahil) kapatır; onay kaydı yazılmaz.
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    });
    clearBtn.addEventListener('click', clearHistory);
    sendBtn.addEventListener('click', send);
    input.addEventListener('input', updateCounter);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    // Teaser: baloncuğa tıkla → chat aç; X → sadece baloncuğu kapat.
    if (teaser) {
      teaser.addEventListener('click', function () {
        setOpen(true);
      });
      teaser.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(true);
        }
      });
    }
    if (teaserClose) {
      teaserClose.addEventListener('click', function (e) {
        e.stopPropagation();
        hideTeaser();
      });
    }

    // İki kutucuk da işaretlenmeden "Sohbete Başla" pasif kalır.
    consentRead.addEventListener('change', updateConsentButton);
    consentAgree.addEventListener('change', updateConsentButton);
    consentAcceptBtn.addEventListener('click', function () {
      if (!(consentRead.checked && consentAgree.checked)) return;
      setSessionConsent(true);
      hideConsentGate();
      showWelcome();
      setTimeout(() => input.focus(), 50);
    });
    consentDeclineBtn.addEventListener('click', function () {
      setSessionConsent(false);
      consentRead.checked = false;
      consentAgree.checked = false;
      consentAcceptBtn.disabled = true;
      setOpen(false);
    });

    // Sayfadan ayrılınca sohbet sıfırlanır (geri/ileri önbelleğinden dönüşte eski sohbet görünmez).
    resetChat = function () {
      history.length = 0;
      msgs.innerHTML = '';
      input.value = '';
      updateCounter();
      welcomed = false;
      setOpen(false);
    };

    updateCounter();

    // Sayfa yüklendikten 3sn sonra tanıtım baloncuğunu göster (her açılışta).
    setTimeout(maybeShowTeaser, TEASER_DELAY_MS);
  }

  // ------------ Teardown ------------
  function destroy() {
    const widget = document.getElementById('ai-chat-widget');
    if (widget) widget.remove();
    document.body.classList.remove('has-ai-fab');
    setSessionConsent(false);
    initialized = false;
    resetChat = null;
  }

  // ------------ Açılış, kapanış ve sekmeler arası tutarlılık (host kapısının arkasında) ------------
  function maybeBoot() {
    if (!canBoot(root)) return;
    if (isAIConsented()) init();
    else setSessionConsent(false);
  }

  // Kategori sonradan açılırsa yükle, kapatılırsa tamamen söküp at.
  root.addEventListener('arkoz:consent-changed', function (e) {
    if (!canBoot(root)) return;
    if (e && e.detail && e.detail.ai) init();
    else destroy();
  });

  // Başka bir sekmede kategori değişince bu sekmedeki widget da açılır/kapanır.
  root.addEventListener('storage', function (e) {
    if (!canBoot(root)) return;
    if (e.key !== CONSENT_KEY && e.key !== null) return;
    if (isAIConsented()) init();
    else destroy();
  });

  // Geri/ileri önbelleğinden dönüşte kategori kapalıysa widget kaldırılır.
  root.addEventListener('pageshow', function (e) {
    if (!canBoot(root)) return;
    if (e && e.persisted && !isAIConsented()) destroy();
  });

  // Sayfadan ayrılırken sohbet sıfırlanır.
  root.addEventListener('pagehide', function () {
    if (resetChat) resetChat();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeBoot);
  } else {
    maybeBoot();
  }
})();
