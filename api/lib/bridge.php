<?php
// Saf istek işleme zinciri: metot, config, origin, istek sınırı, gövde, uyumluluk filtresi,
// kırpma, doğrulama, yedek kişisel veri filtresi, normalizasyon, yukarı akış, yanıt.
// Bu dosya istek ortamına, dosya sistemine ya da ağa doğrudan dokunmaz; bağımlılıklar $deps ile gelir.
if (!defined('ARKOZ_CHAT')) {
    http_response_code(404);
    exit;
}

const ARKOZ_MAX_INPUT_LENGTH = 500;
const ARKOZ_MAX_REPLY_LENGTH = 8000;
const ARKOZ_MAX_HISTORY = 20;
const ARKOZ_MAX_TOKENS = 1024;
const ARKOZ_MAX_BODY_BYTES = 131072;
const ARKOZ_ERR_SERVER = 'Sunucu hatası, lütfen tekrar deneyin.';
const ARKOZ_ERR_INVALID = 'Geçersiz istek.';
const ARKOZ_SERVER_BLOCKED = 'Mesajınız kişisel bir bilgi içerebileceği için yanıtlanmadı ve sunucumuzda kaydedilmedi. Lütfen kişisel bilgilerinizi çıkararak sorunuzu yeniden yazın.';
const ARKOZ_EMPTY_REPLY = 'Bir sorun oluştu, sorunuzu tekrar yazar mısınız?';

// JavaScript String.prototype.trim() ile aynı boşluk kümesi.
function arkoz_js_trim(string $s): string
{
    $out = preg_replace(
        '/^[\s\x{00A0}\x{FEFF}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}]+|[\s\x{00A0}\x{FEFF}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}]+$/u',
        '',
        $s
    );
    return $out === null ? '' : $out;
}

// Eski köprüyle birebir: emoji ve süs sembolleri temizlenir, çoklu boşluk sadeleşir.
function arkoz_strip_emoji(string $s): string
{
    $s = preg_replace('/[\x{1F000}-\x{1FAFF}\x{2600}-\x{26FF}\x{2B00}-\x{2BFF}\x{1F1E6}-\x{1F1FF}\x{FE0F}\x{200D}\x{20E3}]/u', '', $s);
    $s = preg_replace('/[ \t]{2,}/', ' ', (string) $s);
    $s = preg_replace('/(*ANYCRLF)[ \t]+$/m', '', (string) $s);
    return (string) $s;
}

function arkoz_json_out(array $data): string
{
    $out = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    return $out === false ? '{"error":"Sunucu hatası, lütfen tekrar deneyin."}' : $out;
}

function arkoz_response(int $status, array $data, array $extraHeaders = array()): array
{
    $headers = array(
        'Content-Type' => 'application/json; charset=utf-8',
        'Cache-Control' => 'no-store',
        'X-Content-Type-Options' => 'nosniff',
    );
    foreach ($extraHeaders as $k => $v) {
        $headers[$k] = $v;
    }
    return array('status' => $status, 'headers' => $headers, 'body' => arkoz_json_out($data));
}

function arkoz_is_list(array $a): bool
{
    $i = 0;
    foreach ($a as $k => $_v) {
        if ($k !== $i) {
            return false;
        }
        $i++;
    }
    return true;
}

// Özel dizin web kökünün içindeyse ya da web kökü gibi adlandırılmış bir parçası varsa güvenli değildir.
function arkoz_private_dir_safe(string $privReal, string $docRootReal, string $webDirReal): bool
{
    $norm = function ($p) {
        return strtolower(rtrim(str_replace('\\', '/', (string) $p), '/'));
    };
    $priv = $norm($privReal);
    if ($priv === '') {
        return false;
    }
    foreach (array($docRootReal, $webDirReal) as $base) {
        $b = $norm($base);
        if ($b === '') {
            continue;
        }
        if ($priv === $b || strpos($priv, $b . '/') === 0) {
            return false;
        }
    }
    $forbidden = array('public_html', 'private_html', 'httpdocs', 'httpsdocs', 'htdocs', 'wwwroot');
    foreach (explode('/', $priv) as $part) {
        if (in_array($part, $forbidden, true)) {
            return false;
        }
    }
    return true;
}

function arkoz_config_valid($cfg): bool
{
    if (!is_array($cfg)) {
        return false;
    }
    if (!isset($cfg['api_key']) || !is_string($cfg['api_key'])) {
        return false;
    }
    $key = $cfg['api_key'];
    if (trim($key) === '' || strpos($key, "\r") !== false || strpos($key, "\n") !== false) {
        return false;
    }
    if (!isset($cfg['model']) || !is_string($cfg['model']) || $cfg['model'] === '') {
        return false;
    }
    if (!isset($cfg['api_url']) || !is_string($cfg['api_url']) || strpos($cfg['api_url'], 'https://') !== 0) {
        return false;
    }
    if (!isset($cfg['api_version']) || !is_string($cfg['api_version']) || $cfg['api_version'] === '') {
        return false;
    }
    if (!isset($cfg['allowed_origins']) || !is_array($cfg['allowed_origins']) || count($cfg['allowed_origins']) === 0) {
        return false;
    }
    foreach ($cfg['allowed_origins'] as $o) {
        if (!is_string($o)) {
            return false;
        }
    }
    return true;
}

function arkoz_origin_allowed(array $server, array $origins): bool
{
    $origin = isset($server['HTTP_ORIGIN']) ? (string) $server['HTTP_ORIGIN'] : '';
    $ok = $origin !== '' && in_array($origin, $origins, true);
    if (!$ok) {
        $ref = isset($server['HTTP_REFERER']) ? (string) $server['HTTP_REFERER'] : '';
        if ($ref !== '') {
            foreach ($origins as $o) {
                if (strpos($ref, $o . '/') === 0 || $ref === $o) {
                    $ok = true;
                    break;
                }
            }
        }
    }
    if (!$ok) {
        return false;
    }
    if (isset($server['HTTP_SEC_FETCH_SITE'])) {
        $site = strtolower(trim((string) $server['HTTP_SEC_FETCH_SITE']));
        if ($site !== '' && $site !== 'same-origin') {
            return false;
        }
    }
    return true;
}

// $deps: 'config' => array|null, 'system_prompt' => string,
//        'upstream' => callable(string $json, array $headerLines): array{status:int, body:?string, errno:int},
//        'rate_limit' => callable(string $ip): ?array{status:int, error:string},  // throw = depolama hatası
//        'log' => callable(string $event): void
// döner: ['status' => int, 'headers' => array<string,string>, 'body' => string]
function arkoz_chat_handle(array $server, string $rawBody, array $deps): array
{
    $log = isset($deps['log']) && is_callable($deps['log']) ? $deps['log'] : function ($_e) {
    };
    try {
        // 1. Metot
        $method = isset($server['REQUEST_METHOD']) ? strtoupper((string) $server['REQUEST_METHOD']) : '';
        if ($method === 'OPTIONS') {
            return array(
                'status' => 204,
                'headers' => array('Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff'),
                'body' => '',
            );
        }
        if ($method !== 'POST') {
            return arkoz_response(405, array('error' => 'Method not allowed'), array('Allow' => 'POST, OPTIONS'));
        }

        // 2. Config
        $cfg = isset($deps['config']) ? $deps['config'] : null;
        if (!arkoz_config_valid($cfg)) {
            $log('config_invalid');
            return arkoz_response(500, array('error' => ARKOZ_ERR_SERVER));
        }
        $apiKey = trim($cfg['api_key']);

        // 3. Origin
        if (!arkoz_origin_allowed($server, $cfg['allowed_origins'])) {
            return arkoz_response(403, array('error' => 'Bu istek bu siteden yapılmadığı için reddedildi.'));
        }

        // 4. IP (yalnızca REMOTE_ADDR)
        $ip = isset($server['REMOTE_ADDR']) && (string) $server['REMOTE_ADDR'] !== ''
            ? (string) $server['REMOTE_ADDR']
            : 'unknown';

        // 5. İstek sınırı (gövde doğrulamasından önce)
        try {
            $rl = $deps['rate_limit']($ip);
        } catch (Exception $e) {
            $log('ratelimit_storage');
            return arkoz_response(500, array('error' => ARKOZ_ERR_SERVER));
        }
        if ($rl !== null) {
            return arkoz_response((int) $rl['status'], array('error' => (string) $rl['error']));
        }

        // 6. Gövde
        $ct = isset($server['CONTENT_TYPE']) ? (string) $server['CONTENT_TYPE'] : '';
        if (stripos($ct, 'application/json') !== 0) {
            return arkoz_response(400, array('error' => ARKOZ_ERR_INVALID));
        }
        $cl = isset($server['CONTENT_LENGTH']) ? (int) $server['CONTENT_LENGTH'] : 0;
        if ($cl > ARKOZ_MAX_BODY_BYTES || strlen($rawBody) > ARKOZ_MAX_BODY_BYTES) {
            return arkoz_response(400, array('error' => ARKOZ_ERR_INVALID));
        }
        $decoded = json_decode($rawBody, true, 64);
        if (!is_array($decoded) || !isset($decoded['messages']) || !is_array($decoded['messages'])
            || count($decoded['messages']) === 0 || !arkoz_is_list($decoded['messages'])) {
            return arkoz_response(400, array('error' => ARKOZ_ERR_INVALID));
        }
        $messages = $decoded['messages'];

        // 7. Uyumluluk filtresi (orijinal indekslerle)
        $filtered = array();
        $n = count($messages);
        for ($i = 0; $i < $n; $i++) {
            $m = $messages[$i];
            if (is_array($m) && isset($m['content']) && is_string($m['content'])) {
                $role = isset($m['role']) ? $m['role'] : null;
                if ($role === 'user' && $i < $n - 1 && strpos($m['content'], '[SISTEM TALIMATLARI') === 0) {
                    continue;
                }
                if ($role === 'assistant' && $i > 0) {
                    $prev = $messages[$i - 1];
                    if (is_array($prev) && isset($prev['content']) && is_string($prev['content'])
                        && strpos($prev['content'], '[SISTEM TALIMATLARI') === 0) {
                        continue;
                    }
                }
            }
            $filtered[] = $m;
        }
        if (count($filtered) === 0) {
            return arkoz_response(400, array('error' => ARKOZ_ERR_INVALID));
        }

        // 8. Kırpma
        if (count($filtered) > ARKOZ_MAX_HISTORY) {
            $filtered = array_slice($filtered, -ARKOZ_MAX_HISTORY);
        }

        // 9. Doğrulama
        foreach ($filtered as $idx => $m) {
            if (!is_array($m) || !isset($m['content']) || !is_string($m['content'])) {
                return arkoz_response(400, array('error' => 'Geçersiz mesaj formatı.'));
            }
            $role = isset($m['role']) ? $m['role'] : null;
            if ($role !== 'user' && $role !== 'assistant') {
                return arkoz_response(400, array('error' => 'Geçersiz mesaj rolü.'));
            }
            if ($role === 'user') {
                if (arkoz_js_trim($m['content']) === '') {
                    return arkoz_response(400, array('error' => 'Lütfen bir mesaj yazın.'));
                }
                if (mb_strlen($m['content'], 'UTF-8') > ARKOZ_MAX_INPUT_LENGTH) {
                    return arkoz_response(400, array('error' => 'Mesaj çok uzun (en fazla ' . ARKOZ_MAX_INPUT_LENGTH . ' karakter).'));
                }
            } elseif (mb_strlen($m['content'], 'UTF-8') > ARKOZ_MAX_REPLY_LENGTH) {
                $filtered[$idx]['content'] = mb_substr($m['content'], 0, ARKOZ_MAX_REPLY_LENGTH, 'UTF-8');
            }
        }

        // 10. Yedek kişisel veri filtresi (bütün user mesajları)
        $found = array();
        foreach ($filtered as $m) {
            if ($m['role'] === 'user') {
                $r = arkoz_pii_detect($m['content']);
                foreach ($r['types'] as $t) {
                    $found[$t] = true;
                }
            }
        }
        if (count($found) > 0) {
            $types = array();
            foreach (array('tckn', 'telefon', 'iban', 'eposta', 'vkn') as $t) {
                if (isset($found[$t])) {
                    $types[] = $t;
                }
            }
            return arkoz_response(422, array('blocked' => true, 'types' => $types, 'error' => ARKOZ_SERVER_BLOCKED));
        }

        // 11. Normalizasyon
        $clean = array();
        foreach ($filtered as $m) {
            if ($m['role'] === 'assistant' && arkoz_js_trim($m['content']) === '') {
                continue;
            }
            if (count($clean) === 0 && $m['role'] !== 'user') {
                continue;
            }
            $last = count($clean) - 1;
            if ($last >= 0 && $clean[$last]['role'] === $m['role']) {
                $clean[$last]['content'] = mb_substr($clean[$last]['content'] . "\n" . $m['content'], 0, ARKOZ_MAX_REPLY_LENGTH, 'UTF-8');
            } else {
                $clean[] = array('role' => $m['role'], 'content' => $m['content']);
            }
        }
        if (count($clean) === 0 || $clean[count($clean) - 1]['role'] !== 'user') {
            return arkoz_response(400, array('error' => ARKOZ_ERR_INVALID));
        }

        // 12. Yukarı akış yükü: tam olarak dört anahtar
        $payload = array(
            'model' => $cfg['model'],
            'max_tokens' => ARKOZ_MAX_TOKENS,
            'system' => array(
                array(
                    'type' => 'text',
                    'text' => (string) (isset($deps['system_prompt']) ? $deps['system_prompt'] : ''),
                    'cache_control' => array('type' => 'ephemeral'),
                ),
            ),
            'messages' => $clean,
        );
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            $log('upstream_encode');
            return arkoz_response(500, array('error' => ARKOZ_ERR_SERVER));
        }
        $headerLines = array(
            'content-type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: ' . $cfg['api_version'],
            'Expect:',
        );
        $res = $deps['upstream']($json, $headerLines);

        // 13. Yanıt
        $errno = isset($res['errno']) ? (int) $res['errno'] : 0;
        $status = isset($res['status']) ? (int) $res['status'] : 0;
        if ($errno !== 0 || $status === 0) {
            $log('upstream_transport errno=' . $errno);
            return arkoz_response(500, array('error' => ARKOZ_ERR_SERVER));
        }
        if ($status < 200 || $status > 299) {
            $log('upstream_status=' . $status);
            return arkoz_response(502, array('error' => 'Asistan şu anda yanıt veremiyor.'));
        }
        $data = json_decode(isset($res['body']) ? (string) $res['body'] : '', true);
        if (!is_array($data)) {
            $log('upstream_parse');
            return arkoz_response(500, array('error' => ARKOZ_ERR_SERVER));
        }
        $texts = array();
        if (isset($data['content']) && is_array($data['content'])) {
            foreach ($data['content'] as $block) {
                if (is_array($block) && isset($block['type']) && $block['type'] === 'text'
                    && isset($block['text']) && is_string($block['text'])) {
                    $t = arkoz_strip_emoji($block['text']);
                    if (arkoz_js_trim($t) !== '') {
                        $texts[] = $t;
                    }
                }
            }
        }
        $text = count($texts) > 0 ? implode("\n\n", $texts) : ARKOZ_EMPTY_REPLY;
        return arkoz_response(200, array('content' => array(array('type' => 'text', 'text' => $text))));
    } catch (Throwable $e) {
        $log('exception ' . get_class($e));
        return arkoz_response(500, array('error' => ARKOZ_ERR_SERVER));
    }
}
