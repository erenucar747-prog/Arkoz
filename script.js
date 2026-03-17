/* ============================================
   ARKOZ — Ana JavaScript Dosyası
   ============================================ */

'use strict';

// 0. Intro — Three.js Shader Animasyonu (component ile birebir aynı formül)
let introActive = false;

function runIntro() {
  if (introActive) return;
  introActive = true;

  const old = document.getElementById('intro-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'intro-overlay';
  overlay.innerHTML =
    '<div id="intro-canvas-container"></div>' +
    '<div id="intro-logo"><img src="logo.png" alt="Arkoz Gazbeton"/></div>';
  document.body.prepend(overlay);
  document.body.style.overflow = 'hidden';

  const logo      = overlay.querySelector('#intro-logo');
  const container = overlay.querySelector('#intro-canvas-container');

  function dismiss() {
    introActive = false;
    overlay.classList.add('fade-out');
    document.body.style.overflow = '';
    setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 1000);
  }

  // Three.js yoksa sade siyah göster
  if (typeof THREE === 'undefined') { dismiss(); return; }

  // --- Three.js kurulum (component ile birebir) ---
  const vertexShader = `
    void main() {
      gl_Position = vec4( position, 1.0 );
    }
  `;

  const fragmentShader = `
    #define TWO_PI 6.2831853072
    #define PI 3.14159265359

    precision highp float;
    uniform vec2 resolution;
    uniform float time;

    void main(void) {
      vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
      float t = time * 0.05;
      float lineWidth = 0.002;

      vec3 color = vec3(0.0);
      for(int j = 0; j < 3; j++){
        for(int i = 0; i < 5; i++){
          color[j] += lineWidth * float(i*i) / abs(
            fract(t - 0.01*float(j) + float(i)*0.01) * 5.0
            - length(uv)
            + mod(uv.x + uv.y, 0.2)
          );
        }
      }

      gl_FragColor = vec4(color[0], color[1], color[2], 1.0);
    }
  `;

  const camera = new THREE.Camera();
  camera.position.z = 1;

  const scene    = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry(2, 2);

  const uniforms = {
    time:       { type: 'f',  value: 1.0 },
    resolution: { type: 'v2', value: new THREE.Vector2() }
  };

  const material = new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   vertexShader,
    fragmentShader: fragmentShader
  });

  scene.add(new THREE.Mesh(geometry, material));

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    uniforms.resolution.value.x = renderer.domElement.width;
    uniforms.resolution.value.y = renderer.domElement.height;
  }
  onResize();
  window.addEventListener('resize', onResize);

  let animId;
  function animate() {
    animId = requestAnimationFrame(animate);
    uniforms.time.value += 0.05;
    renderer.render(scene, camera);
  }
  animate();

  setTimeout(function() { logo.classList.add('visible'); }, 2200);

  setTimeout(function() {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    dismiss();
  }, 4200);
}

runIntro();
window.addEventListener('pageshow', function(e) {
  if (e.persisted) runIntro();
});

// 1. Header — Scroll'da arka plan ekle
(function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// 2. Mobil Menü (Burger)
(function initBurger() {
  const burger = document.getElementById('burger');
  const navList = document.getElementById('nav-list');
  if (!burger || !navList) return;

  burger.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('open');
    burger.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Bir linke tıklanınca menüyü kapat
  navList.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      navList.classList.remove('open');
      burger.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
})();

// 3. Sayı Sayaç Animasyonu (Hero Stats)
(function initCounter() {
  const counters = document.querySelectorAll('.hero__stat-num[data-count]');
  if (!counters.length) return;

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;

    const tick = () => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current);
      if (current < target) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
})();

// 4. Scroll Reveal Animasyonu
(function initReveal() {
  // Reveal edilecek elementleri seç ve class ekle
  const targets = document.querySelectorAll(
    '.service-card, .project-card, .about__card, .contact__item, .section__header'
  );

  targets.forEach((el, i) => {
    el.classList.add('reveal');
    if (i % 3 === 1) el.classList.add('reveal-delay-1');
    if (i % 3 === 2) el.classList.add('reveal-delay-2');
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach(el => observer.observe(el));
})();

// 5. Aktif Nav Linki (Scroll Spy)
(function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle(
              'nav__link--active',
              link.getAttribute('href') === `#${id}`
            );
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach(s => observer.observe(s));
})();

// 6. İletişim Formu
(function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>Gönderiliyor...</span>';

    // Simüle edilmiş gönderim (backend entegrasyonuna hazır)
    await new Promise(r => setTimeout(r, 1200));

    btn.disabled = false;
    btn.innerHTML = original;
    form.reset();
    showToast('✅ Mesajınız gönderildi! En kısa sürede dönüş yapacağız.', 'success');
  });
})();

// 7. Smooth Anchor Scroll (Offset ile — sabit header için)
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;

      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

// 8. Glowing Border Efekti (Advantage Cards)
(function initGlowingEffect() {
  const cards = document.querySelectorAll('.advantage-card');
  if (!cards.length) return;

  const PROXIMITY = 100;
  const LERP = 0.06;

  const states = Array.from(cards).map(card => {
    const glow = document.createElement('div');
    glow.className = 'advantage-card__glow';
    card.prepend(glow);
    return { el: card, angle: 0, target: 0, active: false };
  });

  function shortestDiff(from, to) {
    return ((to - from + 180) % 360) - 180;
  }

  let lastX = 0, lastY = 0;

  function updateActive(x, y) {
    states.forEach(s => {
      const r = s.el.getBoundingClientRect();
      const cx = r.left + r.width * 0.5;
      const cy = r.top + r.height * 0.5;
      s.active = x > r.left - PROXIMITY && x < r.right + PROXIMITY &&
                 y > r.top - PROXIMITY  && y < r.bottom + PROXIMITY;
      if (s.active) {
        s.target = (180 * Math.atan2(y - cy, x - cx)) / Math.PI + 90;
      }
    });
  }

  function handlePointer(x, y) { lastX = x; lastY = y; updateActive(x, y); }

  window.addEventListener('pointermove', e => handlePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', e => {
    if (e.touches[0]) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('scroll', () => updateActive(lastX, lastY), { passive: true });

  (function tick() {
    states.forEach(s => {
      const diff = shortestDiff(s.angle, s.target);
      s.angle += diff * LERP;
      s.el.style.setProperty('--start', s.angle.toFixed(2));
      s.el.style.setProperty('--active', s.active ? '1' : '0');
    });
    requestAnimationFrame(tick);
  })();
})();

// 9. Kart Üzerinde 3D Tilt Efekti (Service Cards) (eski 8)
(function initTilt() {
  const cards = document.querySelectorAll('.service-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-6px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

// 9. Hero Slider (slider kaldırıldı — erken çıkış)
(function initHeroSlider() {
  const slides = document.querySelectorAll('.hero__slide');
  const dots   = document.querySelectorAll('.hero__dot');
  const prev   = document.getElementById('heroPrev');
  const next   = document.getElementById('heroNext');

  if (!slides.length) return;

  let current = 0;
  let timer;

  function goTo(index) {
    slides[current].classList.remove('hero__slide--active');
    dots[current].classList.remove('hero__dot--active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('hero__slide--active');
    dots[current].classList.add('hero__dot--active');
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 5000);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startTimer(); });
  });

  prev.addEventListener('click', () => { goTo(current - 1); startTimer(); });
  next.addEventListener('click', () => { goTo(current + 1); startTimer(); });

  startTimer();
})();
