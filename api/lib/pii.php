<?php
// Yedek kişisel veri filtresi (sunucu). Tarayıcıdaki filtreyle aynı 44 vektörde aynı sonucu verir.
// Kalıp tabanlıdır: TCKN, telefon, IBAN, e-posta, bağlamlı VKN. Maskeleme yok; tespit = tam engelleme.
if (!defined('ARKOZ_CHAT')) {
    http_response_code(404);
    exit;
}

function arkoz_pii_tckn_valid($d)
{
    if (!preg_match('/^[1-9][0-9]{10}$/', $d)) {
        return false;
    }
    $n = array_map('intval', str_split($d));
    $odd = $n[0] + $n[2] + $n[4] + $n[6] + $n[8];
    $even = $n[1] + $n[3] + $n[5] + $n[7];
    $d10 = ((($odd * 7 - $even) % 10) + 10) % 10;
    if ($d10 !== $n[9]) {
        return false;
    }
    return (array_sum(array_slice($n, 0, 10)) % 10) === $n[10];
}

function arkoz_pii_national_phone($d)
{
    if (substr($d, 0, 4) === '0090') {
        return substr($d, 4);
    }
    if (substr($d, 0, 2) === '90' && strlen($d) === 12) {
        return substr($d, 2);
    }
    if (substr($d, 0, 1) === '0' && strlen($d) === 11) {
        return substr($d, 1);
    }
    return $d;
}

function arkoz_pii_detect($text)
{
    $s = (string) $text;
    $found = array();
    if (preg_match_all('/(^|[^0-9])([1-9](?: ?[0-9]){10})(?![0-9])/', $s, $mm, PREG_SET_ORDER)) {
        foreach ($mm as $m) {
            if (arkoz_pii_tckn_valid(preg_replace('/[^0-9]/', '', $m[2]))) {
                $found['tckn'] = true;
            }
        }
    }
    if (preg_match_all('/(^|[^0-9+])((?:(?:\+|00) ?90|90)?[ .\-]?\(?0?\)?[ .\-]?\(?[2-5][0-9]{2}\)?[ .\-]?[0-9]{3}[ .\-]?[0-9]{2}[ .\-]?[0-9]{2})(?![0-9])/', $s, $mm, PREG_SET_ORDER)) {
        foreach ($mm as $m) {
            $nat = arkoz_pii_national_phone(preg_replace('/[^0-9]/', '', $m[2]));
            if (!in_array($nat, array('8503175555', '5388658289'), true)) {
                $found['telefon'] = true;
            }
        }
    }
    if (preg_match('/(^|[^A-Za-z0-9])([Tt][Rr] ?[0-9]{2}(?: ?[0-9]){22})(?![0-9])/', $s)) {
        $found['iban'] = true;
    }
    if (preg_match_all('/[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}/', $s, $mm)) {
        foreach ($mm[0] as $e) {
            if (!in_array(strtolower($e), array('info@arkozgazbeton.com.tr'), true)) {
                $found['eposta'] = true;
            }
        }
    }
    if (preg_match('/(?:[vV][eE][rR][gG](?:[iI]|\x{0130}|\x{0131})|[vV][kK][nN])/u', $s)
        && preg_match('/(^|[^0-9])([0-9]{10})(?![0-9])/', $s)) {
        $found['vkn'] = true;
    }
    $types = array();
    foreach (array('tckn', 'telefon', 'iban', 'eposta', 'vkn') as $t) {
        if (isset($found[$t])) {
            $types[] = $t;
        }
    }
    return array('blocked' => count($types) > 0, 'types' => $types);
}
