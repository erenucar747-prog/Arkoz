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

// 9. Hero Slider
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

// 10. Mission Section — Ethereal Beams (custom ShaderMaterial — Phong specular, no PBR)
(function initMissionBeams() {
  const canvas = document.getElementById('beams-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // ── Scene ──────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
  camera.position.set(0, 0, 20);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ── Geometry ────────────────────────────────────────────────────────────
  function createBeamGeometry(n, width, height, spacing, heightSegments) {
    const geo = new THREE.BufferGeometry();
    const numVerts = n * (heightSegments + 1) * 2;
    const numFaces = n * heightSegments * 2;
    const positions = new Float32Array(numVerts * 3);
    const indices   = new Uint32Array(numFaces * 3);
    const uvs       = new Float32Array(numVerts * 2);
    let vi = 0, ii = 0, ui = 0;
    const totalWidth = n * width + (n - 1) * spacing;
    const xBase      = -totalWidth / 2;
    for (let i = 0; i < n; i++) {
      const xOff   = xBase + i * (width + spacing);
      const uvXOff = Math.random() * 300;
      const uvYOff = Math.random() * 300;
      for (let j = 0; j <= heightSegments; j++) {
        const y = height * (j / heightSegments - 0.5);
        positions.set([xOff, y, 0,  xOff + width, y, 0], vi * 3);
        uvs.set([uvXOff, j / heightSegments + uvYOff,
                 uvXOff + 1, j / heightSegments + uvYOff], ui);
        if (j < heightSegments) {
          const a = vi, b = vi + 1, c = vi + 2, d = vi + 3;
          indices.set([a, b, c,  c, b, d], ii);
          ii += 6;
        }
        vi += 2;
        ui += 4;
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }

  const geometry = createBeamGeometry(15, 2.5, 18, 0, 100);

  // ── Uniforms ─────────────────────────────────────────────────────────────
  const uniforms = {
    time:            { value: 0.0 },
    uSpeed:          { value: 2.5 },
    uScale:          { value: 0.15 },
    uNoiseIntensity: { value: 1.75 },
  };

  // ── Perlin 3D noise GLSL ─────────────────────────────────────────────────
  const PERLIN3 = `
    vec4 bPerm(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
    vec4 bTayl(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    vec3 bFade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
    float cnoise(vec3 P){
      vec3 Pi0=floor(P),Pi1=Pi0+vec3(1.0);
      Pi0=mod(Pi0,289.0);Pi1=mod(Pi1,289.0);
      vec3 Pf0=fract(P),Pf1=Pf0-vec3(1.0);
      vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
      vec4 iy=vec4(Pi0.yy,Pi1.yy);
      vec4 iz0=Pi0.zzzz,iz1=Pi1.zzzz;
      vec4 ixy=bPerm(bPerm(ix)+iy);
      vec4 ixy0=bPerm(ixy+iz0),ixy1=bPerm(ixy+iz1);
      vec4 gx0=ixy0/7.0,gy0=fract(floor(gx0)/7.0)-0.5;
      gx0=fract(gx0);
      vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0);
      vec4 sz0=step(gz0,vec4(0.0));
      gx0-=sz0*(step(0.0,gx0)-0.5);gy0-=sz0*(step(0.0,gy0)-0.5);
      vec4 gx1=ixy1/7.0,gy1=fract(floor(gx1)/7.0)-0.5;
      gx1=fract(gx1);
      vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1);
      vec4 sz1=step(gz1,vec4(0.0));
      gx1-=sz1*(step(0.0,gx1)-0.5);gy1-=sz1*(step(0.0,gy1)-0.5);
      vec3 g000=vec3(gx0.x,gy0.x,gz0.x),g100=vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010=vec3(gx0.z,gy0.z,gz0.z),g110=vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001=vec3(gx1.x,gy1.x,gz1.x),g101=vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011=vec3(gx1.z,gy1.z,gz1.z),g111=vec3(gx1.w,gy1.w,gz1.w);
      vec4 norm0=bTayl(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
      g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;
      vec4 norm1=bTayl(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
      g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;
      float n000=dot(g000,Pf0),n100=dot(g100,vec3(Pf1.x,Pf0.yz));
      float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)),n110=dot(g110,vec3(Pf1.xy,Pf0.z));
      float n001=dot(g001,vec3(Pf0.xy,Pf1.z)),n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
      float n011=dot(g011,vec3(Pf0.x,Pf1.yz)),n111=dot(g111,Pf1);
      vec3 fxyz=bFade(Pf0);
      vec4 nz=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fxyz.z);
      vec2 nyz=mix(nz.xy,nz.zw,fxyz.y);
      return 2.2*mix(nyz.x,nyz.y,fxyz.x);
    }
  `;

  // ── 2D value noise GLSL (film grain) ────────────────────────────────────
  const NOISE2D = `
    float bRnd(vec2 s){return fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453123);}
    float bNoise(vec2 s){
      vec2 i=floor(s),f=fract(s);
      float a=bRnd(i),b=bRnd(i+vec2(1,0)),c=bRnd(i+vec2(0,1)),d=bRnd(i+vec2(1,1));
      vec2 u=f*f*(3.0-2.0*f);
      return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
    }
  `;

  // ── Custom ShaderMaterial — Phong specular lighting, no PBR ─────────────
  // This avoids all ambient-light grey wash and works on all devices/browsers.
  const vertexShader = `
    ${PERLIN3}
    uniform float time;
    uniform float uSpeed;
    uniform float uScale;
    varying vec3 vN; // surface normal in view space
    varying vec3 vL; // light direction in view space

    float disp(vec3 p) {
      return cnoise(vec3(0.0, p.y - uv.y, p.z + time * uSpeed * 3.0) * uScale);
    }

    void main() {
      // Displace along Z with Perlin noise
      float dz = disp(position);
      vec3 pos = vec3(position.x, position.y, dz);

      // Compute surface normal via finite differences
      float e = 0.01;
      vec3 pX = vec3(position.x + e, position.y, disp(position + vec3(e, 0.0, 0.0)));
      vec3 pY = vec3(position.x, position.y - e, disp(position + vec3(0.0, -e, 0.0)));
      vec3 objN = normalize(cross(normalize(pY - pos), normalize(pX - pos)));

      // Transform normal and light direction to view space
      vN = normalize(normalMatrix * objN);
      vL = normalize((viewMatrix * vec4(0.0, 3.0, 10.0, 0.0)).xyz);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    ${NOISE2D}
    uniform float uNoiseIntensity;
    varying vec3 vN;
    varying vec3 vL;

    void main() {
      vec3 N = normalize(vN);
      vec3 L = normalize(vL);
      vec3 V = vec3(0.0, 0.0, 1.0); // camera looks down -Z in view space

      // Blinn-Phong: diffuse + specular — no ambient so gaps stay pure black
      float diff = max(dot(N, L), 0.0);
      vec3  H    = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 48.0);

      float brightness = diff * 0.35 + spec * 2.5;

      // Subtle film grain
      brightness -= bNoise(gl_FragCoord.xy) / 15.0 * uNoiseIntensity;
      brightness  = max(0.0, brightness);

      gl_FragColor = vec4(vec3(brightness), 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });

  // ── Group with 43° Z-rotation ────────────────────────────────────────────
  const group = new THREE.Group();
  group.rotation.z = THREE.MathUtils.degToRad(43);
  group.add(new THREE.Mesh(geometry, material));
  scene.add(group);

  // ── Resize ───────────────────────────────────────────────────────────────
  function resize() {
    const w = canvas.clientWidth  || (canvas.parentElement && canvas.parentElement.clientWidth)  || 800;
    const h = canvas.clientHeight || (canvas.parentElement && canvas.parentElement.clientHeight) || 500;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Animation loop ────────────────────────────────────────────────────────
  let last = performance.now();
  (function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    uniforms.time.value += 0.1 * delta;
    renderer.render(scene, camera);
  })(last);
})();
