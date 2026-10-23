// Repo koruma testleri: dondurulmuş bölge, sistem prompt'u, yasak ifadeler, sır, yapı ve yükleme listesi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const lf = (s) => s.replace(/\r\n/g, '\n');
const PAGES = [
  'index.html',
  'kurumsal.html',
  'urunler.html',
  'gazbeton.html',
  'haberler.html',
  'insan-kaynaklari.html',
  'politikalar.html',
];

function walk(dir, out = []) {
  const abs = path.join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const rel = path.posix.join(dir, name);
    if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}
const trackedFiles = () =>
  execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// (a) Dondurulmuş bölge: KVKK + Gizlilik sekmeleri orijinalle birebir.
test('politikalar.html KVKK ve Gizlilik bölgesi dondurulmuş özetle aynı', () => {
  const s = lf(read('politikalar.html'));
  const a = s.indexOf('<div class="tab-panel active" id="tab-kvk">');
  const b = s.indexOf('<div class="tab-panel" id="tab-cerez">');
  assert.ok(a >= 0 && b > a, 'bölge sınırları bulunamadı');
  const hash = createHash('sha256').update(s.slice(a, b), 'utf8').digest('hex');
  assert.equal(hash, '6ad3a84253e36fb13854d8b755c9f6c497029e0606a5f43f76c0e5d1e94ee9fa');
});

// (b) Sistem prompt'u: yapı, eski bağlantılar ve gerçek kişi verisi yok.
test('api/lib/system-prompt.php yapısı ve içeriği', () => {
  const raw = lf(read('api/lib/system-prompt.php'));
  assert.ok(raw.startsWith('<?php'), '<?php ile başlamalı');
  assert.ok(raw.includes("return <<<'PROMPT'"), 'nowdoc yok');
  assert.ok(raw.trimEnd().endsWith('PROMPT;'), 'PROMPT; ile bitmeli');
  for (const bad of ['/tr/', 'Uploads/', 'Sayın [Soyadı]', 'YÖNETİM (Kaynak']) {
    assert.ok(!raw.includes(bad), `geçmemeli: ${bad}`);
  }
  assert.equal(
    raw.split('KİŞİSEL VERİ KURALLARI').length - 1,
    1,
    'KİŞİSEL VERİ KURALLARI tam bir kez'
  );
  const banned = new Set([
    '3f7fd403cfadf6a365d6349e3f18a55b15e7df0e2d15676fc9248fe1a32e9db9',
    '38b9c64d8f4ca2b9487d6708d2fc49573752319d4bb93aecc8fb3215cdad9ffd',
  ]);
  for (const tok of raw.split(/[^\p{L}\p{N}]+/u)) {
    if (!tok) continue;
    const h = createHash('sha256').update(tok.normalize('NFC'), 'utf8').digest('hex');
    assert.ok(!banned.has(h), 'çıkarılmış bir ad hâlâ geçiyor');
  }
  const phone = /(^|[^0-9])(0?5[0-9]{2}[ .]?[0-9]{3}[ .]?[0-9]{2}[ .]?[0-9]{2})(?![0-9])/g;
  let m;
  while ((m = phone.exec(raw))) {
    const digits = m[2].replace(/[^0-9]/g, '');
    const national = digits.length === 11 ? digits.slice(1) : digits;
    assert.equal(national, '5388658289', `beklenmeyen cep numarası: ${m[2]}`);
  }
});

// (c) Yasak ifade taraması.
function scanFiles() {
  const files = [];
  for (const name of readdirSync(ROOT)) {
    if (name.endsWith('.html')) files.push(name);
  }
  files.push('script.js', 'styles.css');
  for (const dir of ['components', 'api', 'deploy']) walk(dir, files);
  return files.filter(
    (f) => !f.startsWith('_arsiv/') && !f.startsWith('tests/') && !f.includes('node_modules/')
  );
}
const SENSITIVE = [
  /Anthropic/,
  /Claude/,
  /Vercel/,
  /FormSubmit/,
  /GitHub/,
  /Google LLC/,
  /Google Fonts/,
  /Meta Platforms/,
  /\bMeta\b/,
  /\bABD\b/,
  /Amerika/,
  /\bUS\b/,
  /Schrems/,
];
const INSENSITIVE = [
  /yurt dışı veri aktarımı/i,
  /KVKK Md\. 9/i,
  /Madde 9/i,
  /cross-border/i,
  /sunucularına aktar/i,
  /API'sine iletilir/i,
  /proxy/i,
];

test('yasak ifadeler taranan dosyalarda geçmiyor', () => {
  const hits = [];
  for (const f of scanFiles()) {
    const lines = lf(read(f)).split('\n');
    lines.forEach((line, i) => {
      for (const re of SENSITIVE) {
        if (re.test(line)) hits.push(`${f}:${i + 1}: ${re} → ${line.trim().slice(0, 100)}`);
      }
      for (const re of INSENSITIVE) {
        if (re.test(line)) hits.push(`${f}:${i + 1}: ${re} → ${line.trim().slice(0, 100)}`);
      }
    });
  }
  assert.deepStrictEqual(hits, []);
});

// (d) Sır: config.php izlenmiyor; izlenen hiçbir dosyada anahtar öneki yok.
test('config.php izlenmiyor ve repoda anahtar öneki yok', () => {
  const files = trackedFiles();
  assert.deepStrictEqual(
    files.filter((f) => path.posix.basename(f) === 'config.php'),
    []
  );
  const needle = Buffer.from('sk-' + 'ant');
  const hits = files.filter(
    (f) => existsSync(path.join(ROOT, f)) && readFileSync(path.join(ROOT, f)).includes(needle)
  );
  assert.deepStrictEqual(hits, []);
});

// (e) Widget yalnızca aynı-origin köprüyü çağırır.
test('chat-widget.js eski dış uç noktayı içermez, /api/chat.php içerir', () => {
  const src = read('components/chat-widget.js');
  assert.ok(!src.includes('vercel' + '.app'));
  assert.ok(src.includes("'/api/chat.php'"));
});

// (f) PHP dosyaları: BOM yok, <?php ile başlar, ?> ile bitmez.
test("api/**/*.php dosyaları BOM'suz, <?php ile başlar, ?> ile bitmez", () => {
  const files = walk('api').filter((f) => f.endsWith('.php'));
  assert.ok(files.length >= 5, 'PHP dosyaları bulunamadı');
  for (const f of files) {
    const buf = readFileSync(path.join(ROOT, f));
    assert.ok(!(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf), `${f}: BOM var`);
    const s = buf.toString('utf8');
    assert.ok(s.startsWith('<?php'), `${f}: <?php ile başlamıyor`);
    assert.ok(!s.trimEnd().endsWith('?>'), `${f}: ?> ile bitiyor`);
  }
});

// (g) İstek ortamı yalnızca chat.php'deki izin listesi döngüsünde okunur.
test('$_SERVER yalnızca chat.php izin listesinde; $server anahtarları listede; upstream.php ortam kullanmaz', () => {
  const ALLOW = [
    'REQUEST_METHOD',
    'HTTP_ORIGIN',
    'HTTP_REFERER',
    'HTTP_SEC_FETCH_SITE',
    'REMOTE_ADDR',
    'CONTENT_TYPE',
    'CONTENT_LENGTH',
    'DOCUMENT_ROOT',
  ];
  const chat = lf(read('api/chat.php')).split('\n');
  const start = chat.findIndex((l) => l.includes("foreach (array('REQUEST_METHOD'"));
  assert.ok(start >= 0, 'izin listesi döngüsü bulunamadı');
  const end = chat.findIndex((l, i) => i > start && l.trim() === '}');
  assert.ok(end > start, 'döngü sonu bulunamadı');
  const listed = [...chat[start].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
  assert.deepStrictEqual(listed, ALLOW);
  chat.forEach((l, i) => {
    if (l.includes('$_SERVER'))
      assert.ok(i >= start && i <= end, `chat.php:${i + 1} döngü dışında $_SERVER`);
  });
  for (const f of walk('api').filter((f) => f.endsWith('.php'))) {
    const s = read(f);
    if (f !== 'api/chat.php') assert.ok(!s.includes('$_SERVER'), `${f}: $_SERVER`);
    for (const m of s.matchAll(/\$server\['([A-Z_]+)'\]/g)) {
      assert.ok(ALLOW.includes(m[1]), `${f}: izin listesi dışı anahtar ${m[1]}`);
    }
    assert.ok(!/HTTP_USER_AGENT|HTTP_COOKIE/.test(s), `${f}: UA/çerez anahtarı`);
  }
  const up = read('api/lib/upstream.php');
  assert.ok(
    !up.includes('$server') && !up.includes('$_SERVER'),
    'upstream.php istek ortamı kullanmamalı'
  );
});

// (h) Yukarı akışa kimlik sızdıran ayarlar ve konsol çıktısı yok.
test('api/, pii-filter.js ve chat-widget.js içinde yasak çağrılar yok', () => {
  const re =
    /CURLOPT_USERAGENT|CURLOPT_COOKIE|CURLOPT_REFERER|CURLOPT_ENCODING|session_start|console\./;
  const files = [...walk('api'), 'components/pii-filter.js', 'components/chat-widget.js'].filter(
    (f) => existsSync(path.join(ROOT, f))
  );
  const hits = files.filter((f) => re.test(read(f)));
  assert.deepStrictEqual(hits, []);
});

// (i) Yükleme listesi: izlenen dosyalar; sayfaların referans verdiği her yerel dosya listede; geliştirme dosyaları listede değil.
function localRef(u) {
  const clean = u.split('#')[0].split('?')[0].trim();
  if (!clean || /^(https?:|\/\/|mailto:|tel:|data:|javascript:)/i.test(clean)) return null;
  return clean.replace(/^(\.\/)+/, '').replace(/^\/+/, '');
}
function referencedAssets() {
  const refs = new Set();
  const attr = /(?:src|href|poster)\s*=\s*"([^"]+)"/g;
  const srcset = /srcset\s*=\s*"([^"]+)"/g;
  const urlre = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
  for (const p of PAGES) {
    const s = read(p);
    for (const m of s.matchAll(attr)) {
      const l = localRef(m[1]);
      if (l && !l.endsWith('.html')) refs.add(l);
    }
    for (const m of s.matchAll(srcset)) {
      for (const part of m[1].split(',')) {
        const l = localRef(part.trim().split(' ')[0]);
        if (l) refs.add(l);
      }
    }
    for (const m of s.matchAll(urlre)) {
      const l = localRef(m[1]);
      if (l) refs.add(l);
    }
  }
  const cssFiles = ['styles.css', ...walk('components').filter((f) => f.endsWith('.css'))];
  for (const css of cssFiles) {
    const base = path.posix.dirname(css);
    for (const m of read(css).matchAll(urlre)) {
      const l = localRef(m[1]);
      if (l) refs.add(base === '.' ? l : path.posix.normalize(path.posix.join(base, l)));
    }
  }
  const manifest = JSON.parse(read('site.webmanifest'));
  for (const icon of manifest.icons || []) {
    const l = localRef(icon.src || '');
    if (l) refs.add(l);
  }
  return [...refs].filter((r) => existsSync(path.join(ROOT, r)));
}

test('deploy/natro/yuklenecek-dosyalar.txt tutarlı', () => {
  const lines = lf(read('deploy/natro/yuklenecek-dosyalar.txt'))
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  const listed = new Set(lines);
  const tracked = new Set(trackedFiles());
  for (const l of lines) assert.ok(tracked.has(l), `listede izlenmeyen yol: ${l}`);
  for (const r of referencedAssets())
    assert.ok(listed.has(r), `referans verilen dosya listede yok: ${r}`);
  for (const p of PAGES) assert.ok(listed.has(p), `sayfa listede yok: ${p}`);
  for (const must of [
    'api/chat.php',
    'api/.htaccess',
    'api/lib/.htaccess',
    'api/lib/bridge.php',
    'api/lib/pii.php',
    'api/lib/ratelimit.php',
    'api/lib/upstream.php',
    'api/lib/system-prompt.php',
    'components/pii-filter.js',
  ]) {
    assert.ok(listed.has(must), `listede olmalı: ${must}`);
  }
  const forbidden = [
    /^_arsiv\//,
    /^tests\//,
    /^deploy\//,
    /^\.github\//,
    /^scripts\//,
    /^node_modules\//,
    /^CLAUDE\.md$/,
    /^README\.md$/,
    /^package\.json$/,
    /^package-lock\.json$/,
    /^eslint\.config\.js$/,
    /^vite\.config\.js$/,
    /^assets\/js\/lenis\.min\.js$/,
  ];
  for (const l of lines) {
    for (const re of forbidden) assert.ok(!re.test(l), `listede olmamalı: ${l}`);
  }
});
