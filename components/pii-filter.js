/**
 * Arkoz Gazbeton — Tarayıcı kişisel veri filtresi
 * - Kalıp tabanlı tespit: T.C. kimlik numarası, telefon, IBAN, e-posta, bağlamlı vergi no.
 * - Tespit varsa mesaj tarayıcıdan hiç çıkmaz (widget fetch çağırmaz); maskeleme yok.
 * - Şirketin kendi hatları ve kurumsal e-posta adresi muaf tutulur.
 * - DOM ve konsol kullanılmaz; sonuç `window.ArkozPII` altında dondurulmuş olarak sunulur.
 * - Sunucudaki yedek filtreyle aynı 44 vektörde aynı sonucu üretir (tests/pii-vectors.json).
 */
(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;

  const ORDER = ['tckn', 'telefon', 'iban', 'eposta', 'vkn'];
  const EXEMPT_PHONES = ['8503175555', '5388658289']; // şirketin kendi hatları (ulusal 10 hane)
  const EXEMPT_EMAILS = ['info@arkozgazbeton.com.tr']; // şirketin kurumsal adresi
  const LABELS = {
    tckn: 'T.C. kimlik numarası',
    telefon: 'telefon numarası',
    iban: 'IBAN',
    eposta: 'e-posta adresi',
    vkn: 'vergi kimlik numarası',
  };

  function tcknValid(d) {
    if (!/^[1-9][0-9]{10}$/.test(d)) return false;
    const n = d.split('').map(Number);
    const odd = n[0] + n[2] + n[4] + n[6] + n[8];
    const even = n[1] + n[3] + n[5] + n[7];
    const d10 = (((odd * 7 - even) % 10) + 10) % 10;
    if (d10 !== n[9]) return false;
    return n.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === n[10];
  }

  function nationalPhone(d) {
    if (d.startsWith('0090')) return d.slice(4);
    if (d.startsWith('90') && d.length === 12) return d.slice(2);
    if (d.startsWith('0') && d.length === 11) return d.slice(1);
    return d;
  }

  /* eslint-disable no-useless-escape -- referans desenler sunucu filtresiyle birebir aynı metindir */
  function detect(text) {
    const s = String(text);
    const found = new Set();
    let m;
    // Regex nesneleri HER çağrıda yeniden oluşturulur (/g lastIndex tuzağı).
    const TC = /(^|[^0-9])([1-9](?: ?[0-9]){10})(?![0-9])/g;
    while ((m = TC.exec(s))) if (tcknValid(m[2].replace(/[^0-9]/g, ''))) found.add('tckn');
    const PH =
      /(^|[^0-9+])((?:(?:\+|00) ?90|90)?[ .\-]?\(?0?\)?[ .\-]?\(?[2-5][0-9]{2}\)?[ .\-]?[0-9]{3}[ .\-]?[0-9]{2}[ .\-]?[0-9]{2})(?![0-9])/g;
    while ((m = PH.exec(s)))
      if (EXEMPT_PHONES.indexOf(nationalPhone(m[2].replace(/[^0-9]/g, ''))) === -1)
        found.add('telefon');
    if (/(^|[^A-Za-z0-9])(TR ?[0-9]{2}(?: ?[0-9]){22})(?![0-9])/i.test(s)) found.add('iban');
    const EM = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}/g;
    while ((m = EM.exec(s)))
      if (EXEMPT_EMAILS.indexOf(m[0].toLowerCase()) === -1) found.add('eposta');
    if (/(?:verg[iIİı]|vkn)/i.test(s) && /(^|[^0-9])([0-9]{10})(?![0-9])/.test(s)) found.add('vkn');
    const types = ORDER.filter((t) => found.has(t));
    return { blocked: types.length > 0, types };
  }

  /* eslint-enable no-useless-escape */

  root.ArkozPII = Object.freeze({
    detect,
    tcknValid,
    ORDER,
    LABELS,
    EXEMPT_PHONES,
    EXEMPT_EMAILS,
  });
})();
