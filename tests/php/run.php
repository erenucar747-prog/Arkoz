<?php
// PHP birim testleri — bağımlılıksız. `php tests/php/run.php`; hata > 0 ise exit(1).
// Sahte config gerçek anahtar içermez; gerçek kişi verisi ya da IP kullanılmaz (203.0.113.0/24 belge aralığı).
define('ARKOZ_CHAT', true);
require __DIR__ . '/../../api/lib/bridge.php';
require __DIR__ . '/../../api/lib/pii.php';
require __DIR__ . '/../../api/lib/ratelimit.php';
require __DIR__ . '/../../api/lib/upstream.php';

$FAILS = 0;
$PASSES = 0;
function check($cond, $name)
{
    global $FAILS, $PASSES;
    if ($cond) {
        $PASSES++;
        echo "ok - $name\n";
    } else {
        $FAILS++;
        echo "NOT OK - $name\n";
    }
}

function cfg($over = array())
{
    $c = array(
        'api_key' => 'test-not-a-key',
        'model' => 'test-model',
        'api_url' => 'https://example.invalid/v1/messages',
        'api_version' => '2023-06-01',
        'allowed_origins' => array('https://arkozgazbeton.com.tr'),
    );
    foreach ($over as $k => $v) {
        $c[$k] = $v;
    }
    return $c;
}

function deps($over = array())
{
    $calls = new stdClass();
    $calls->upstream = array();
    $calls->logs = array();
    $calls->rl = array();
    $d = array(
        'config' => cfg(),
        'system_prompt' => 'TEST SISTEM PROMPTU',
        'upstream' => function ($json, $headers) use ($calls) {
            $calls->upstream[] = array('json' => $json, 'headers' => $headers);
            return array(
                'status' => 200,
                'body' => json_encode(array(
                    'id' => 'msg_test',
                    'model' => 'test-model',
                    'usage' => array('input_tokens' => 1),
                    'stop_reason' => 'end_turn',
                    'content' => array(array('type' => 'text', 'text' => 'Merhaba, yanıt.')),
                )),
                'errno' => 0,
            );
        },
        'rate_limit' => function ($ip) use ($calls) {
            $calls->rl[] = $ip;
            return null;
        },
        'log' => function ($e) use ($calls) {
            $calls->logs[] = $e;
        },
    );
    foreach ($over as $k => $v) {
        $d[$k] = $v;
    }
    return array($d, $calls);
}

function srv($over = array())
{
    $s = array(
        'REQUEST_METHOD' => 'POST',
        'HTTP_ORIGIN' => 'https://arkozgazbeton.com.tr',
        'HTTP_SEC_FETCH_SITE' => 'same-origin',
        'REMOTE_ADDR' => '203.0.113.7',
        'CONTENT_TYPE' => 'application/json',
    );
    foreach ($over as $k => $v) {
        if ($v === null) {
            unset($s[$k]);
        } else {
            $s[$k] = $v;
        }
    }
    return $s;
}

function body($messages)
{
    return json_encode(array('messages' => $messages), JSON_UNESCAPED_UNICODE);
}
function user($c)
{
    return array('role' => 'user', 'content' => $c);
}
function bot($c)
{
    return array('role' => 'assistant', 'content' => $c);
}
function no_cors($r)
{
    foreach ($r['headers'] as $k => $_v) {
        if (stripos($k, 'access-control') === 0) {
            return false;
        }
    }
    return true;
}
function err_of($r)
{
    $d = json_decode($r['body'], true);
    return is_array($d) && isset($d['error']) ? $d['error'] : null;
}

// ---------------------------------------------------------------- 1. PII vektörleri
$vectors = json_decode(file_get_contents(__DIR__ . '/../pii-vectors.json'), true);
check(is_array($vectors) && count($vectors) === 44, 'pii-vectors.json 44 vektör');
foreach ($vectors as $v) {
    $r = arkoz_pii_detect($v['input']);
    check($r['blocked'] === $v['blocked'] && $r['types'] === $v['types'], 'pii: ' . $v['input']);
}

// ---------------------------------------------------------------- 2. Metot
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(array('REQUEST_METHOD' => 'OPTIONS')), '', $d);
check($r['status'] === 204 && $r['body'] === '' && no_cors($r), 'OPTIONS → 204, gövde yok, CORS yok');
$r = arkoz_chat_handle(srv(array('REQUEST_METHOD' => 'GET')), '', $d);
check($r['status'] === 405 && isset($r['headers']['Allow']) && $r['headers']['Allow'] === 'POST, OPTIONS'
    && err_of($r) === 'Method not allowed', 'GET → 405 + Allow');
check($r['headers']['Content-Type'] === 'application/json; charset=utf-8'
    && $r['headers']['Cache-Control'] === 'no-store' && $r['headers']['X-Content-Type-Options'] === 'nosniff',
    'standart başlıklar');

// ---------------------------------------------------------------- 3. Config
foreach (array(
    'null' => null,
    'api_version boş' => cfg(array('api_version' => '')),
    "api_key satır sonu" => cfg(array('api_key' => "abc\n")),
    'api_url http' => cfg(array('api_url' => 'http://example.invalid')),
    'allowed_origins boş' => cfg(array('allowed_origins' => array())),
) as $name => $bad) {
    list($d, $c) = deps(array('config' => $bad));
    $r = arkoz_chat_handle(srv(), body(array(user('Merhaba'))), $d);
    check($r['status'] === 500 && err_of($r) === 'Sunucu hatası, lütfen tekrar deneyin.' && in_array('config_invalid', $c->logs, true)
        && count($c->upstream) === 0, 'config geçersiz (' . $name . ') → 500 + config_invalid');
}
list($d, $c) = deps(array('config' => cfg(array('api_key' => '  key-with-spaces  '))));
$r = arkoz_chat_handle(srv(), body(array(user('Merhaba'))), $d);
check($r['status'] === 200 && in_array('x-api-key: key-with-spaces', $c->upstream[0]['headers'], true), 'api_key trim edilerek kullanılır');

// ---------------------------------------------------------------- 4. Origin
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(array('HTTP_ORIGIN' => 'https://ornek.example')), body(array(user('Merhaba'))), $d);
check($r['status'] === 403 && count($c->upstream) === 0 && err_of($r) === 'Bu istek bu siteden yapılmadığı için reddedildi.', 'yabancı Origin → 403, upstream 0');
$r = arkoz_chat_handle(srv(array('HTTP_ORIGIN' => 'https://www.arkozgazbeton.com.tr')), body(array(user('Merhaba'))), $d);
check($r['status'] === 403, 'www Origin → 403');
$r = arkoz_chat_handle(srv(array('HTTP_SEC_FETCH_SITE' => 'cross-site')), body(array(user('Merhaba'))), $d);
check($r['status'] === 403, 'Sec-Fetch-Site: cross-site → 403');
$r = arkoz_chat_handle(srv(array('HTTP_ORIGIN' => null, 'HTTP_REFERER' => 'https://arkozgazbeton.com.tr/index.html')), body(array(user('Merhaba'))), $d);
check($r['status'] === 200, 'Origin yok ama Referer izinli → geçer');
$r = arkoz_chat_handle(srv(array('HTTP_ORIGIN' => null, 'HTTP_REFERER' => 'https://arkozgazbeton.com.tr.evil.example/')), body(array(user('Merhaba'))), $d);
check($r['status'] === 403, 'benzer alan adlı Referer → 403');

// ---------------------------------------------------------------- 5. İstek sınırı zinciri
list($d, $c) = deps(array('rate_limit' => function ($ip) {
    return array('status' => 429, 'error' => 'Çok hızlı yazıyorsunuz. Lütfen bir dakika bekleyip tekrar deneyin.');
}));
$r = arkoz_chat_handle(srv(), 'bozuk', $d);
check($r['status'] === 429 && count($c->upstream) === 0, 'istek sınırı gövde doğrulamasından önce (geçersiz istek de kotadan düşer)');
list($d, $c) = deps(array('rate_limit' => function ($ip) {
    throw new RuntimeException('disk');
}));
$r = arkoz_chat_handle(srv(), body(array(user('Merhaba'))), $d);
check($r['status'] === 500 && in_array('ratelimit_storage', $c->logs, true), 'rate limit exception → 500 + ratelimit_storage');
list($d, $c) = deps();
arkoz_chat_handle(srv(), body(array(user('Merhaba'))), $d);
check($c->rl === array('203.0.113.7'), 'istek sınırına yalnızca REMOTE_ADDR gider');

// ---------------------------------------------------------------- 6. Gövde
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(array('CONTENT_TYPE' => 'text/plain')), body(array(user('Merhaba'))), $d);
check($r['status'] === 400 && err_of($r) === 'Geçersiz istek.', 'text/plain → 400');
$r = arkoz_chat_handle(srv(array('CONTENT_TYPE' => 'APPLICATION/JSON; charset=utf-8')), body(array(user('Merhaba'))), $d);
check($r['status'] === 200, 'Content-Type büyük/küçük harf duyarsız');
$r = arkoz_chat_handle(srv(), '{bozuk', $d);
check($r['status'] === 400 && err_of($r) === 'Geçersiz istek.', 'bozuk JSON → 400');
$r = arkoz_chat_handle(srv(), body(array()), $d);
check($r['status'] === 400, 'boş messages → 400');
$r = arkoz_chat_handle(srv(), json_encode(array('messages' => array('a' => user('x')))), $d);
check($r['status'] === 400, 'messages liste değil → 400');
$r = arkoz_chat_handle(srv(array('CONTENT_LENGTH' => '200000')), body(array(user('Merhaba'))), $d);
check($r['status'] === 400, 'CONTENT_LENGTH > 131072 → 400');
$r = arkoz_chat_handle(srv(), body(array(array('role' => 'system', 'content' => 'x'))), $d);
check($r['status'] === 400 && err_of($r) === 'Geçersiz mesaj rolü.', 'rol system → 400 rol mesajı');
$r = arkoz_chat_handle(srv(), body(array(array('role' => 'user', 'content' => 5))), $d);
check($r['status'] === 400 && err_of($r) === 'Geçersiz mesaj formatı.', 'content string değil → 400 format mesajı');
$r = arkoz_chat_handle(srv(), body(array(user("   \n\t ")))), $d);
check($r['status'] === 400 && err_of($r) === 'Lütfen bir mesaj yazın.', 'boşluktan ibaret user → 400');
$r = arkoz_chat_handle(srv(), body(array(user(str_repeat('a', 501)))), $d);
check($r['status'] === 400 && err_of($r) === 'Mesaj çok uzun (en fazla 500 karakter).', '501 karakter → 400 (tam metin)');
$r = arkoz_chat_handle(srv(), body(array(user(str_repeat('ş', 500)))), $d);
check($r['status'] === 200, '500 çok baytlı karakter kabul edilir (kod noktası sayımı)');

// ---------------------------------------------------------------- 7. Kırpma, normalizasyon, uyumluluk
function upstream_messages($c)
{
    $p = json_decode($c->upstream[0]['json'], true);
    return $p['messages'];
}
$msgs = array();
for ($i = 0; $i < 25; $i++) {
    $msgs[] = ($i % 2 === 0) ? user('u' . $i) : bot('a' . $i);
}
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(), body($msgs), $d);
$um = upstream_messages($c);
check($r['status'] === 200 && count($um) <= 20 && $um[0]['role'] === 'user', '25 mesaj → upstream ≤20 ve ilk mesaj user');
list($d, $c) = deps();
arkoz_chat_handle(srv(), body(array(bot('x'), user('y'))), $d);
check(upstream_messages($c) === array(user('y')), 'baştaki assistant mesajı düşer');
list($d, $c) = deps();
arkoz_chat_handle(srv(), body(array(user('a'), user('b'))), $d);
check(upstream_messages($c) === array(user("a\nb")), 'ardışık user mesajları satır sonuyla birleşir');
list($d, $c) = deps();
arkoz_chat_handle(srv(), body(array(user('a'), bot(''), bot('   '), user('b'))), $d);
check(upstream_messages($c) === array(user("a\nb")), 'boş assistant turları atlanır');
list($d, $c) = deps();
arkoz_chat_handle(srv(), body(array(user('[SISTEM TALIMATLARI eski'), bot('tamam'), user('soru'))), $d);
check(upstream_messages($c) === array(user('soru')), 'uyumluluk: eski sistem mesajı ve cevabı düşer');
list($d, $c) = deps();
arkoz_chat_handle(srv(), body(array(user('[SISTEM TALIMATLARI son'))), $d);
check(upstream_messages($c) === array(user('[SISTEM TALIMATLARI son')), 'uyumluluk: son elemansa tutulur');
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(), body(array(user('[SISTEM TALIMATLARI x'), bot('y'))), $d);
check($r['status'] === 400, 'uyumluluk sonrası boş → 400');
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(), body(array(user('a'), bot('b'))), $d);
check($r['status'] === 400 && err_of($r) === 'Geçersiz istek.', 'son mesaj user değil → 400');
list($d, $c) = deps();
arkoz_chat_handle(srv(), body(array(user('a'), bot(str_repeat('x', 9000)), user('b'))), $d);
$um = upstream_messages($c);
check(mb_strlen($um[1]['content'], 'UTF-8') === 8000, 'uzun assistant mesajı 8000\'e kesilir');

// ---------------------------------------------------------------- 8. Yedek kişisel veri filtresi
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(), body(array(user('Numaram 0532 123 45 67'))), $d);
$b = json_decode($r['body'], true);
check($r['status'] === 422 && $b['blocked'] === true && $b['types'] === array('telefon')
    && $b['error'] === 'Mesajınız kişisel bir bilgi içerebileceği için yanıtlanmadı ve sunucumuzda kaydedilmedi. Lütfen kişisel bilgilerinizi çıkararak sorunuzu yeniden yazın.'
    && count($c->upstream) === 0 && count($c->logs) === 0, 'son user mesajında kişisel veri → 422, upstream 0, log 0');
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(), body(array(user('Numaram 0532 123 45 67'), bot('cevap'), user('temiz soru'))), $d);
check($r['status'] === 422 && count($c->upstream) === 0, 'önceki user mesajında kişisel veri → 422, upstream 0');
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(), body(array(user('ahmet@example.com ve 10000000146'), )), $d);
$b = json_decode($r['body'], true);
check($r['status'] === 422 && $b['types'] === array('tckn', 'eposta'), '422 türleri ORDER sırasıyla');
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(), body(array(user('temiz'), bot('Telefon: 0532 123 45 67'), user('devam'))), $d);
check($r['status'] === 200 && count($c->upstream) === 1, 'kişisel veri yalnızca assistant mesajında → engellenmez');

// ---------------------------------------------------------------- 9. Temiz istek ve yük
list($d, $c) = deps();
$r = arkoz_chat_handle(srv(array('HTTP_USER_AGENT' => 'TestUA/1.0', 'HTTP_COOKIE' => 'sid=abc')), body(array(user('Gazbeton nedir?'))), $d);
check($r['status'] === 200 && count($c->upstream) === 1, 'temiz istek → 200, upstream 1');
$p = json_decode($c->upstream[0]['json'], true);
check(array_keys($p) === array('model', 'max_tokens', 'system', 'messages'), 'yük anahtarları tam olarak model,max_tokens,system,messages');
check($p['max_tokens'] === 1024 && $p['model'] === 'test-model', 'max_tokens 1024, model config\'ten');
check($p['system'] === array(array('type' => 'text', 'text' => 'TEST SISTEM PROMPTU', 'cache_control' => array('type' => 'ephemeral'))), 'system bloğu');
check($c->upstream[0]['headers'] === array('content-type: application/json', 'x-api-key: test-not-a-key', 'anthropic-version: 2023-06-01', 'Expect:'), 'başlık dizisi tam dört girdi');
$all = $c->upstream[0]['json'] . implode('|', $c->upstream[0]['headers']);
check(strpos($all, 'TestUA/1.0') === false && strpos($all, 'sid=abc') === false && strpos($all, '203.0.113.7') === false, 'yük ve başlıklarda UA, çerez ve IP yok');
$b = json_decode($r['body'], true);
check(array_keys($b) === array('content') && $b['content'] === array(array('type' => 'text', 'text' => 'Merhaba, yanıt.')), 'yanıt anahtarları yalnızca content');

// ---------------------------------------------------------------- 10. stripEmoji (beklenenler orijinal JS ile node üzerinden üretildi)
$emojiCases = array(
    array("Merhaba 👋 dünya", "Merhaba dünya"),
    array("Onay ✓ tamam → devam • madde", "Onay ✓ tamam → devam • madde"),
    array("A  B   C", "A B C"),
    array("satır sonu   \nikinci  \nüçüncü", "satır sonu\nikinci\nüçüncü"),
    array("🇹🇷 bayrak ve 🎉 kutlama", " bayrak ve kutlama"),
    array("👍🏽 ok", " ok"),
    array("sadece emoji 🎉🎉", "sadece emoji"),
    array("tab\t\tsonra", "tab sonra"),
    array("Arkoz Blok: yangın A1 ✔ ★ ☎", "Arkoz Blok: yangın A1 ✔"),
);
foreach ($emojiCases as $ec) {
    check(arkoz_strip_emoji($ec[0]) === $ec[1], 'stripEmoji: ' . json_encode($ec[0], JSON_UNESCAPED_UNICODE));
}
list($d, $c) = deps(array('upstream' => function ($json, $h) {
    return array('status' => 200, 'body' => json_encode(array('content' => array(array('type' => 'text', 'text' => '🎉🎉')))), 'errno' => 0);
}));
$r = arkoz_chat_handle(srv(), body(array(user('x'))), $d);
$b = json_decode($r['body'], true);
check($r['status'] === 200 && $b['content'][0]['text'] === 'Bir sorun oluştu, sorunuzu tekrar yazar mısınız?', 'boş içerik → yedek mesaj');
list($d, $c) = deps(array('upstream' => function ($json, $h) {
    return array('status' => 200, 'body' => json_encode(array('content' => array(
        array('type' => 'text', 'text' => 'Bir'), array('type' => 'tool_use', 'id' => 'x'), array('type' => 'text', 'text' => 'İki 😀'),
    ))), 'errno' => 0);
}));
$r = arkoz_chat_handle(srv(), body(array(user('x'))), $d);
$b = json_decode($r['body'], true);
check($b['content'][0]['text'] === "Bir\n\nİki", 'birden fazla metin bloğu tek blokta birleşir');

// ---------------------------------------------------------------- 11. Yukarı akış hataları
list($d, $c) = deps(array('upstream' => function ($json, $h) {
    return array('status' => 529, 'body' => '{"error":{"message":"GIZLI-USTAKIS-HATA"}}', 'errno' => 0);
}));
$r = arkoz_chat_handle(srv(), body(array(user('GIZLI-KULLANICI-METNI'))), $d);
check($r['status'] === 502 && err_of($r) === 'Asistan şu anda yanıt veremiyor.' && in_array('upstream_status=529', $c->logs, true), 'upstream 529 → 502 + upstream_status=529');
check(strpos(implode('|', $c->logs), 'GIZLI') === false, 'log olayları kullanıcı metnini ya da yukarı akış gövdesini içermez');
list($d, $c) = deps(array('upstream' => function ($json, $h) {
    return array('status' => 0, 'body' => null, 'errno' => 7);
}));
$r = arkoz_chat_handle(srv(), body(array(user('GIZLI-KULLANICI-METNI'))), $d);
check($r['status'] === 500 && in_array('upstream_transport errno=7', $c->logs, true) && strpos(implode('|', $c->logs), 'GIZLI') === false, 'transport hatası → 500 + upstream_transport');
list($d, $c) = deps(array('upstream' => function ($json, $h) {
    return array('status' => 200, 'body' => 'bozuk', 'errno' => 0);
}));
$r = arkoz_chat_handle(srv(), body(array(user('x'))), $d);
check($r['status'] === 500 && in_array('upstream_parse', $c->logs, true), 'bozuk yukarı akış gövdesi → 500 + upstream_parse');
list($d, $c) = deps(array('upstream' => function ($json, $h) {
    throw new LogicException('beklenmeyen');
}));
$r = arkoz_chat_handle(srv(), body(array(user('x'))), $d);
check($r['status'] === 500 && in_array('exception LogicException', $c->logs, true), 'beklenmeyen hata → 500 + exception <Sınıf>');

// ---------------------------------------------------------------- 12. Özel dizin güvenliği
check(arkoz_private_dir_safe('/home/u/arkoz-private', '/home/u/public_html', '/home/u/public_html') === true, 'private_dir: cPanel düzeni güvenli');
check(arkoz_private_dir_safe('/home/u/public_html/arkoz-private', '/home/u/public_html', '/home/u/public_html') === false, 'private_dir: web kökü altı güvensiz');
check(arkoz_private_dir_safe('/home/u/public_html/arkoz-private', '/home/u/public_html/site', '/home/u/public_html/site') === false, 'private_dir: public_html parçası güvensiz');
check(arkoz_private_dir_safe('/var/www/vhosts/x/arkoz-private', '/var/www/vhosts/x/httpdocs', '/var/www/vhosts/x/httpdocs') === true, 'private_dir: Plesk Linux güvenli');
check(arkoz_private_dir_safe('C:\\Inetpub\\vhosts\\x\\arkoz-private', 'C:\\Inetpub\\vhosts\\x\\httpdocs', 'C:\\Inetpub\\vhosts\\x\\httpdocs') === true, 'private_dir: Plesk Windows güvenli');
check(arkoz_private_dir_safe('', '/home/u/public_html', '/home/u/public_html') === false, 'private_dir: boş yol güvensiz');
check(arkoz_private_dir_safe('/HOME/U/PUBLIC_HTML/x', '/home/u/public_html', '') === false, 'private_dir: büyük/küçük harf duyarsız');

// ---------------------------------------------------------------- 13. cURL seçenekleri
check(extension_loaded('curl'), 'curl eklentisi yüklü');
$opts = arkoz_upstream_curl_options('{}', array('a: b'));
foreach (array('CURLOPT_USERAGENT', 'CURLOPT_COOKIE', 'CURLOPT_REFERER', 'CURLOPT_ENCODING') as $k) {
    check(!defined($k) || !array_key_exists(constant($k), $opts), 'curl: ' . $k . ' ayarlanmamış');
}
check($opts[CURLOPT_SSL_VERIFYPEER] === true && $opts[CURLOPT_SSL_VERIFYHOST] === 2, 'curl: TLS doğrulama açık');
check($opts[CURLOPT_FOLLOWLOCATION] === false && $opts[CURLOPT_TIMEOUT] === 25 && $opts[CURLOPT_CONNECTTIMEOUT] === 10, 'curl: yönlendirme kapalı, zaman aşımı 25/10');
$httpsOnly = (defined('CURLOPT_PROTOCOLS_STR') && isset($opts[CURLOPT_PROTOCOLS_STR]) && $opts[CURLOPT_PROTOCOLS_STR] === 'https')
    || (isset($opts[CURLOPT_PROTOCOLS]) && $opts[CURLOPT_PROTOCOLS] === CURLPROTO_HTTPS);
check($httpsOnly, 'curl: yalnızca https');
check($opts[CURLOPT_POST] === true && $opts[CURLOPT_POSTFIELDS] === '{}' && $opts[CURLOPT_HTTPHEADER] === array('a: b') && $opts[CURLOPT_RETURNTRANSFER] === true, 'curl: POST/gövde/başlık/RETURNTRANSFER');

// ---------------------------------------------------------------- 14. İstek sınırı (geçici dizin, enjekte edilen zaman)
function rl_tmp()
{
    $d = sys_get_temp_dir() . '/arkoz-rl-' . bin2hex(random_bytes(4));
    mkdir($d, 0700, true);
    return $d;
}
function rl_cleanup($d)
{
    foreach (glob($d . '/{,.}*', GLOB_BRACE) as $f) {
        if (is_file($f)) {
            @unlink($f);
        }
    }
    @rmdir($d);
}
$base = 1700000000;
$dir = rl_tmp();
$okCount = 0;
for ($i = 0; $i < 20; $i++) {
    if (arkoz_rate_limit($dir, '203.0.113.7', $base + $i) === null) {
        $okCount++;
    }
}
$r21 = arkoz_rate_limit($dir, '203.0.113.7', $base + 25);
check($okCount === 20 && is_array($r21) && $r21['status'] === 429 && $r21['error'] === 'Çok hızlı yazıyorsunuz. Lütfen bir dakika bekleyip tekrar deneyin.', 'aynı dakikada 21. istek → dakika mesajı');
check(arkoz_rate_limit($dir, '203.0.113.7', $base + 60) === null, 'bir sonraki dakika serbest');
check(arkoz_rate_limit($dir, '203.0.113.8', $base + 25) === null, 'farklı IP ayrı kova');
rl_cleanup($dir);

$dir = rl_tmp();
$allowed = 0;
for ($i = 0; $i < 200; $i++) {
    if (arkoz_rate_limit($dir, '203.0.113.7', $base + intdiv($i, 20) * 60) === null) {
        $allowed++;
    }
}
$r201 = arkoz_rate_limit($dir, '203.0.113.7', $base + 11 * 60);
check($allowed === 200 && is_array($r201) && $r201['error'] === 'Günlük mesaj limitiniz doldu. Yarın tekrar deneyin.', '201. istek → gün mesajı');
$leak = false;
foreach (scandir($dir) as $f) {
    if ($f === '.' || $f === '..') {
        continue;
    }
    if (strpos($f, '203.0.113.7') !== false || (is_file($dir . '/' . $f) && strpos((string) file_get_contents($dir . '/' . $f), '203.0.113.7') !== false)) {
        $leak = true;
    }
}
check(!$leak, 'dizindeki hiçbir dosya adı ya da içerik ham IP içermez');
$names = array_values(array_filter(scandir($dir), function ($f) {
    return $f !== '.' && $f !== '..';
}));
$today = arkoz_rate_limit_today($base);
$patternOk = true;
foreach ($names as $f) {
    if ($f !== '.lock' && !preg_match('/^daykey-' . $today . '\.bin$/', $f) && !preg_match('/^rl-' . $today . '-[0-9a-f]{64}\.json$/', $f)) {
        $patternOk = false;
    }
}
check($patternOk && count($names) === 3, 'dizinde yalnızca .lock, daykey-<gün>.bin ve rl-<gün>-<hex>.json var');
rl_cleanup($dir);

$dir = rl_tmp();
for ($i = 0; $i < 20; $i++) {
    arkoz_rate_limit($dir, '2001:db8:abcd:1::1', $base + $i);
}
$same = arkoz_rate_limit($dir, '2001:db8:abcd:1::2', $base + 25);
$other = arkoz_rate_limit($dir, '2001:db8:abcd:2::1', $base + 25);
check(is_array($same) && $same['status'] === 429, 'aynı /64 içindeki IPv6 adresleri kovayı paylaşır');
check($other === null, 'farklı /64 kovayı paylaşmaz');
check(arkoz_rate_limit_bucket('2001:db8:abcd:1::1') === arkoz_rate_limit_bucket('2001:db8:abcd:1::ffff') && arkoz_rate_limit_bucket('203.0.113.7') === '203.0.113.7', 'bucket: IPv6 /64, IPv4 aynen');
rl_cleanup($dir);

$dir = rl_tmp();
file_put_contents($dir . '/daykey-20000101.bin', random_bytes(32));
file_put_contents($dir . '/rl-20000101-' . str_repeat('0', 64) . '.json', '{"w":1,"m":1,"d":1}');
arkoz_rate_limit($dir, '203.0.113.7', $base);
check(!file_exists($dir . '/daykey-20000101.bin') && !file_exists($dir . '/rl-20000101-' . str_repeat('0', 64) . '.json'), 'gün değişince eski dosyalar arkoz_rate_limit ile silinir');
file_put_contents($dir . '/daykey-20000101.bin', random_bytes(32));
file_put_contents($dir . '/rl-20000101-' . str_repeat('1', 64) . '.json', '{}');
$failed = arkoz_rate_limit_gc($dir, $base);
check($failed === 0 && !file_exists($dir . '/daykey-20000101.bin') && !file_exists($dir . '/rl-20000101-' . str_repeat('1', 64) . '.json'), 'arkoz_rate_limit_gc eski dosyaları siler, 0 döner');
check(file_exists($dir . '/daykey-' . $today . '.bin'), 'gc bugünün anahtarını korur');
rl_cleanup($dir);
$threw = false;
try {
    $res = arkoz_rate_limit_gc(sys_get_temp_dir() . '/arkoz-yok-' . bin2hex(random_bytes(4)), $base);
} catch (Throwable $e) {
    $threw = true;
    $res = -1;
}
check(!$threw && $res === 0, 'gc olmayan dizinde 0 döner, istisna fırlatmaz');

// ---------------------------------------------------------------- Sonuç
echo "\n{$PASSES} geçti, {$FAILS} başarısız\n";
exit($FAILS > 0 ? 1 : 0);
