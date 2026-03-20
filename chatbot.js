/**
 * ARKOZ GAZBETON — AI Chatbot
 *
 * ⚠️  GÜVENLİK UYARISI:
 *     API anahtarı şu an kaynak kodda görünür durumda.
 *     Cloudflare Workers kurulduğunda anahtarı sunucu tarafına taşıyın!
 *
 * Kurulum:
 *   1. Aşağıdaki API_KEY satırına Anthropic API anahtarınızı yazın.
 *   2. Tüm HTML sayfalarına <script src="chatbot.js" defer></script> ekleyin.
 */

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════
  //  ⚙️  YAPILANDIRMA  —  API anahtarınızı buraya yazın
  // ══════════════════════════════════════════════════════════
  var CFG = {
    apiKey:    'BURAYA_API_ANAHTARINI_YAZ',  // ← GitHub'da doğrudan düzenle
    model:     'claude-haiku-4-5',
    maxTokens: 800,
  };

  // ══════════════════════════════════════════════════════════
  //  🧠  SİSTEM PROMPTU  —  Arkoz AI eğitimi
  // ══════════════════════════════════════════════════════════
  var SYSTEM = [
    'Sen Arkoz Gazbeton\'un resmi yapay zeka asistanısın. Adın "Arkoz AI".',
    'Türkçe konuşursun. Samimi, profesyonel ve yardımseversin.',
    '',
    '## ŞİRKET BİLGİLERİ',
    '- Şirket: Arkoz Gazbeton',
    '- Bağlı olduğu holding: Arkoz Holding',
    '- Konum: Bekdiğin Mah. Havza OSB Cd. No:18/1, Havza / Samsun / Türkiye',
    '- Özellik: Türkiye\'nin en yeni ve en modern gazbeton üretim tesisi',
    '- Kapasite: 450.000 m³/yıl',
    '',
    '## İLETİŞİM BİLGİLERİ',
    '- Telefon: 0 (850) 317 55 55',
    '- WhatsApp: 0538 865 82 89',
    '- E-posta: info@arkozgazbeton.com.tr',
    '- Adres: Bekdiğin Mah. Havza OSB Cd. No:18/1, Havza - Samsun',
    '- Facebook: facebook.com/arkozgazbeton',
    '- Instagram: instagram.com/arkozgazbeton',
    '- LinkedIn: linkedin.com/company/arkoz-gazbeton',
    '',
    '## MİSYON & VİZYON',
    '- Misyon: Beklentilerin ötesine geçen hizmet ve kalite. Yüksek kaliteli, maliyet avantajı sağlayan ve çevre dostu ürünlerle müşteri odaklı çözümler.',
    '- Vizyon: Türkiye\'nin lider yapı ürünleri tedarikçisi olmak.',
    '- Değerler: Sürdürülebilirlik, çevre dostu üretim, insan odaklı yaklaşım, yenilikçilik.',
    '',
    '## ARKOZ HOLDİNG HAKKINDA',
    'Türkiye, Gürcistan, Azerbaycan, Nahçıvan ve Çek Cumhuriyeti\'nde faaliyet gösteren uluslararası şirketler topluluğu.',
    'Ağrı Çimento Fabrikası da Arkoz Holding bünyesindedir (yıllık ~1 milyon ton çimento kapasitesi).',
    'Kaliteli ürün üretmeyi, yerel kaynakları harekete geçirmeyi ve araştırmayı sosyal sorumluluk olarak benimser.',
    '',
    '## ÜRÜN 1: ARKOZ BLOK',
    'Tanım: Mineral esaslı, yanmaz, yüksek ısı yalıtımlı gazbeton duvar bloku.',
    'Kullanım: İç duvar, dış duvar ve yangın duvarı uygulamaları.',
    'Standart: TS-EN 771-4',
    'Yangın Sınıfı: A1 (tamamen yanmaz)',
    'Uzunluk: 60 cm (tüm sınıflarda sabit)',
    'Yükseklik seçenekleri: 20 cm, 25 cm, 50 cm',
    'Kalınlık seçenekleri (cm): 5 - 7,5 - 8,5 - 10 - 12,5 - 13,5 - 15 - 17,5 - 20 - 25 - 30 - 40',
    '',
    'Sınıflar ve teknik özellikler:',
    '- G1 300: Yoğunluk 330 kg/m³ | Isı iletkenlik λ = 0,085 W/mK | Basınç 15 kgf/cm²',
    '- G2 350: Yoğunluk 350 kg/m³ | λ = 0,09 W/mK | Basınç 20 kgf/cm²',
    '- G2 400: Yoğunluk 400 kg/m³ | λ = 0,11 W/mK | Basınç 25 kgf/cm²',
    '- G2 500: Yoğunluk 475-500 kg/m³ | λ = 0,13 W/mK | Basınç 25 kgf/cm²',
    '- G3 500: Yoğunluk 500 kg/m³ | λ = 0,13 W/mK | Basınç 35 kgf/cm²',
    '- G4 600: Yoğunluk 600 kg/m³ | λ = 0,16 W/mK | Basınç 50 kgf/cm²',
    '',
    'Not: En düşük ısı iletkenlik = G1 300 (0,085 W/mK) → en iyi yalıtım.',
    'En yüksek basınç dayanımı = G4 600 (50 kgf/cm²) → en sağlam sınıf.',
    '',
    'Palet bilgileri (Yükseklik 25 cm örnekleri):',
    '- 5 cm kalınlık:  192 blok/palet | 28,8 m²/palet',
    '- 10 cm kalınlık:  96 blok/palet | 14,4 m²/palet',
    '- 12,5 cm kalınlık: 80 blok/palet | 12,0 m²/palet',
    '- 15 cm kalınlık:  56 blok/palet |  8,4 m²/palet',
    '- 20 cm kalınlık:  48 blok/palet |  7,2 m²/palet',
    '- 25 cm kalınlık:  40 blok/palet |  6,0 m²/palet',
    '- 30 cm kalınlık:  32 blok/palet |  4,8 m²/palet',
    '- 40 cm kalınlık:  24 blok/palet |  3,6 m²/palet',
    '',
    '## ÜRÜN 2: ARKOZ ASMOLEN',
    'Tanım: Döşemelerde kullanılan gazbeton dolgu malzemesi.',
    'Kullanım: Asmolen döşeme sistemi dolgu elemanı.',
    'Yangın Sınıfı: A1 (tamamen yanmaz)',
    '',
    'Teknik özellikler:',
    '- En: 30 - 50 cm',
    '- Boy: 60 cm',
    '- Kalınlık: 15 - 35 cm',
    '- Basınç Dayanımı: 1,5 N/mm²',
    '- Kuru Birim Hacim Ağırlığı: 300 kg/m³',
    '',
    'Avantajlar:',
    '- Betondan %20\'ye kadar tasarruf sağlar.',
    '- Yüzey düzgünlüğü sayesinde sıvadan da tasarruf.',
    '- Isı ve ses yalıtımı sağlar.',
    '- Kolay uygulama ile yapı sürecini hızlandırır.',
    '',
    '## GAZBETON\'UN GENEL AVANTAJLARI',
    '1. Isı Yalıtımı: Düşük ısı iletim katsayısı ile enerji tasarrufu.',
    '2. Deprem Güvenliği: Hafif yapısı ile deprem yüklerini minimize eder, yapı güvenliğini artırır.',
    '3. Yangın Dayanımı: A1 sınıfı — tamamen yanmaz. Yangın duvarı çözümleri için uygundur.',
    '4. Ses Yalıtımı: Yüksek ses yalıtım performansı ile konforlu mekanlar.',
    '5. Kolay Uygulama: Hafif ve kolay işlenebilir; inşaatı hızlandırır, işçilik maliyetini azaltır.',
    '6. Yüksek Dayanım: Uzun ömürlü ve güvenilir yapı malzemesi.',
    '7. Çevre Dostu: İnsan sağlığına ve çevreye dost üretim; yeşil bina standartlarına uygun.',
    '8. Değer Katar: Yapıya uzun vadeli değer kazandırır.',
    '',
    '## DAVRANIŞ KURALLARI',
    '- Türkçe konuş. Samimi ama profesyonel ol.',
    '- Fiyat sorusunda şunu söyle: "Güncel fiyat bilgisi için 0 (850) 317 55 55 numaralı hattımızı arayabilir veya WhatsApp\'tan (0538 865 82 89) ulaşabilirsiniz."',
    '- Ürün seçim tavsiyesinde kullanım amacını sor (iç duvar mı, dış duvar mı, döşeme mi vb.).',
    '- Emin olmadığın teknik detaylar için iletişim numarasına yönlendir.',
    '- Cevapları kısa ve anlaşılır tut. Teknik sorularda madde madde listele.',
    '- Sana başka şirketler ya da rakipler hakkında soru sorulursa kibar bir şekilde sadece Arkoz hakkında bilgi verebileceğini belirt.',
  ].join('\n');

  // ══════════════════════════════════════════════════════════
  //  🎨  CSS
  // ══════════════════════════════════════════════════════════
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '#arkoz-chat-toggle{',
      'position:fixed;bottom:28px;right:28px;',
      'width:62px;height:62px;border-radius:50%;',
      'background:#B8A88A;border:none;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'box-shadow:0 4px 24px rgba(0,0,0,.28);',
      'z-index:9998;transition:transform .2s,box-shadow .2s;',
    '}',
    '#arkoz-chat-toggle:hover{transform:scale(1.09);box-shadow:0 6px 32px rgba(0,0,0,.38);}',

    '#arkoz-chat-panel{',
      'position:fixed;bottom:106px;right:28px;',
      'width:370px;height:540px;',
      'background:#fff;border-radius:18px;',
      'box-shadow:0 8px 52px rgba(0,0,0,.22);',
      'z-index:9999;display:flex;flex-direction:column;overflow:hidden;',
      'transform:scale(.85) translateY(20px);opacity:0;pointer-events:none;',
      'transition:transform .28s cubic-bezier(.34,1.56,.64,1),opacity .2s;',
    '}',
    '#arkoz-chat-panel.ac-open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}',

    /* Header */
    '.ac-header{background:#0a0a0a;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}',
    '.ac-avatar{width:38px;height:38px;border-radius:50%;background:#B8A88A;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;}',
    '.ac-hinfo{flex:1;}',
    '.ac-hname{color:#fff;font-weight:700;font-size:.88rem;font-family:Inter,sans-serif;}',
    '.ac-hstatus{color:#B8A88A;font-size:.7rem;font-family:Inter,sans-serif;}',
    '.ac-close-btn{background:none;border:none;color:#777;cursor:pointer;padding:4px;border-radius:6px;line-height:1;transition:color .2s;}',
    '.ac-close-btn:hover{color:#fff;}',

    /* Messages */
    '.ac-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f7f7f7;}',
    '.ac-msgs::-webkit-scrollbar{width:3px;}',
    '.ac-msgs::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px;}',

    '.ac-bubble{max-width:83%;padding:10px 14px;border-radius:14px;font-size:.865rem;line-height:1.55;font-family:Inter,sans-serif;word-break:break-word;white-space:pre-wrap;}',
    '.ac-bot{background:#fff;color:#1a1a1a;border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 5px rgba(0,0,0,.09);}',
    '.ac-user{background:#B8A88A;color:#fff;border-bottom-right-radius:4px;align-self:flex-end;}',
    '.ac-typing{background:#fff;align-self:flex-start;border-bottom-left-radius:4px;box-shadow:0 1px 5px rgba(0,0,0,.09);padding:12px 16px;}',

    /* Typing dots */
    '.ac-dots{display:inline-flex;gap:5px;align-items:center;}',
    '.ac-dots span{width:7px;height:7px;background:#B8A88A;border-radius:50%;animation:acBounce 1.2s infinite;}',
    '.ac-dots span:nth-child(2){animation-delay:.2s;}',
    '.ac-dots span:nth-child(3){animation-delay:.4s;}',
    '@keyframes acBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}',

    /* Quick buttons */
    '.ac-quick{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px 10px;background:#f7f7f7;}',
    '.ac-qbtn{background:#fff;border:1.5px solid #B8A88A;color:#7a6040;padding:5px 12px;border-radius:16px;font-size:.76rem;cursor:pointer;font-family:Inter,sans-serif;transition:background .15s,color .15s;white-space:nowrap;}',
    '.ac-qbtn:hover{background:#B8A88A;color:#fff;}',

    /* Footer */
    '.ac-footer{padding:10px 12px;background:#fff;border-top:1px solid #eee;display:flex;gap:8px;flex-shrink:0;}',
    '.ac-input{flex:1;border:1.5px solid #e0e0e0;border-radius:22px;padding:9px 15px;font-size:.875rem;font-family:Inter,sans-serif;outline:none;resize:none;transition:border-color .2s;background:#f8f8f8;max-height:90px;overflow-y:auto;}',
    '.ac-input:focus{border-color:#B8A88A;background:#fff;}',
    '.ac-send-btn{width:40px;height:40px;border-radius:50%;background:#B8A88A;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:flex-end;transition:background .2s,transform .15s;}',
    '.ac-send-btn:hover{background:#a09070;transform:scale(1.08);}',
    '.ac-send-btn:disabled{background:#ccc;cursor:default;transform:none;}',

    /* Mobile */
    '@media(max-width:440px){',
      '#arkoz-chat-panel{right:10px;bottom:88px;width:calc(100vw - 20px);height:72vh;}',
      '#arkoz-chat-toggle{bottom:16px;right:16px;}',
    '}',
  ].join('');
  document.head.appendChild(styleEl);

  // ══════════════════════════════════════════════════════════
  //  🏗️  HTML
  // ══════════════════════════════════════════════════════════
  var wrapper = document.createElement('div');
  wrapper.innerHTML = [
    '<button id="arkoz-chat-toggle" aria-label="Arkoz AI Asistan">',
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      '</svg>',
    '</button>',

    '<div id="arkoz-chat-panel" role="dialog" aria-modal="true" aria-label="Arkoz AI Asistan">',

      '<div class="ac-header">',
        '<div class="ac-avatar">🤖</div>',
        '<div class="ac-hinfo">',
          '<div class="ac-hname">Arkoz AI Asistan</div>',
          '<div class="ac-hstatus">● Çevrimiçi</div>',
        '</div>',
        '<button class="ac-close-btn" id="arkoz-chat-close" aria-label="Kapat">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
            '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
          '</svg>',
        '</button>',
      '</div>',

      '<div class="ac-msgs" id="ac-msgs"></div>',

      '<div class="ac-quick" id="ac-quick">',
        '<button class="ac-qbtn">Arkoz Blok nedir?</button>',
        '<button class="ac-qbtn">Hangi kalınlık seçenekleri var?</button>',
        '<button class="ac-qbtn">Asmolen nedir?</button>',
        '<button class="ac-qbtn">Fiyat bilgisi</button>',
        '<button class="ac-qbtn">İletişim bilgileri</button>',
        '<button class="ac-qbtn">Isı yalıtımı</button>',
      '</div>',

      '<div class="ac-footer">',
        '<textarea class="ac-input" id="ac-input" placeholder="Mesajınızı yazın..." rows="1" maxlength="500"></textarea>',
        '<button class="ac-send-btn" id="ac-send" aria-label="Gönder">',
          '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">',
            '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
          '</svg>',
        '</button>',
      '</div>',

    '</div>',
  ].join('');
  document.body.appendChild(wrapper);

  // ══════════════════════════════════════════════════════════
  //  ⚡  MANTIK
  // ══════════════════════════════════════════════════════════
  var panel     = document.getElementById('arkoz-chat-panel');
  var toggle    = document.getElementById('arkoz-chat-toggle');
  var closeBtn  = document.getElementById('arkoz-chat-close');
  var msgsEl    = document.getElementById('ac-msgs');
  var inputEl   = document.getElementById('ac-input');
  var sendBtn   = document.getElementById('ac-send');
  var quickEl   = document.getElementById('ac-quick');

  var history   = [];
  var isOpen    = false;
  var isLoading = false;

  /* Aç / kapat */
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('ac-open', isOpen);
    if (isOpen && history.length === 0) addWelcome();
    if (isOpen) setTimeout(function () { inputEl.focus(); }, 300);
  }
  toggle.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  /* Hoşgeldin */
  function addWelcome() {
    addBot('Merhaba! Ben Arkoz Gazbeton\'un AI asistanıyım. 👋\n\nÜrünlerimiz, teknik özellikler ve şirketimiz hakkında her türlü sorunuzu yanıtlayabilirim. Size nasıl yardımcı olabilirim?');
  }

  /* Hızlı butonlar */
  var qbtns = quickEl.querySelectorAll('.ac-qbtn');
  qbtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (isLoading) return;
      sendMsg(btn.textContent.trim());
    });
  });

  /* Textarea auto-resize */
  inputEl.addEventListener('input', function () {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + 'px';
  });

  /* Enter = gönder, Shift+Enter = satır */
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  sendBtn.addEventListener('click', handleSend);

  function handleSend() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendMsg(text);
  }

  async function sendMsg(text) {
    if (isLoading) return;
    quickEl.style.display = 'none';       // hızlı butonları gizle
    addUser(text);
    history.push({ role: 'user', content: text });

    var typingEl = addTyping();
    isLoading = true;
    sendBtn.disabled = true;

    try {
      var reply = await callAPI(history);
      typingEl.remove();
      addBot(reply);
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      typingEl.remove();
      addBot('Üzgünüm, bir sorun oluştu. Lütfen tekrar deneyin veya 0 (850) 317 55 55 numaralı hattımızı arayın.');
      console.error('[Arkoz Chatbot]', err);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  async function callAPI(messages) {
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CFG.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      CFG.model,
        max_tokens: CFG.maxTokens,
        system:     SYSTEM,
        messages:   messages,
      }),
    });

    if (!res.ok) {
      var err = {};
      try { err = await res.json(); } catch (_) {}
      throw new Error((err.error && err.error.message) || ('HTTP ' + res.status));
    }

    var data = await res.json();
    return data.content[0].text;
  }

  /* Mesaj ekleme yardımcıları */
  function addUser(text) {
    var el = document.createElement('div');
    el.className = 'ac-bubble ac-user';
    el.textContent = text;
    msgsEl.appendChild(el);
    scrollBot();
  }

  function addBot(text) {
    var el = document.createElement('div');
    el.className = 'ac-bubble ac-bot';
    el.textContent = text;
    msgsEl.appendChild(el);
    scrollBot();
    return el;
  }

  function addTyping() {
    var el = document.createElement('div');
    el.className = 'ac-typing';
    el.innerHTML = '<div class="ac-dots"><span></span><span></span><span></span></div>';
    msgsEl.appendChild(el);
    scrollBot();
    return el;
  }

  function scrollBot() {
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

})();
