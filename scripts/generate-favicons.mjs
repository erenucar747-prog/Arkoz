// scripts/generate-favicons.mjs
// logo.png'den tum favicon boyutlarini uretir.
// Calistirma: npm run favicons
//
// Kaynak: logo.png (827x368 yatay logo)
// Strateji: Logonun sol-ust bolgesindeki "A + yaprak" amblemini crop et,
//           transparan kenarlari trim et, kare yap, sonra her boyuta resize et.

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);

const SOURCE = join(repoRoot, 'logo.png');

// "A + yaprak" amblemi logonun sol bolumunde. Genis bir kutu alip
// transparan kenarlari sharp ile trimleyecegiz; bu sayede tam piksel sinirini
// elle hesaplamak zorunda kalmiyoruz.
// Pixel-level alpha scan (logo.png 827x368) ile dogrulandi:
//   - Ucgenin sag vertex'i (x=274, y=229)
//   - Ucgenin apex'i ~(x=115, y=0)
//   - R harfi x=237'den itibaren slope ile cakisiyor (ust bowl ucgenin
//     sag slope'unun ic tarafina sarkiyor) - bu yuzden duz rectangular
//     crop yetmiyor; sag slope'un disindaki pikselleri MASK ile eriyoruz.
//   - ARKOZ satir bandi rows 0-232; gap 233-277; GAZBETON 278+
const ICON_REGION = { left: 0, top: 0, width: 290, height: 240 };

// Sag slope'un geometrik tanimi (apex'ten sag vertex'e dogru cizgi).
// (x, y) noktasi sag slope'un SAG tarafinda ise (yani x > slope_line(y))
// onu sil - bu R harfinin slope icine sarkan ust bowl'unu temizler.
// Slope merkez cizgisi: x = APEX_X + (RIGHT_VX - APEX_X) * (y / RIGHT_VY)
// Margin: slope stroke kalinligi ~12-15px; merkezden +18px tolerans biraktik.
const APEX_X = 115;
const APEX_Y = 0;
const RIGHT_VX = 274;
const RIGHT_VY = 229;
const SLOPE_RIGHT_MARGIN = 18;

// Trimlenmis ikon karenin kenarlarina dayandiginda tarayici sekmesi ust
// pikselleri visually kirpiyor. Her kenarda %10 transparan inset birakiyoruz
// (logo kanvasin %80'ini kaplar, %18 padding'e gore lineer ~%25 daha buyuk).
const SAFE_AREA_RATIO = 0.1;

async function buildSquareIcon() {
  const meta = await sharp(SOURCE).metadata();
  console.log(`[i] Kaynak: ${SOURCE} (${meta.width}x${meta.height}, ${meta.channels}ch)`);

  // 1) Bolge cikar
  const cropped = await sharp(SOURCE).extract(ICON_REGION).toBuffer();

  // 1b) Sag slope disindaki pikselleri sil (R harfinin ucgene sarkan bolumu)
  //    Slope merkez cizgisi: x_slope(y) = APEX_X + (RIGHT_VX - APEX_X) * y / RIGHT_VY
  //    Bir piksel (x, y) icin x > x_slope(y) + SLOPE_RIGHT_MARGIN ise alpha=0
  const { data: rawData, info: rawInfo } = await sharp(cropped)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = rawInfo.width;
  const H = rawInfo.height;
  const CH = rawInfo.channels;
  const masked = Buffer.from(rawData);
  let erasedCount = 0;
  for (let y = 0; y < H; y++) {
    const slopeX = APEX_X + ((RIGHT_VX - APEX_X) * (y - APEX_Y)) / (RIGHT_VY - APEX_Y);
    const cutoffX = slopeX + SLOPE_RIGHT_MARGIN;
    for (let x = 0; x < W; x++) {
      if (x > cutoffX) {
        const idx = (y * W + x) * CH + 3;
        if (masked[idx] > 0) {
          masked[idx] = 0;
          erasedCount++;
        }
      }
    }
  }
  console.log(`[i] Mask: ${erasedCount} piksel silindi (sag slope disindaki R kalintilari)`);

  const maskedBuffer = await sharp(masked, {
    raw: { width: W, height: H, channels: CH },
  })
    .png()
    .toBuffer();

  // 2) Transparan kenarlari trim et (threshold 10/255)
  const trimmed = await sharp(maskedBuffer).trim({ threshold: 10 }).toBuffer();

  const trimmedMeta = await sharp(trimmed).metadata();
  console.log(`[i] Trim sonrasi: ${trimmedMeta.width}x${trimmedMeta.height}`);

  // 3) Kare yap + safe area ekle
  //    tight = trim sonrasi minimum kare (mevcut davranis)
  //    padded = her kenarda SAFE_AREA_RATIO kadar transparan inset eklenmis kare
  const tight = Math.max(trimmedMeta.width, trimmedMeta.height);
  const padded = Math.round(tight / (1 - 2 * SAFE_AREA_RATIO));
  const padX = Math.floor((padded - trimmedMeta.width) / 2);
  const padY = Math.floor((padded - trimmedMeta.height) / 2);

  const square = await sharp({
    create: {
      width: padded,
      height: padded,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, left: padX, top: padY }])
    .png()
    .toBuffer();

  console.log(
    `[i] Kare olusturuldu: ${padded}x${padded} (icon ${tight}x${tight}, safe area %${SAFE_AREA_RATIO * 100})`
  );
  return square;
}

async function resize(buffer, dim, opts = {}) {
  const pipeline = sharp(buffer).resize(dim, dim, {
    fit: 'contain',
    background: opts.background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    kernel: 'lanczos3',
  });
  if (opts.background && opts.background.alpha !== 0) {
    pipeline.flatten({ background: opts.background });
  }
  return pipeline.png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  const square = await buildSquareIcon();

  // Onizleme dosyasi (gitignore'a eklenecek/atilacak, sadece dev icin)
  await writeFile(join(repoRoot, 'scripts/_preview-crop.png'), square);
  console.log('[i] Onizleme yazildi: scripts/_preview-crop.png');

  const targets = [
    { name: 'favicon-16x16.png', size: 16, transparent: true },
    { name: 'favicon-32x32.png', size: 32, transparent: true },
    { name: 'android-chrome-192x192.png', size: 192, transparent: true },
    { name: 'android-chrome-512x512.png', size: 512, transparent: true },
    // iOS bazi surumleri transparenti siyah render ediyor -> beyaz BG
    { name: 'apple-touch-icon.png', size: 180, transparent: false },
  ];

  for (const t of targets) {
    const buf = await resize(square, t.size, {
      background: t.transparent
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 255, g: 255, b: 255, alpha: 1 },
    });
    await writeFile(join(repoRoot, t.name), buf);
    console.log(
      `[+] ${t.name} (${t.size}x${t.size}${t.transparent ? ', transparan' : ', beyaz BG'})`
    );
  }

  // favicon.ico: 16+32+48 multi-size
  const ico16 = await resize(square, 16);
  const ico32 = await resize(square, 32);
  const ico48 = await resize(square, 48);
  const icoBuffer = await pngToIco([ico16, ico32, ico48]);
  await writeFile(join(repoRoot, 'favicon.ico'), icoBuffer);
  console.log('[+] favicon.ico (16+32+48 multi-size)');

  console.log('\n[OK] Favicon seti hazir.');
}

main().catch((err) => {
  console.error('[HATA]', err);
  process.exit(1);
});
