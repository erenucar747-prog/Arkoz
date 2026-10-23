<?php
// PHP yerleşik sunucusuna karşı uçtan uca testler. Kullanım: php tests/php/integration.php <base-url> <özel-dizin>
// Yukarı akışa asla istek atılmaz: sahte config'teki adres bağlantıyı reddeder.
$base = isset($argv[1]) ? rtrim($argv[1], '/') : 'http://127.0.0.1:8099';
$priv = isset($argv[2]) ? rtrim($argv[2], '/') : '';
if ($priv === '' || !is_dir($priv)) {
    fwrite(STDERR, "özel dizin gerekli\n");
    exit(2);
}

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

function req($method, $url, $headers = array(), $body = null)
{
    $ch = curl_init($url);
    $opts = array(
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 20,
    );
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $hsize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    if ($raw === false) {
        return array('status' => 0, 'headers' => '', 'body' => '');
    }
    return array('status' => $status, 'headers' => substr($raw, 0, $hsize), 'body' => substr($raw, $hsize));
}
function has_header($r, $name)
{
    return stripos($r['headers'], "\n" . $name) !== false || stripos($r['headers'], "\r\n" . $name) !== false;
}

$rl = $priv . '/ratelimit';
if (!is_dir($rl)) {
    mkdir($rl, 0700, true);
}
$oldState = $rl . '/rl-20000101-' . str_repeat('a', 64) . '.json';
$oldKey = $rl . '/daykey-20000101.bin';
file_put_contents($oldState, '{"w":1,"m":1,"d":1}');
file_put_contents($oldKey, str_repeat('k', 32));

// 1. config yokken GET → 405; temizlik config'ten bağımsız
$r = req('GET', $base . '/api/chat.php');
check($r['status'] === 405, '1a GET → 405 (config yok)');
check(!has_header($r, 'Set-Cookie:'), '1b Set-Cookie yok');
check(stripos($r['headers'], 'Access-Control-') === false, '1c Access-Control-* yok');
check(!file_exists($oldState) && !file_exists($oldKey), '1d eski istek sınırı dosyaları silindi (temizlik config\'ten bağımsız)');
check(stripos($r['headers'], 'X-Powered-By') === false, '1e X-Powered-By yok');

// 2. config yokken izinli Origin'li POST → 500
$json = array('Content-Type: application/json', 'Origin: https://arkozgazbeton.com.tr');
$r = req('POST', $base . '/api/chat.php', $json, '{"messages":[{"role":"user","content":"Merhaba"}]}');
check($r['status'] === 500, '2 config yokken POST → 500');

// 3. sahte config
$cfg = "<?php\nreturn [\n    'api_key' => 'test-not-a-key',\n    'model' => 'test-model',\n    'api_url' => 'https://127.0.0.1:9/v1/messages',\n    'api_version' => '2023-06-01',\n    'allowed_origins' => ['https://arkozgazbeton.com.tr'],\n];\n";
file_put_contents($priv . '/config.php', $cfg);
check(is_file($priv . '/config.php'), '3 sahte config yazıldı');

// 4. yabancı Origin → 403
$r = req('POST', $base . '/api/chat.php', array('Content-Type: application/json', 'Origin: https://ornek.example'), '{"messages":[{"role":"user","content":"Merhaba"}]}');
check($r['status'] === 403, '4 yabancı Origin → 403');

// 5. kişisel veri → 422
$r = req('POST', $base . '/api/chat.php', $json, '{"messages":[{"role":"user","content":"Numaram 0532 123 45 67"}]}');
check($r['status'] === 422 && strpos($r['body'], '"blocked":true') !== false, '5 kişisel veri → 422 ve blocked:true');

// 6. temiz mesaj → 500 (yukarı akış adresi bağlantıyı reddeder)
$r = req('POST', $base . '/api/chat.php', $json, '{"messages":[{"role":"user","content":"Gazbeton nedir?"}]}');
check($r['status'] === 500, '6 temiz mesaj → 500 (zincir yukarı akış aşamasına ulaştı)');
check(!has_header($r, 'Set-Cookie:'), '6b POST yanıtında Set-Cookie yok');

// 7. ratelimit dizini
$today = (new DateTime('now', new DateTimeZone('Europe/Istanbul')))->format('Ymd');
$names = array_values(array_filter(scandir($rl), function ($f) {
    return $f !== '.' && $f !== '..';
}));
$ok = count($names) > 0;
foreach ($names as $f) {
    if ($f !== '.lock' && !preg_match('/^daykey-' . $today . '\.bin$/', $f) && !preg_match('/^rl-' . $today . '-[0-9a-f]{64}\.json$/', $f)) {
        $ok = false;
    }
    if (strpos($f, '127.0.0.1') !== false || (is_file($rl . '/' . $f) && strpos((string) file_get_contents($rl . '/' . $f), '127.0.0.1') !== false)) {
        $ok = false;
    }
}
check($ok, '7 ratelimit/ yalnızca .lock, daykey-<bugün>.bin, rl-<bugün>-<hex>.json; IP yok (' . implode(',', $names) . ')');

// 8. lib dosyasına doğrudan erişim
$r = req('GET', $base . '/api/lib/bridge.php');
check(strpos($r['body'], '<?php') === false && strpos($r['body'], 'function arkoz_') === false, '8 lib/bridge.php doğrudan erişimde kaynak sızdırmıyor (HTTP ' . $r['status'] . ')');

// 9. istek sınırı: 41 boş gövdeli POST → en az bir 429
$got429 = false;
for ($i = 0; $i < 41; $i++) {
    $r = req('POST', $base . '/api/chat.php', $json, '{}');
    if ($r['status'] === 429) {
        $got429 = true;
        break;
    }
}
check($got429, '9 art arda istekte 429 (dakika sınırı)');

echo "\n{$PASSES} geçti, {$FAILS} başarısız\n";
exit($FAILS > 0 ? 1 : 0);
