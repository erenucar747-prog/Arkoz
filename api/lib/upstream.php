<?php
// Yukarı akış (yapay zeka hizmet sağlayıcısı) çağrısı. Yalnızca https; ziyaretçiye ait hiçbir
// başlık, çerez ya da tanımlayıcı gönderilmez. Bu dosyada istek ortamı hiç kullanılmaz.
if (!defined('ARKOZ_CHAT')) {
    http_response_code(404);
    exit;
}

function arkoz_upstream_curl_options(string $json, array $headerLines): array
{
    $opts = array(
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $json,
        CURLOPT_HTTPHEADER => $headerLines,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    );
    if (defined('CURLOPT_PROTOCOLS_STR')) {
        $opts[CURLOPT_PROTOCOLS_STR] = 'https';
    } else {
        $opts[CURLOPT_PROTOCOLS] = CURLPROTO_HTTPS;
    }
    return $opts;
}

function arkoz_upstream_curl(string $url, string $json, array $headerLines): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, arkoz_upstream_curl_options($json, $headerLines));
    $body = curl_exec($ch);
    return array(
        'status' => (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE),
        'body' => $body === false ? null : $body,
        'errno' => curl_errno($ch),
    );
}
