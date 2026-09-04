#!/usr/bin/env node
/*
 * Generates the Long Branch Farms metadata asset layer:
 *   favicon.ico (16/32/48), favicon-16x16.png, favicon-32x32.png,
 *   apple-touch-icon.png (180), android-chrome-192x192.png,
 *   android-chrome-512x512.png, images/social-card.jpg (1200x630)
 *
 * Usage (from the repo root):
 *   npm i --no-save sharp
 *   node tools/generate-brand-assets.js
 *
 * `sharp` is intentionally NOT a committed dependency: this site has no build
 * step and no package.json. Install it ad hoc, run this once, commit the
 * output, and delete node_modules.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC_LOGO = path.join(ROOT, 'images', 'LBF-logo-transparent.png');
const SRC_PHOTO = path.join(ROOT, 'images', 'photo-2.jpeg');

// Brand palette (mirrors :root in styles.css)
const SOIL = '#1a1208';
const HAY = '#c4a45a';
const CREAM = '#f5f0e8';

/* ------------------------------------------------------------------ *
 * Favicons
 *
 * The full logo lockup is a fine-line plough engraving over four lines
 * of type; scaled to 16px it is unreadable mush. The favicon therefore
 * uses the brand monogram on the logo's own ink-on-cream colourway, so
 * the tile stays legible against both light and dark browser chrome.
 * ------------------------------------------------------------------ */
function monogramSvg(size, opts) {
  const o = opts || {};
  const fontSize = size * (o.fontSize || 0.4);
  const rule = o.rule
    ? '<rect x="' + size * 0.06 + '" y="' + size * 0.06 +
      '" width="' + size * 0.88 + '" height="' + size * 0.88 +
      '" fill="none" stroke="' + HAY + '" stroke-width="' + size * 0.03 + '"/>'
    : '';
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">' +
      '<rect width="' + size + '" height="' + size + '" fill="' + (o.bg || CREAM) + '"/>' +
      rule +
      '<text x="50%" y="50%" dy="0.35em" text-anchor="middle" ' +
      'font-family="Liberation Serif, DejaVu Serif, Georgia, serif" font-weight="bold" ' +
      'font-size="' + fontSize + '" fill="' + SOIL + '">LBF</text>' +
    '</svg>'
  );
}

// Rendered at 512 then downsampled so the type stays crisp.
function iconPng(px, opts) {
  return sharp(monogramSvg(512, opts)).resize(px, px, { fit: 'fill' }).png({ compressionLevel: 9 }).toBuffer();
}

/* Minimal ICO writer: an .ico may hold PNG payloads directly. */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);              // reserved
  header.writeUInt16LE(1, 2);              // type: icon
  header.writeUInt16LE(entries.length, 4); // image count

  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach((e, i) => {
    const b = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b);     // width  (0 == 256)
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 1); // height
    dir.writeUInt8(0, b + 2);                          // palette colours
    dir.writeUInt8(0, b + 3);                          // reserved
    dir.writeUInt16LE(1, b + 4);                       // colour planes
    dir.writeUInt16LE(32, b + 6);                      // bits per pixel
    dir.writeUInt32LE(e.data.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += e.data.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

async function favicons() {
  // Small sizes drop the rule and set slightly larger type for legibility.
  const small = { rule: false, fontSize: 0.44 };
  const large = { rule: true, fontSize: 0.4 };

  const p16 = await iconPng(16, small);
  const p32 = await iconPng(32, small);
  const p48 = await iconPng(48, large);

  fs.writeFileSync(path.join(ROOT, 'favicon-16x16.png'), p16);
  fs.writeFileSync(path.join(ROOT, 'favicon-32x32.png'), p32);
  fs.writeFileSync(
    path.join(ROOT, 'favicon.ico'),
    buildIco([{ size: 16, data: p16 }, { size: 32, data: p32 }, { size: 48, data: p48 }])
  );

  // apple-touch-icon must be opaque; cream reads better than soil beside iOS
  // home-screen wallpapers and matches the logo's own ground. iOS applies its
  // own rounding to a fixed 10% radius, so the inset rule survives there.
  fs.writeFileSync(path.join(ROOT, 'apple-touch-icon.png'), await iconPng(180, large));

  // The manifest declares these "any maskable", so Android may circle-crop them
  // to the inner 80%. The rule sits at a 6% inset and would be sliced off, so
  // the maskable renders drop it and shrink the type into the safe zone.
  const maskable = { rule: false, fontSize: 0.32 };
  fs.writeFileSync(path.join(ROOT, 'android-chrome-192x192.png'), await iconPng(192, maskable));
  fs.writeFileSync(path.join(ROOT, 'android-chrome-512x512.png'), await iconPng(512, maskable));
}

/* ------------------------------------------------------------------ *
 * Social card: 1200x630, farm photo + dark scrim + cream logo lockup.
 * ------------------------------------------------------------------ */
async function socialCard() {
  const W = 1200;
  const H = 630;

  const base = await sharp(SRC_PHOTO)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.92 })
    .toBuffer();

  const scrim = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="' + SOIL + '" stop-opacity="0.95"/>' +
        '<stop offset="0.58" stop-color="' + SOIL + '" stop-opacity="0.86"/>' +
        '<stop offset="1" stop-color="' + SOIL + '" stop-opacity="0.42"/>' +
      '</linearGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#g)"/>' +
      '<rect x="0" y="' + (H - 10) + '" width="' + W + '" height="10" fill="' + HAY + '"/>' +
    '</svg>'
  );

  // Recolour the dark logo lockup to cream by using its own alpha as a mask.
  const logoRaw = await sharp(SRC_LOGO)
    .trim({ background: '#00000000', threshold: 10 })
    .resize({ width: 560 })
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const alpha = await sharp(logoRaw.data).extractChannel('alpha').toBuffer();
  const logoCream = await sharp({
    create: {
      width: logoRaw.info.width,
      height: logoRaw.info.height,
      channels: 3,
      background: CREAM
    }
  })
    .joinChannel(alpha)
    .png()
    .toBuffer();

  const logoTop = Math.round((H - logoRaw.info.height) / 2);

  const out = path.join(ROOT, 'images', 'social-card.jpg');
  await sharp(base)
    .composite([
      { input: scrim, top: 0, left: 0 },
      { input: logoCream, top: logoTop, left: 70 }
    ])
    .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(out);

  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log('social-card.jpg: ' + kb + ' KB');
  if (kb > 300) throw new Error('social card exceeds 300 KB');
}

(async () => {
  await favicons();
  await socialCard();
  console.log('brand assets written');
})();
