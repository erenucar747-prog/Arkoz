/* ============================================
   ARKOZ — Ana JavaScript Dosyası
   ============================================ */

'use strict';

// 0. Intro Shader Animasyonu (saf WebGL — sıfır bağımlılık)
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

  const logo = overlay.querySelector('#intro-logo');
  const container = overlay.querySelector('#intro-canvas-container');

  function dismiss() {
    introActive = false;
    overlay.classList.add('fade-out');
    document.body.style.overflow = '';
    setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 1000);
  }

  // Layout hesaplanınca başlat
  requestAnimationFrame(function() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    container.appendChild(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { dismiss(); return; }

    // Vertex shader
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}');
    gl.compileShader(vs);

    // Fragment shader — smooth diyagonal şeritler, flaş yok
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, [
      'precision mediump float;',
      'uniform vec2 res;',
      'uniform float t;',
      'void main(){',
      '  vec2 uv=(gl_FragCoord.xy*2.0-res)/min(res.x,res.y);',
      '  vec3 col=vec3(0.0);',
      '  for(int j=0;j<3;j++){',
      '    for(int i=0;i<5;i++){',
      '      float fi=float(i);',
      '      float fj=float(j);',
      '      float wave=sin((uv.x+uv.y)*3.0+t*6.28+fi*1.2+fj*0.8);',
      '      float brightness=0.08*(fi+1.0)*(0.5+0.5*wave);',
      '      if(j==0) col.r+=brightness;',
      '      else if(j==1) col.g+=brightness*0.6;',
      '      else col.b+=brightness*1.2;',
      '    }',
      '  }',
      '  col=clamp(col,0.0,1.0);',
      '  gl_FragColor=vec4(col,1.0);',
      '}'
    ].join('\n'));
    gl.compileShader(fs);

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'res');
    const uTime = gl.getUniformLocation(prog, 't');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);

    var time = 0, animId;
    function render() {
      animId = requestAnimationFrame(render);
      time += 0.004;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    render();

    setTimeout(function() { logo.classList.add('visible'); }, 2000);

    setTimeout(function() {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      dismiss();
    }, 4000);
  });
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

// 8. Kart Üzerinde 3D Tilt Efekti (Service Cards)
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
