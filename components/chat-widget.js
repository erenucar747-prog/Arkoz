/**
 * Arkoz Gazbeton — Yapay Zeka Asistan Widget
 * - System prompt sunucu tarafında (güvenlik: frontend prompt sızdırmıyor)
 * - Input length 1000 chars, history son 20 mesaj
 * - 800ms send debounce, kullanıcı dostu hata mesajları
 * - Çerez tercihleri "ai" kategorisi açıksa widget yüklenir; ayrıca asistan
 *   açıldığında oturuma özel iç onay ekranı gösterilir (sessionStorage gate).
 */
(function () {
  'use strict';

  const API = 'https://arkoz-ai.vercel.app/api/chat';
  const MAX_INPUT_LENGTH = 1000;
  const MAX_HISTORY = 20;
  const SEND_DEBOUNCE_MS = 800;
  const CONSENT_KEY = 'arkoz_cookie_consent_v2';
  const SESSION_CONSENT_KEY = 'arkoz_ai_session_consent';

  const SUGGESTED_QUESTIONS = [
    'Arkoz Blok özellikleri nelerdir?',
    'Gazbetonun deprem güvenliğine katkısı?',
    'ISO sertifikalarınız neler?',
    'Bayi listesi nedir?',
    'Teklif nasıl alabilirim?',
    'Üretim kapasiteniz ne kadar?',
  ];
  const LOGO_SRC = (function () {
    // Find existing logo path on the page (works whether root or subpath)
    const navLogo = document.querySelector('img[src$="logo.png"]');
    return navLogo ? navLogo.getAttribute('src') : 'logo.png';
  })();

  // ------------ DOM Injection ------------
  function injectDOM() {
    if (document.getElementById('ai-chat-widget')) return;
    const root = document.createElement('div');
    root.id = 'ai-chat-widget';
    root.innerHTML = `
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
        <div id="ai-chat-messages"></div>
        <div id="ai-chat-input-row">
          <input id="ai-chat-input" type="text" placeholder="Mesajınızı yazın…" autocomplete="off" maxlength="${MAX_INPUT_LENGTH}" aria-label="Mesaj"/>
          <span id="ai-chat-counter" aria-live="polite">${MAX_INPUT_LENGTH}</span>
          <button id="ai-chat-send" aria-label="Gönder" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div id="ai-chat-footer">
          <strong>Arkoz</strong> Yapay Zeka Asistan —
          <a href="politikalar.html#ai" target="_blank" rel="noopener">Aydınlatma Metni</a>
        </div>

        <div id="ai-chat-consent" role="dialog" aria-modal="true" aria-label="Yapay Zeka Asistan Onayı">
          <div id="ai-chat-consent__card">
            <h4 id="ai-chat-consent__title">Yapay Zeka Asistan</h4>
            <p id="ai-chat-consent__text">
              Bilgileriniz yapay zeka asistanı tarafından işlenmektedir.
              Kabul ediyor musunuz?
            </p>
            <p id="ai-chat-consent__link">
              <a href="politikalar.html#ai" target="_blank" rel="noopener">Aydınlatma Metni →</a>
            </p>
            <div id="ai-chat-consent__actions">
              <button id="ai-chat-consent-decline" type="button" class="ai-chat-consent__btn ai-chat-consent__btn--secondary">Vazgeç</button>
              <button id="ai-chat-consent-accept" type="button" class="ai-chat-consent__btn ai-chat-consent__btn--primary">Kabul Et</button>
            </div>
          </div>
        </div>
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
    document.body.appendChild(root);
    document.body.classList.add('has-ai-fab');
  }

  // ------------ Markdown rendering (safe) ------------
  function mdToHtml(text) {
    let s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    s = s.replace(
      /!\[([^\]]*?)\]\((https?:\/\/[^)]+?)\)/g,
      '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin-top:6px;display:block;">'
    );
    s = s.replace(
      /\[([^\]]+?)\]\((https?:\/\/[^)]+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  // ------------ Init ------------
  let initialized = false;
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
    const consentEl = document.getElementById('ai-chat-consent');
    const consentAcceptBtn = document.getElementById('ai-chat-consent-accept');
    const consentDeclineBtn = document.getElementById('ai-chat-consent-decline');
    const iconChat = document.getElementById('ai-icon-chat');
    const iconClose = document.getElementById('ai-icon-close');

    const history = [];
    let lastSendAt = 0;
    let sending = false;
    let welcomed = false;

    function showWelcome() {
      if (welcomed) return;
      welcomed = true;
      addMsg(
        'Merhaba! Ben **Arkoz Gazbeton**’un yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?',
        'bot'
      );
      renderSuggestions();
    }

    function clearHistory() {
      if (!confirm('Sohbet geçmişini silmek istediğinizden emin misiniz?')) return;
      history.length = 0;
      msgs.innerHTML = '';
      welcomed = false;
      showWelcome();
    }

    function renderSuggestions() {
      const wrap = document.createElement('div');
      wrap.id = 'ai-chat-suggestions';
      SUGGESTED_QUESTIONS.forEach((q) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ai-suggest';
        chip.textContent = q;
        chip.addEventListener('click', () => {
          input.value = q;
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
        // sessionStorage unavailable — non-fatal
      }
    }

    function showConsentGate() {
      consentEl.classList.add('is-visible');
      setTimeout(() => {
        const acceptBtn = document.getElementById('ai-chat-consent-accept');
        if (acceptBtn) acceptBtn.focus();
      }, 60);
    }

    function hideConsentGate() {
      consentEl.classList.remove('is-visible');
    }

    function setOpen(open) {
      panel.style.display = open ? 'flex' : 'none';
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      iconChat.style.display = open ? 'none' : 'block';
      iconClose.style.display = open ? 'block' : 'none';
      if (open) {
        if (hasSessionConsent()) {
          hideConsentGate();
          showWelcome();
          setTimeout(() => input.focus(), 50);
        } else {
          showConsentGate();
        }
      } else {
        hideConsentGate();
      }
    }

    function addMsg(text, role) {
      const d = document.createElement('div');
      d.className =
        'ai-msg ai-msg--' + (role === 'user' ? 'user' : role === 'error' ? 'error' : 'bot');
      if (role === 'user') {
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

    function friendlyError(status) {
      if (status === 429) return 'Çok hızlı yazıyorsunuz, birkaç saniye bekleyip tekrar deneyin.';
      if (status === 403) return 'Bu istek reddedildi. Lütfen sayfayı yenileyip tekrar deneyin.';
      if (status === 400) return 'Mesajınızı anlamadım, lütfen daha kısa yazar mısınız?';
      if (status >= 500) return 'Asistan şu anda yanıt veremiyor, kısa süre sonra tekrar deneyin.';
      return 'Bir hata oluştu, lütfen tekrar deneyin.';
    }

    async function send() {
      if (sending) return;
      const text = input.value.trim();
      if (!text) return;

      const now = Date.now();
      if (now - lastSendAt < SEND_DEBOUNCE_MS) return;
      lastSendAt = now;

      if (text.length > MAX_INPUT_LENGTH) {
        addMsg('Mesajınız çok uzun (en fazla ' + MAX_INPUT_LENGTH + ' karakter).', 'error');
        return;
      }

      input.value = '';
      updateCounter();
      hideSuggestions();
      sending = true;
      sendBtn.disabled = true;
      input.disabled = true;

      addMsg(text, 'user');
      history.push({ role: 'user', content: text });
      while (history.length > MAX_HISTORY) history.shift();

      const typing = addMsg('Yazıyor…', 'bot');
      typing.classList.add('ai-msg--typing');

      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
        });

        if (!res.ok) {
          typing.remove();
          let serverMsg = '';
          try {
            const data = await res.json();
            serverMsg = data && data.error ? data.error : '';
          } catch (_) {}
          addMsg(serverMsg || friendlyError(res.status), 'error');
          return;
        }

        const data = await res.json();
        if (data.error) {
          typing.remove();
          addMsg(data.error, 'error');
          return;
        }
        const reply = (data.content && data.content[0] && data.content[0].text) || '';
        if (!reply) {
          typing.remove();
          addMsg('Boş bir yanıt geldi, lütfen tekrar deneyin.', 'error');
          return;
        }
        typing.innerHTML = mdToHtml(reply);
        typing.classList.remove('ai-msg--typing');
        history.push({ role: 'assistant', content: reply });
        while (history.length > MAX_HISTORY) history.shift();
      } catch (_e) {
        typing.remove();
        addMsg('Bağlantı hatası. İnternet bağlantınızı kontrol edin.', 'error');
      } finally {
        sending = false;
        sendBtn.disabled = false;
        input.disabled = false;
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
    clearBtn.addEventListener('click', clearHistory);
    sendBtn.addEventListener('click', send);
    input.addEventListener('input', updateCounter);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    if (consentAcceptBtn) {
      consentAcceptBtn.addEventListener('click', function () {
        setSessionConsent(true);
        hideConsentGate();
        showWelcome();
        setTimeout(() => input.focus(), 50);
      });
    }
    if (consentDeclineBtn) {
      consentDeclineBtn.addEventListener('click', function () {
        setSessionConsent(false);
        setOpen(false);
      });
    }

    updateCounter();
  }

  function destroy() {
    const widget = document.getElementById('ai-chat-widget');
    if (widget) widget.remove();
    document.body.classList.remove('has-ai-fab');
    initialized = false;
  }

  // ------------ Çerez Onayı Kontrolü ------------
  function isAIConsented() {
    if (window.ArkozConsent && typeof window.ArkozConsent.isGranted === 'function') {
      return window.ArkozConsent.isGranted('ai');
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

  function maybeBoot() {
    if (isAIConsented()) init();
  }

  window.addEventListener('arkoz:consent-changed', function (e) {
    const granted = !!(e && e.detail && e.detail.ai);
    if (granted) init();
    else destroy();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeBoot);
  } else {
    maybeBoot();
  }
})();
