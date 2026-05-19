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
const ICON_REGION = { left: 0, top: 0, width: 230, height: 260 };

async function buildSquareIcon() {
  const meta = await sharp(SOURCE).metadata();
  console.log(`[i] Kaynak: ${SOURCE} (${meta.width}x${meta.height}, ${meta.channels}ch)`);

  // 1) Bolge cikar
  const cropped = await sharp(SOURCE)
    .extract(ICON_REGION)
    .toBuffer();

  // 2) Transparan kenarlari trim et (threshold 10/255)
  const trimmed = await sharp(cropped)
    .trim({ threshold: 10 })
    .toBuffer();

  const trimmedMeta = await sharp(trimmed).metadata();
  console.log(`[i] Trim sonrasi: ${trimmedMeta.width}x${trimmedMeta.height}`);

  // 3) Kare yap (en uzun kenara gore transparan padding ekle)
  const size = Math.max(trimmedMeta.width, trimmedMeta.height);
  const padX = Math.floor((size - trimmedMeta.width) / 2);
  const padY = Math.floor((size - trimmedMeta.height) / 2);

  const square = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, left: padX, top: padY }])
    .png()
    .toBuffer();

  console.log(`[i] Kare olusturuldu: ${size}x${size}`);
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
    { name: 'favicon-16x16.png',           size: 16,  transparent: true },
    { name: 'favicon-32x32.png',           size: 32,  transparent: true },
    { name: 'android-chrome-192x192.png',  size: 192, transparent: true },
    { name: 'android-chrome-512x512.png',  size: 512, transparent: true },
    // iOS bazi surumleri transparenti siyah render ediyor -> beyaz BG
    { name: 'apple-touch-icon.png',        size: 180, transparent: false },
  ];

  for (const t of targets) {
    const buf = await resize(square, t.size, {
      background: t.transparent
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 255, g: 255, b: 255, alpha: 1 },
    });
    await writeFile(join(repoRoot, t.name), buf);
    console.log(`[+] ${t.name} (${t.size}x${t.size}${t.transparent ? ', transparan' : ', beyaz BG'})`);
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
