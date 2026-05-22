/* ============================================================
   ARKOZ GAZBETON — Ana JavaScript (Premium Redesign)
   No Three.js, no WebGL. Lightweight intro + clean micro-interactions.
   ============================================================ */

'use strict';

const REDUCE_MOTION =
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── 1. Lenis smooth scroll ─────────────────────────────── */
const lenis =
  !REDUCE_MOTION && typeof Lenis !== 'undefined'
    ? new Lenis({
        duration: 0.85,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        prevent: (node) => !!(node && node.closest && node.closest('#ai-chat-widget')),
      })
    : null;

if (lenis) {
  (function lenisRaf(time) {
    lenis.raf(time);
    requestAnimationFrame(lenisRaf);
  })();
}

/* ── 2. Lightweight intro overlay (CSS + logo) ──────────── */
(function initIntro() {
  if (REDUCE_MOTION) return;

  const path = window.location.pathname.replace(/.*\//, '');
  const isHome = path === '' || path === 'index.html' || path === '/';
  if (!isHome) return;

  if (sessionStorage.getItem('arkoz_intro_v2')) return;

  const overlay = document.createElement('div');
  overlay.id = 'intro';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<img src="logo.png" alt="" class="intro__logo" />';
  document.body.prepend(overlay);
  document.documentElement.style.overflow = 'hidden';

  const dismiss = () => {
    sessionStorage.setItem('arkoz_intro_v2', '1');
    overlay.classList.add('is-out');
    document.documentElement.style.overflow = '';
    setTimeout(() => overlay.remove(), 500);
  };

  setTimeout(dismiss, 1100);
})();

/* ── 3. Header scroll state ─────────────────────────────── */
(function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  let raf = null;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      header.classList.toggle('scrolled', window.scrollY > 40);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ── 4. Mobile burger menu ──────────────────────────────── */
(function initBurger() {
  const burger = document.getElementById('burger');
  const navList = document.getElementById('nav-list');
  if (!burger || !navList) return;

  burger.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    burger.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  navList.querySelectorAll('.nav__link').forEach((link) => {
    link.addEventListener('click', () => {
      navList.classList.remove('open');
      burger.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
})();

/* ── 5. Scroll reveal — viewport-aware, Lenis-safe ──── */
function initReveal() {
  // Auto-collect targets (don't pre-mark — only initial-viewport gets revealed-on-load)
  const autoTargets = document.querySelectorAll(
    '.service-card, .advantage-card, .about__card, .contact__item, .section__header, .mission__card, .mission__photo, .news-card, .cert-card, .partners-strip__partner, .adv-strip__card, .showcase__card, .faq__item, .quake-banner__content, .quake-banner__visual'
  );
  autoTargets.forEach((el, i) => {
    el.classList.add('reveal');
    if (!el.style.getPropertyValue('--reveal-i')) {
      el.style.setProperty('--reveal-i', (i % 4).toString());
    }
  });

  const allTargets = document.querySelectorAll('.reveal');
  if (!allTargets.length) return;

  if (REDUCE_MOTION || !('IntersectionObserver' in window)) {
    allTargets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  // Single scroll-driven check (fires on native + Lenis scroll + load)
  const check = () => {
    const vh = window.innerHeight;
    allTargets.forEach((el) => {
      if (el.classList.contains('is-in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh + 200 && r.bottom > -200) {
        el.classList.add('is-in');
      }
    });
  };

  let raf = null;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      check();
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  if (lenis && typeof lenis.on === 'function') {
    lenis.on('scroll', onScroll);
  }

  // Initial reveal pass — multiple times to catch elements as fonts/images load
  check();
  setTimeout(check, 50);
  setTimeout(check, 250);
  setTimeout(check, 600);
  setTimeout(check, 1500);

  // Fallback safety net: after 3s, reveal anything still hidden (better visible than empty)
  setTimeout(() => {
    allTargets.forEach((el) => {
      if (!el.classList.contains('is-in')) el.classList.add('is-in');
    });
  }, 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReveal);
} else {
  initReveal();
}

/* ── 6. Scroll spy (active nav link) ────────────────────── */
(function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav__link[href^="#"]');
  if (!sections.length || !links.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.id;
          links.forEach((l) =>
            l.classList.toggle(
              'nav__link--active',
              l.getAttribute('href') === '#' + id
            )
          );
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach((s) => obs.observe(s));
})();

/* ── 7. Smooth anchor scroll (with header offset) ───────── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      if (lenis) lenis.scrollTo(top);
      else window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

/* ── 8. Form Submissions (FormSubmit.co → info@arkozgazbeton.com.tr) ──
 *
 * KVKK-uyumlu form gönderim altyapısı:
 * - Tüm formlar FormSubmit.co aracılığıyla info@ adresine iletilir.
 * - `_subject` ile e-posta konusu ayrıştırılır (İletişim / Teklif / İK).
 * - HTML5 `required` checkbox KVKK onayını zorunlu kılar; JS doğrulamayla pekiştirilir.
 * - Toast bildirimleriyle kullanıcıya geri bildirim verilir.
 */
(function initFormSubmissions() {
  const ENDPOINT = 'https://formsubmit.co/ajax/info@arkozgazbeton.com.tr';

  const showToast = (msg, type = 'success') => {
    const region = document.getElementById('toast-region') || document.body;
    const t = document.createElement('div');
    t.className = 'toast toast--' + type;
    t.textContent = msg;
    region.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 350);
    }, 3500);
  };

  function bindForm(formId, subject, successMessage, onSuccess) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // KVKK consent — HTML5 'required' should catch this, but verify explicitly
      // so the message is clear if the form is altered.
      const consent = form.querySelector('input[name="kvkk-consent"]');
      if (consent && !consent.checked) {
        showToast('Devam etmek için KVKK aydınlatma metnini onaylamanız gerekir.', 'error');
        consent.focus();
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span>Gönderiliyor...</span>';

      const data = new FormData(form);
      data.append('_subject', subject);
      data.append('_template', 'table');
      data.append('_captcha', 'false');

      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data,
        });
        const json = await res.json();
        btn.disabled = false;
        btn.innerHTML = original;
        if (json.success === 'true' || json.success === true) {
          form.reset();
          showToast(successMessage, 'success');
          if (typeof onSuccess === 'function') onSuccess();
        } else {
          showToast('Gönderim sırasında hata oluştu, lütfen tekrar deneyin.', 'error');
        }
      } catch {
        btn.disabled = false;
        btn.innerHTML = original;
        showToast('Bağlantı hatası, lütfen tekrar deneyin.', 'error');
      }
    });
  }

  bindForm(
    'contact-form',
    'Arkoz Gazbeton — Yeni İletişim Mesajı',
    'Mesajınız gönderildi. En kısa sürede dönüş yapacağız.'
  );

  bindForm(
    'quote-form',
    'Arkoz Gazbeton — Yeni Teklif Talebi',
    'Teklif talebiniz alındı. En kısa sürede dönüş yapacağız.',
    function () {
      const modal = document.getElementById('quote-modal');
      if (modal) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
      }
    }
  );

  bindForm(
    'ik-form',
    'Arkoz Gazbeton — Yeni İK Başvurusu',
    'Başvurunuz alındı. İncelemenin ardından size dönüş yapacağız.'
  );
})();

/* ── 9. Hero slider ─────────────────────────────────────── */
(function initHeroSlider() {
  const slides = document.querySelectorAll('.hero__slide');
  const dots = document.querySelectorAll('.hero__dot');
  const prev = document.getElementById('heroPrev');
  const next = document.getElementById('heroNext');
  if (!slides.length) return;

  let current = 0;
  let timer;
  const heroContent = document.querySelector('.hero__content');
  const TEXT_HIDDEN = [0, 1, 2, 3];

  const updateText = () => {
    if (heroContent) {
      heroContent.classList.toggle(
        'hero__content--hidden',
        TEXT_HIDDEN.includes(current)
      );
    }
  };

  const goTo = (i) => {
    slides[current].classList.remove('hero__slide--active');
    if (dots[current]) dots[current].classList.remove('hero__dot--active');
    current = (i + slides.length) % slides.length;
    slides[current].classList.add('hero__slide--active');
    if (dots[current]) dots[current].classList.add('hero__dot--active');
    updateText();
  };

  const startTimer = () => {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 5500);
  };

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goTo(i);
      startTimer();
    });
  });

  if (prev) {
    prev.addEventListener('click', () => {
      goTo(current - 1);
      startTimer();
    });
  }
  if (next) {
    next.addEventListener('click', () => {
      goTo(current + 1);
      startTimer();
    });
  }

  updateText();
  startTimer();
})();

/* ── 11. Stats counter (animated count-up) ──────────────── */
(function initStatsCounter() {
  const items = document.querySelectorAll('.stats-bar__num[data-target]');
  if (!items.length) return;

  const fmt = (n) => (n >= 1000 ? n.toLocaleString('tr-TR') : n.toString());

  const animate = (el) => {
    if (REDUCE_MOTION) {
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      el.textContent = fmt(target) + suffix;
      return;
    }
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.floor(ease * target)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target) + suffix;
    };
    requestAnimationFrame(tick);
  };

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animate(e.target);
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  items.forEach((el) => obs.observe(el));
})();

/* ── 12. Floating WhatsApp button ───────────────────────── */
(function initWhatsApp() {
  const btn = document.createElement('a');
  btn.href = 'https://wa.me/905388658289';
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.setAttribute('aria-label', 'WhatsApp ile iletişime geç');
  btn.className = 'whatsapp-float';
  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">' +
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
    '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.857L.054 23.05a.75.75 0 0 0 .916.944l5.453-1.457A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.694 9.694 0 0 1-4.951-1.354l-.355-.21-3.675.983.998-3.549-.232-.366A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>' +
    '</svg>';
  document.body.appendChild(btn);
})();

/* ── 13.45 Scroll Progress + Sticky CTA Visibility ──────── */
(function initScrollUI() {
  const progressBar = document.getElementById('scrollProgressBar');
  const stickyCta = document.getElementById('stickyCta');
  let raf = null;
  const update = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const sy = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (sy / max) * 100 : 0;
      if (progressBar) progressBar.style.width = pct + '%';
      if (stickyCta) {
        if (sy > 600) stickyCta.classList.add('is-visible');
        else stickyCta.classList.remove('is-visible');
      }
    });
  };
  window.addEventListener('scroll', update, { passive: true });
  if (lenis && typeof lenis.on === 'function') lenis.on('scroll', update);
  update();
})();

/* ── 13.5 Savings Calculator ────────────────────────────── */
(function initCalculator() {
  const slider = document.getElementById('calcArea');
  if (!slider) return;
  const areaVal = document.getElementById('calcAreaVal');
  const co2 = document.getElementById('calcCO2');
  const energy = document.getElementById('calcEnergy');
  const labor = document.getElementById('calcLabor');
  const total = document.getElementById('calcTotal');

  const fmt = (n) => Math.round(n).toLocaleString('tr-TR');

  // Sektör verilerine göre gerçekçi katsayılar:
  // - Karbon: gazbeton vs tuğla yıllık 12 kg CO₂/m² fark
  // - Enerji: 48 ₺/m² yıllık ortalama (TR enerji birim fiyat 2025)
  // - İşçilik: 0.8 saat/m² fark (hızlı uygulanabilirlik)
  // - Toplam yıllık kazanç: enerji + işçilik (~50 ₺/saat) + ek bakım tasarrufu

  const update = (area) => {
    const co2Saving = area * 12;
    const energySaving = area * 48;
    const laborSaving = Math.round(area * 0.8);
    const totalSaving = energySaving + laborSaving * 50 + area * 38;

    areaVal.textContent = fmt(area);
    co2.textContent = fmt(co2Saving);
    energy.textContent = fmt(energySaving);
    labor.textContent = fmt(laborSaving);
    total.textContent = fmt(totalSaving);
  };

  slider.addEventListener('input', (e) => update(+e.target.value));
  update(+slider.value);
})();

/* ── 13.6 Gallery Lightbox ──────────────────────────────── */
(function initLightbox() {
  const items = document.querySelectorAll('.gallery__item[data-src]');
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbClose = document.getElementById('lightboxClose');
  if (!items.length || !lb) return;

  const open = (src, alt) => {
    lbImg.src = src;
    lbImg.alt = alt;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      open(item.dataset.src, img ? img.alt : '');
    });
  });
  lbClose.addEventListener('click', close);
  lb.addEventListener('click', (e) => {
    if (e.target === lb) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lb.classList.contains('is-open')) close();
  });
})();

/* ── 13. Tabs (kurumsal.html) ───────────────────────────── */
(function initTabs() {
  const tabs = document.querySelectorAll('.tab, .tab-btn');
  const panels = document.querySelectorAll('.tab-panel, .tab-content');
  if (!tabs.length || !panels.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      panels.forEach((p) =>
        p.classList.toggle(
          'active',
          p.id === 'tab-' + target || p.dataset.tab === target
        )
      );
    });
  });
})();

/* ============================================================
   FAZ 4 — Lightbox + Quote Modal + WhatsApp form deeplink
   ============================================================ */

(function () {
  'use strict';

  // --- Lightbox: data-lightbox-src attribute ---
  let lightboxEl = null;

  function ensureLightbox() {
    if (lightboxEl) return lightboxEl;
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';
    lightboxEl.setAttribute('aria-hidden', 'true');
    lightboxEl.innerHTML =
      '<button type="button" class="lightbox__close" aria-label="Kapat">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
      '<img class="lightbox__img" alt="" />';
    document.body.appendChild(lightboxEl);
    lightboxEl.addEventListener('click', (e) => {
      if (e.target === lightboxEl || e.target.closest('.lightbox__close')) {
        closeLightbox();
      }
    });
    return lightboxEl;
  }

  function openLightbox(src, alt) {
    const lb = ensureLightbox();
    const img = lb.querySelector('.lightbox__img');
    img.src = src;
    img.alt = alt || '';
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove('is-open');
    lightboxEl.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-lightbox-src]');
    if (!trigger) return;
    e.preventDefault();
    openLightbox(trigger.dataset.lightboxSrc, trigger.dataset.lightboxAlt || '');
  });

  // --- Quote Modal (Teklif İste) ---
  const quoteModal = document.getElementById('quote-modal');
  const quoteForm = document.getElementById('quote-form');

  function openQuoteModal(productKey) {
    if (!quoteModal) return;
    quoteModal.classList.add('is-open');
    quoteModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (productKey && quoteForm) {
      const productSelect = quoteForm.querySelector('#qf-product');
      if (productSelect) productSelect.value = productKey;
      setTimeout(() => {
        const nameInput = quoteForm.querySelector('#qf-name');
        if (nameInput) nameInput.focus();
      }, 80);
    }
  }

  function closeQuoteModal() {
    if (!quoteModal) return;
    quoteModal.classList.remove('is-open');
    quoteModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  if (quoteModal) {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-quote-product]');
      if (trigger) {
        e.preventDefault();
        openQuoteModal(trigger.dataset.quoteProduct);
        return;
      }
      if (e.target.closest('[data-modal-close]')) {
        e.preventDefault();
        closeQuoteModal();
      }
    });
  }

  // ESC closes lightbox or modal
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (lightboxEl && lightboxEl.classList.contains('is-open')) closeLightbox();
    if (quoteModal && quoteModal.classList.contains('is-open')) closeQuoteModal();
  });

  // Quote form submission and contact form fallback are handled by the
  // FormSubmit.co integration in section 8 (initFormSubmissions). The
  // old WhatsApp-deeplink handlers were removed for KVKK compliance: all
  // user-entered form data now lands in info@arkozgazbeton.com.tr.
})();
