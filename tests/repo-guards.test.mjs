// Repo koruma testleri: dondurulmuş bölge, yasak ifadeler, sır ve yapı kontrolleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const lf = (s) => s.replace(/\r\n/g, '\n');

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

// (a) Dondurulmuş bölge: KVKK + Gizlilik sekmeleri orijinalle birebir.
test('politikalar.html KVKK ve Gizlilik bölgesi dondurulmuş özetle aynı', () => {
  const s = lf(read('politikalar.html'));
  const a = s.indexOf('<div class="tab-panel active" id="tab-kvk">');
  const b = s.indexOf('<div class="tab-panel" id="tab-cerez">');
  assert.ok(a >= 0 && b > a, 'bölge sınırları bulunamadı');
  const hash = createHash('sha256').update(s.slice(a, b), 'utf8').digest('hex');
  assert.equal(hash, '6ad3a84253e36fb13854d8b755c9f6c497029e0606a5f43f76c0e5d1e94ee9fa');
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
