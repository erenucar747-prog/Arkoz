<?php
// GEÇİCİ TANILAMA BETİĞİ — rastgele bir adla web köküne yükle, bir kez çalıştır, çıktıyı kaydet, hemen sil.
// Hiçbir sır okumaz ve basmaz; config dosyasına dokunmaz. Kalıcı olarak sunucuda bırakılmaz.
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

function satir($k, $v)
{
    echo str_pad($k, 34) . ': ' . $v . "\n";
}
function evet($b)
{
    return $b ? 'evet' : 'hayır';
}

echo "ARKOZ KÖPRÜ TANILAMA\n====================\n";
satir('PHP_VERSION', PHP_VERSION);
satir('PHP_SAPI', PHP_SAPI);
foreach (array('curl', 'mbstring', 'openssl', 'json') as $ext) {
    satir('eklenti ' . $ext, evet(extension_loaded($ext)));
}
if (function_exists('curl_version')) {
    $cv = curl_version();
    satir('curl sürümü', isset($cv['version']) ? $cv['version'] : '?');
    satir('curl ssl', isset($cv['ssl_version']) ? $cv['ssl_version'] : '?');
}
foreach (array('max_execution_time', 'open_basedir', 'session.auto_start', 'disable_functions', 'display_errors') as $ini) {
    $v = ini_get($ini);
    satir('ini ' . $ini, $v === false ? '(okunamadı)' : ($v === '' ? '(boş)' : $v));
}
satir('set_time_limit kullanılabilir', evet(function_exists('set_time_limit')));
satir('ini_set kullanılabilir', evet(function_exists('ini_set')));

echo "\nÖZEL DİZİN\n----------\n";
$privSrc = getenv('ARKOZ_PRIVATE_DIR');
if (!is_string($privSrc) || $privSrc === '') {
    $privSrc = dirname(__DIR__) . '/arkoz-private';
}
$privReal = realpath($privSrc);
$docRoot = isset($_SERVER['DOCUMENT_ROOT']) ? (string) $_SERVER['DOCUMENT_ROOT'] : '';
$docRootReal = $docRoot !== '' ? realpath($docRoot) : false;
satir('aday yol', $privSrc);
satir('çözülmüş yol', $privReal === false ? '(yok)' : $privReal);
satir('var mı', evet($privReal !== false && is_dir($privReal)));
satir('yazılabilir mi', evet($privReal !== false && is_writable($privReal)));
satir('DOCUMENT_ROOT (çözülmüş)', $docRootReal === false ? '(yok)' : $docRootReal);

// Köprüdeki arkoz_private_dir_safe kuralının kopyası (lib dosyası require edilmez).
function tani_norm($p)
{
    return strtolower(rtrim(str_replace('\\', '/', (string) $p), '/'));
}
function tani_safe($privReal, $docRootReal, $webDirReal)
{
    $priv = tani_norm($privReal);
    if ($priv === '') {
        return false;
    }
    foreach (array($docRootReal, $webDirReal) as $base) {
        $b = tani_norm($base);
        if ($b === '') {
            continue;
        }
        if ($priv === $b || strpos($priv, $b . '/') === 0) {
            return false;
        }
    }
    foreach (explode('/', $priv) as $part) {
        if (in_array($part, array('public_html', 'private_html', 'httpdocs', 'httpsdocs', 'htdocs', 'wwwroot'), true)) {
            return false;
        }
    }
    return true;
}
$webDirReal = realpath(__DIR__);
satir('WEB KÖKÜ DIŞINDA', evet(tani_safe($privReal === false ? '' : $privReal, $docRootReal === false ? '' : $docRootReal, $webDirReal === false ? '' : $webDirReal)));

echo "\nİSTEMCİ ADRESİ\n--------------\n";
satir('REMOTE_ADDR', isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '(yok)');
foreach (array('HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CF_CONNECTING_IP') as $h) {
    satir($h, isset($_SERVER[$h]) ? 'VAR' : 'YOK');
}

echo "\nYUKARI AKIŞ BAĞLANTISI (anahtarsız GET; herhangi bir 4xx yeterli)\n------------------------\n";
if (function_exists('curl_init')) {
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
    ));
    curl_exec($ch);
    satir('HTTP kodu', (string) curl_getinfo($ch, CURLINFO_RESPONSE_CODE));
    satir('curl_errno', (string) curl_errno($ch));
    satir('curl_error', curl_error($ch) === '' ? '(yok)' : curl_error($ch));
} else {
    satir('curl', 'yok — bağlantı testi yapılamadı');
}
echo "\nBu betiği şimdi silin.\n";
