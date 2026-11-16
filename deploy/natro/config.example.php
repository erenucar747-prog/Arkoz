<?php
// Örnek yapılandırma. Sunucuda web kökünün DIŞINDA <hesap kökü>/arkoz-private/config.php
// olarak kopyalanır ve doldurulur. Gerçek değerler asla repoya girmez.
return [
    'api_key' => '',
    'model' => 'claude-haiku-5-5',
    'api_url' => 'https://api.anthropic.com/v1/messages',
    'api_version' => '2023-06-01',
    'allowed_origins' => ['https://arkozgazbeton.com.tr'],
];
