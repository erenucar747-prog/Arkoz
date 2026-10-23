// Widget çekirdeği: kişisel veri kapısı, istek şekli, sunucu engeli, güvenli markdown, host kapısı.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VECTORS = JSON.parse(readFileSync(path.join(ROOT, 'tests/pii-vectors.json'), 'utf8'));

// Tarayıcı betikleri aynı realm'de yüklenir; document tanımsız olduğu için yalnızca çekirdek kurulur.
function loadCore() {
  const win = {};
  new Function('window', readFileSync(path.join(ROOT, 'components/pii-filter.js'), 'utf8'))(win);
  new Function('window', readFileSync(path.join(ROOT, 'components/chat-widget.js'), 'utf8'))(win);
  return { win, core: win.ArkozChatCore, PII: win.ArkozPII };
}

function fakeFetch(responder) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return responder(url, init);
  };
  return { calls, fetchImpl };
}
const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (body === undefined) throw new Error('no json');
    return body;
  },
});

function makeClient(core, PII, responder) {
  const { calls, fetchImpl } = fakeFetch(responder);
  const client = core.createChatClient({
    endpoint: core.ENDPOINT,
    fetchImpl,
    detect: PII.detect,
    maxHistory: core.MAX_HISTORY,
    maxInput: core.MAX_INPUT_LENGTH,
  });
  return { client, calls };
}

const M5_CLIENT = (liste) =>
  `Mesajınız gönderilmedi: mesajınızda ${liste} tespit edildi. Lütfen bu bilgiyi silerek sorunuzu yeniden yazın. Size özel teklif veya geri dönüş için İletişim bölümümüzdeki formu kullanabilir ya da 0 (850) 317 55 55 numaralı müşteri hattımızı arayabilirsiniz.`;
const M5_SERVER =
  'Mesajınız kişisel bir bilgi içerebileceği için yanıtlanmadı ve sunucumuzda kaydedilmedi. Lütfen kişisel bilgilerinizi çıkararak sorunuzu yeniden yazın.';
const M6_TEKLIF =
  'Fiyat teklifi taleplerini sohbet üzerinden almıyoruz; lütfen kişisel bilgilerinizi buraya yazmayın. Teklif için İletişim bölümümüzdeki formu kullanabilir veya 0 (850) 317 55 55 numaralı müşteri hattımızı arayabilirsiniz. Fiyatlar proje ve miktara göre belirlenir.';
const M6_BAYI =
  'Bayilik başvurularını sohbet üzerinden almıyoruz; lütfen kişisel bilgilerinizi buraya yazmayın. Bayilik için İletişim bölümümüzdeki formu kullanabilir, firma tanıtımınızı info@arkozgazbeton.com.tr adresine gönderebilir veya 0 (850) 317 55 55 numaralı müşteri hattımızı arayabilirsiniz.';

test('çekirdek dışa açık ve dondurulmuş; sabitler doğru', () => {
  const { core } = loadCore();
  assert.ok(core && Object.isFrozen(core));
  assert.equal(core.ENDPOINT, '/api/chat.php');
  assert.equal(core.MAX_INPUT_LENGTH, 500);
  assert.equal(core.MAX_HISTORY, 20);
});

test('kişisel veri içeren 23 pozitif vektörde fetch hiç çağrılmaz, history değişmez', async () => {
  const { core, PII } = loadCore();
  const positives = VECTORS.filter((v) => v.blocked);
  assert.equal(positives.length, 23);
  for (const v of positives) {
    const { client, calls } = makeClient(core, PII, () =>
      jsonResponse(200, { content: [{ type: 'text', text: 'x' }] })
    );
    const history = [
      { role: 'user', content: 'önceki' },
      { role: 'assistant', content: 'yanıt' },
    ];
    const before = JSON.stringify(history);
    const r = await client.send(history, v.input);
    assert.equal(r.kind, 'blocked', v.input);
    assert.deepStrictEqual(r.types, v.types, v.input);
    assert.equal(calls.length, 0, v.input);
    assert.equal(JSON.stringify(history), before, v.input);
  }
});

test("temiz mesajda fetch tam 1 kez ve doğru şekilde çağrılır; assistant yanıtı history'ye eklenir", async () => {
  const { core, PII } = loadCore();
  const { client, calls } = makeClient(core, PII, () =>
    jsonResponse(200, { content: [{ type: 'text', text: 'Merhaba, yanıt.' }] })
  );
  const history = [];
  const r = await client.send(history, 'Gazbeton nedir?');
  assert.equal(r.kind, 'ok');
  assert.equal(r.reply, 'Merhaba, yanıt.');
  assert.equal(calls.length, 1);
  const { url, init } = calls[0];
  assert.equal(url, '/api/chat.php');
  assert.equal(init.method, 'POST');
  assert.equal(init.credentials, 'omit');
  assert.equal(init.redirect, 'error');
  assert.equal(init.cache, 'no-store');
  assert.deepStrictEqual(init.headers, { 'Content-Type': 'application/json' });
  const body = JSON.parse(init.body);
  assert.deepStrictEqual(Object.keys(body), ['messages']);
  assert.deepStrictEqual(body.messages, [{ role: 'user', content: 'Gazbeton nedir?' }]);
  assert.deepStrictEqual(history, [
    { role: 'user', content: 'Gazbeton nedir?' },
    { role: 'assistant', content: 'Merhaba, yanıt.' },
  ]);
});

test('boş mesaj → empty; 501 karakter → too-long, fetch 0', async () => {
  const { core, PII } = loadCore();
  const { client, calls } = makeClient(core, PII, () => jsonResponse(200, {}));
  assert.equal((await client.send([], '   ')).kind, 'empty');
  assert.equal((await client.send([], 'a'.repeat(501))).kind, 'too-long');
  assert.equal(calls.length, 0);
  await client.send([], 'a'.repeat(500));
  assert.equal(calls.length, 1, '500 karakter sınırın içindedir');
});

test('sunucu {blocked:true} → server-blocked ve history tamamen boşalır', async () => {
  const { core, PII } = loadCore();
  const { client } = makeClient(core, PII, () =>
    jsonResponse(422, { blocked: true, types: ['telefon'], error: M5_SERVER })
  );
  const history = [
    { role: 'user', content: 'eski' },
    { role: 'assistant', content: 'eski yanıt' },
  ];
  const r = await client.send(history, 'temiz soru');
  assert.equal(r.kind, 'server-blocked');
  assert.deepStrictEqual(r.types, ['telefon']);
  assert.equal(r.message, M5_SERVER);
  assert.equal(history.length, 0);
});

test('gövdesi JSON olmayan 422 → server-blocked, yedek metin, history boş', async () => {
  const { core, PII } = loadCore();
  const { client } = makeClient(core, PII, () => jsonResponse(422, undefined));
  const history = [{ role: 'user', content: 'eski' }];
  const r = await client.send(history, 'temiz soru');
  assert.equal(r.kind, 'server-blocked');
  assert.deepStrictEqual(r.types, []);
  assert.equal(r.message, M5_SERVER);
  assert.equal(history.length, 0);
});

test("!ok yanıtta data.error döner; user mesajı history'de kalır", async () => {
  const { core, PII } = loadCore();
  const { client } = makeClient(core, PII, () =>
    jsonResponse(429, {
      error: 'Çok hızlı yazıyorsunuz. Lütfen bir dakika bekleyip tekrar deneyin.',
    })
  );
  const history = [];
  const r = await client.send(history, 'soru');
  assert.equal(r.kind, 'error');
  assert.equal(r.message, 'Çok hızlı yazıyorsunuz. Lütfen bir dakika bekleyip tekrar deneyin.');
  assert.deepStrictEqual(history, [{ role: 'user', content: 'soru' }]);
});

test('!ok yanıtta gövde yoksa friendlyError; ağ hatası metni doğru; boş içerik hata', async () => {
  const { core, PII } = loadCore();
  const a = makeClient(core, PII, () => jsonResponse(503, undefined));
  assert.equal((await a.client.send([], 'soru')).message, core.friendlyError(503));
  const b = makeClient(core, PII, async () => {
    throw new TypeError('Failed to fetch');
  });
  const rb = await b.client.send([], 'soru');
  assert.equal(rb.kind, 'error');
  assert.equal(rb.message, 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
  const c = makeClient(core, PII, () =>
    jsonResponse(200, { content: [{ type: 'text', text: '' }] })
  );
  const rc = await c.client.send([], 'soru');
  assert.equal(rc.kind, 'error');
  assert.equal(rc.message, 'Boş bir yanıt geldi, lütfen tekrar deneyin.');
});

test('history 20 ile sınırlı; istekte en fazla 20 mesaj gider', async () => {
  const { core, PII } = loadCore();
  const { client, calls } = makeClient(core, PII, () =>
    jsonResponse(200, { content: [{ type: 'text', text: 'y' }] })
  );
  const history = [];
  for (let i = 0; i < 15; i++)
    history.push({ role: i % 2 ? 'assistant' : 'user', content: 'm' + i });
  await client.send(history, 'son');
  assert.ok(JSON.parse(calls[0].init.body).messages.length <= 20);
  assert.ok(history.length <= 20);
});

test('mdToHtml güvenli: img yok, javascript: bağlantı yok, nitelik enjeksiyonu yok, strong çalışır', () => {
  const { core } = loadCore();
  const img = core.mdToHtml('![a](https://x/y.png)');
  assert.ok(!img.includes('<img'));
  assert.ok(img.includes('<a href="https://x/y.png"'));
  const js = core.mdToHtml('[x](javascript:alert(1))');
  assert.ok(!js.includes('<a'));
  const inj = core.mdToHtml('[x](https://a/" onmouseover="y)');
  assert.ok(!inj.includes('" onmouseover'));
  assert.equal(core.mdToHtml('**b**'), '<strong>b</strong>');
  assert.equal(core.mdToHtml('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
  assert.equal(core.mdToHtml('a\nb'), 'a<br>b');
});

test('isAssistantHost yalnızca https + arkozgazbeton.com.tr', () => {
  const { core } = loadCore();
  const loc = (protocol, hostname) => ({ protocol, hostname });
  assert.equal(core.isAssistantHost(loc('https:', 'arkozgazbeton.com.tr')), true);
  assert.equal(core.isAssistantHost(loc('https:', 'www.arkozgazbeton.com.tr')), false);
  assert.equal(core.isAssistantHost(loc('http:', 'arkozgazbeton.com.tr')), false);
  assert.equal(core.isAssistantHost(loc('https:', 'erenucar747-prog.github.io')), false);
  assert.equal(core.isAssistantHost(loc('http:', 'localhost')), false);
  assert.equal(core.isAssistantHost(null), false);
});

test('canBoot: üretim host + ArkozPII gerekir', () => {
  const { core, PII } = loadCore();
  const w = (protocol, hostname, pii) => ({ location: { protocol, hostname }, ArkozPII: pii });
  assert.equal(core.canBoot(w('https:', 'arkozgazbeton.com.tr', PII)), true);
  assert.equal(core.canBoot(w('https:', 'arkozgazbeton.com.tr', undefined)), false);
  assert.equal(core.canBoot(w('https:', 'arkozgazbeton.com.tr', {})), false);
  assert.equal(core.canBoot(w('https:', 'erenucar747-prog.github.io', PII)), false);
  assert.equal(core.canBoot(w('https:', 'www.arkozgazbeton.com.tr', PII)), false);
});

test('QUICK_ACTIONS 4 öğe; 3. ve 4. yerel; LOCAL_REPLIES M6 ile birebir', () => {
  const { core } = loadCore();
  assert.deepStrictEqual(
    core.QUICK_ACTIONS.map((a) => a.label),
    [
      'Ürün özellikleri',
      'Teknik bilgi ve uygulama',
      'Fiyat teklifi almak istiyorum',
      'Bayi olmak istiyorum',
    ]
  );
  assert.equal(core.QUICK_ACTIONS[0].send, 'Ürünlerinizin özellikleri nelerdir?');
  assert.equal(
    core.QUICK_ACTIONS[1].send,
    'Ürünlerinizin teknik değerleri ve uygulaması hakkında bilgi verir misiniz?'
  );
  for (const i of [2, 3]) {
    assert.ok(core.QUICK_ACTIONS[i].local);
    assert.equal(core.QUICK_ACTIONS[i].send, undefined);
  }
  assert.equal(core.QUICK_ACTIONS[2].local, 'teklif');
  assert.equal(core.QUICK_ACTIONS[3].local, 'bayi');
  assert.equal(core.LOCAL_REPLIES.teklif, M6_TEKLIF);
  assert.equal(core.LOCAL_REPLIES.bayi, M6_BAYI);
});

test('piiBlockedMessage M5 şablonuna birebir uyar (1, 2 ve 3 öğe)', () => {
  const { core } = loadCore();
  assert.equal(core.piiBlockedMessage(['telefon']), M5_CLIENT('telefon numarası'));
  assert.equal(
    core.piiBlockedMessage(['telefon', 'eposta']),
    M5_CLIENT('telefon numarası ve e-posta adresi')
  );
  assert.equal(
    core.piiBlockedMessage(['tckn', 'telefon', 'eposta']),
    M5_CLIENT('T.C. kimlik numarası, telefon numarası ve e-posta adresi')
  );
  // ORDER sırası korunur, giriş sırası önemsiz
  assert.equal(
    core.piiBlockedMessage(['eposta', 'tckn']),
    M5_CLIENT('T.C. kimlik numarası ve e-posta adresi')
  );
});

test('eski dış uç nokta sabiti kaldırıldı', () => {
  const src = readFileSync(path.join(ROOT, 'components/chat-widget.js'), 'utf8');
  assert.ok(!src.includes('vercel' + '.app'));
  assert.ok(src.includes("'/api/chat.php'"));
});
