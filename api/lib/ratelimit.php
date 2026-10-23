<?php
// Dosya tabanlı istek sınırı: dakika penceresi (20) ve Türkiye saatine göre takvim günü (200).
// Ham IP hiçbir dosyaya ya da dosya adına yazılmaz; anahtar, her gün yenilenen rastgele
// anahtarla HMAC'lenmiş özet değeridir. IPv6'da /64 öneki kullanılır.
if (!defined('ARKOZ_CHAT')) {
    http_response_code(404);
    exit;
}

function arkoz_rate_limit_bucket(string $ip): string
{
    if (strpos($ip, ':') !== false) {
        $bin = @inet_pton($ip);
        if ($bin !== false && strlen($bin) === 16) {
            return bin2hex(substr($bin, 0, 8)) . '/64';
        }
    }
    return $ip;
}

function arkoz_rate_limit_today(int $now): string
{
    $dt = new DateTime('@' . $now);
    $dt->setTimezone(new DateTimeZone('Europe/Istanbul'));
    return $dt->format('Ymd');
}

// Ortak temizlik: adındaki tarih bugün olmayan daykey-*.bin ve rl-*.json dosyaları silinir.
// Dönüş: silinemeyen dosya sayısı. Kilit altında çağrılmalıdır.
function arkoz_rate_limit_sweep(string $dir, string $today): int
{
    $failed = 0;
    $entries = @scandir($dir);
    if ($entries === false) {
        return 0;
    }
    foreach ($entries as $name) {
        $m = array();
        if (preg_match('/^daykey-([0-9]{8})\.bin$/', $name, $m)
            || preg_match('/^rl-([0-9]{8})-[0-9a-f]{64}\.json$/', $name, $m)) {
            if ($m[1] !== $today && !@unlink($dir . '/' . $name)) {
                $failed++;
            }
        }
    }
    return $failed;
}

function arkoz_rate_limit_gc(string $dir, int $now): int
{
    if (!is_dir($dir)) {
        return 0;
    }
    $lock = @fopen($dir . '/.lock', 'c');
    if ($lock === false) {
        return 0;
    }
    $failed = 0;
    if (@flock($lock, LOCK_EX)) {
        $failed = arkoz_rate_limit_sweep($dir, arkoz_rate_limit_today($now));
        @flock($lock, LOCK_UN);
    }
    @fclose($lock);
    return $failed;
}

function arkoz_rate_limit_write(string $file, array $state): void
{
    if (@file_put_contents($file, json_encode($state), LOCK_EX) === false) {
        throw new RuntimeException('ratelimit state write');
    }
}

// null = izin; aksi hâlde ['status' => 429, 'error' => '...']. G/Ç hatası RuntimeException fırlatır.
function arkoz_rate_limit(string $dir, string $ip, int $now): ?array
{
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('ratelimit dir');
    }
    $lock = @fopen($dir . '/.lock', 'c');
    if ($lock === false) {
        throw new RuntimeException('ratelimit lock open');
    }
    if (!@flock($lock, LOCK_EX)) {
        @fclose($lock);
        throw new RuntimeException('ratelimit lock');
    }
    try {
        $today = arkoz_rate_limit_today($now);
        arkoz_rate_limit_sweep($dir, $today);

        $keyFile = $dir . '/daykey-' . $today . '.bin';
        if (!is_file($keyFile)) {
            if (@file_put_contents($keyFile, random_bytes(32), LOCK_EX) === false) {
                throw new RuntimeException('daykey write');
            }
            @chmod($keyFile, 0600);
        }
        $dayKey = @file_get_contents($keyFile);
        if ($dayKey === false || strlen($dayKey) !== 32) {
            throw new RuntimeException('daykey read');
        }

        $h = hash_hmac('sha256', arkoz_rate_limit_bucket($ip), $dayKey);
        $f = $dir . '/rl-' . $today . '-' . $h . '.json';
        $window = intdiv($now, 60);
        $state = array('w' => $window, 'm' => 0, 'd' => 0);
        if (is_file($f)) {
            $raw = @file_get_contents($f);
            if ($raw === false) {
                throw new RuntimeException('state read');
            }
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $state['w'] = isset($decoded['w']) ? (int) $decoded['w'] : $window;
                $state['m'] = isset($decoded['m']) ? (int) $decoded['m'] : 0;
                $state['d'] = isset($decoded['d']) ? (int) $decoded['d'] : 0;
            }
        }
        if ($state['w'] !== $window) {
            $state['w'] = $window;
            $state['m'] = 0;
        }
        if ($state['m'] >= 20) {
            arkoz_rate_limit_write($f, $state);
            return array('status' => 429, 'error' => 'Çok hızlı yazıyorsunuz. Lütfen bir dakika bekleyip tekrar deneyin.');
        }
        $state['m']++;
        if ($state['d'] >= 200) {
            arkoz_rate_limit_write($f, $state);
            return array('status' => 429, 'error' => 'Günlük mesaj limitiniz doldu. Yarın tekrar deneyin.');
        }
        $state['d']++;
        arkoz_rate_limit_write($f, $state);
        return null;
    } finally {
        @flock($lock, LOCK_UN);
        @fclose($lock);
    }
}
