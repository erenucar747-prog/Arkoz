<?php
// Yapay zeka asistanı köprüsü — giriş noktası (ince katman).
// Config ve anahtar web kökünün DIŞINDAKİ özel dizinde durur; istek ortamından yalnızca izin
// listesindeki alanlar okunur; çerez yazılmaz, oturum açılmaz.
define('ARKOZ_CHAT', true);

if (function_exists('ini_set')) {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}
if (function_exists('set_time_limit')) {
    set_time_limit(40);
}
if (function_exists('header_remove')) {
    header_remove('X-Powered-By');
}

require __DIR__ . '/lib/bridge.php';
require __DIR__ . '/lib/pii.php';
require __DIR__ . '/lib/ratelimit.php';
require __DIR__ . '/lib/upstream.php';

// İstek ortamından yalnızca izin listesindeki alanlar okunur.
$server = array();
foreach (array('REQUEST_METHOD', 'HTTP_ORIGIN', 'HTTP_REFERER', 'HTTP_SEC_FETCH_SITE', 'REMOTE_ADDR', 'CONTENT_TYPE', 'CONTENT_LENGTH', 'DOCUMENT_ROOT') as $allowedKey) {
    if (isset($_SERVER[$allowedKey])) {
        $server[$allowedKey] = (string) $_SERVER[$allowedKey];
    }
}

// Özel dizin: ortam değişkeni öncelikli, yoksa <hesap kökü>/arkoz-private.
$privSrc = getenv('ARKOZ_PRIVATE_DIR');
if (!is_string($privSrc) || $privSrc === '') {
    $privSrc = dirname(__DIR__, 2) . '/arkoz-private';
}
$resolve = function ($p) {
    if (!is_string($p) || $p === '') {
        return '';
    }
    $r = realpath($p);
    return $r === false ? '' : $r;
};
$privReal = $resolve($privSrc);
$docRootReal = $resolve(isset($server['DOCUMENT_ROOT']) ? $server['DOCUMENT_ROOT'] : '');
$webDirReal = $resolve(dirname(__DIR__));
$privateOk = $privReal !== '' && arkoz_private_dir_safe($privReal, $docRootReal, $webDirReal);

$logFn = function ($event) {
    error_log('arkoz-chat: ' . $event);
};
if (!$privateOk) {
    $logFn('private_dir_unsafe');
}

if ($privateOk && is_writable($privReal) && function_exists('ini_set')) {
    ini_set('error_log', $privReal . '/php-error.log');
}

// Temizlik: config'ten ve Origin'den bağımsız, her metotta.
$rateDir = $privReal . '/ratelimit';
if ($privateOk && arkoz_rate_limit_gc($rateDir, time()) > 0) {
    $logFn('ratelimit_cleanup');
}

$config = null;
if ($privateOk && is_file($privReal . '/config.php')) {
    $config = require $privReal . '/config.php';
}

$systemPrompt = str_replace("\r\n", "\n", (string) require __DIR__ . '/lib/system-prompt.php');

$deps = array(
    'config' => $config,
    'system_prompt' => $systemPrompt,
    'upstream' => function ($json, $headerLines) use ($config) {
        return arkoz_upstream_curl((string) $config['api_url'], $json, $headerLines);
    },
    'rate_limit' => function ($ip) use ($rateDir) {
        return arkoz_rate_limit($rateDir, $ip, time());
    },
    'log' => $logFn,
);

$rawBody = file_get_contents('php://input', false, null, 0, ARKOZ_MAX_BODY_BYTES + 1);
if ($rawBody === false) {
    $rawBody = '';
}
$result = arkoz_chat_handle($server, $rawBody, $deps);

if (function_exists('header_remove')) {
    header_remove('Set-Cookie');
}
http_response_code($result['status']);
foreach ($result['headers'] as $name => $value) {
    header($name . ': ' . $value);
}
echo $result['body'];
