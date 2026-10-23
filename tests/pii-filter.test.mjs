// Tarayıcı kişisel veri filtresi: ortak vektörler + kararlılık testleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VECTORS = JSON.parse(readFileSync(path.join(ROOT, 'tests/pii-vectors.json'), 'utf8'));

// Tarayıcı betiği aynı realm'de yüklenir (ayrı vm bağlamı deepStrictEqual'ı bozar).
function loadPII() {
  const src = readFileSync(path.join(ROOT, 'components/pii-filter.js'), 'utf8');
  const win = {};
  new Function('window', src)(win);
  return win.ArkozPII;
}

test('44 ortak vektör dosyada', () => {
  assert.equal(VECTORS.length, 44);
});

test('vektörlerin tamamı JS filtresinde aynı sonucu verir', () => {
  const PII = loadPII();
  for (const v of VECTORS) {
    assert.deepStrictEqual(PII.detect(v.input), { blocked: v.blocked, types: v.types }, v.input);
  }
});

test('tcknValid: geçerli ve geçersiz örnek', () => {
  const PII = loadPII();
  assert.equal(PII.tcknValid('10000000146'), true);
  assert.equal(PII.tcknValid('10000000147'), false);
});

test('detect aynı girdiyle arka arkaya aynı sonucu verir (lastIndex sızıntısı yok)', () => {
  const PII = loadPII();
  const input = 'Ben 05321234567, mail ahmet@example.com';
  const a = PII.detect(input);
  const b = PII.detect(input);
  const c = PII.detect(input);
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual(b, c);
  assert.deepStrictEqual(a, { blocked: true, types: ['telefon', 'eposta'] });
});

test('dışa açılan API dondurulmuş ve tam', () => {
  const PII = loadPII();
  assert.ok(Object.isFrozen(PII));
  assert.deepStrictEqual(Object.keys(PII).sort(), [
    'EXEMPT_EMAILS',
    'EXEMPT_PHONES',
    'LABELS',
    'ORDER',
    'detect',
    'tcknValid',
  ]);
  assert.deepStrictEqual(PII.ORDER, ['tckn', 'telefon', 'iban', 'eposta', 'vkn']);
});
