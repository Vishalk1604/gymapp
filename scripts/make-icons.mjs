// Draws the dumbbell app icon and writes icons/icon.svg plus the PNG sizes phones need.
// No dependencies: shapes are rasterised with 4×4 supersampling and encoded with node:zlib.
// Run: node scripts/make-icons.mjs
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../icons/', import.meta.url));
const BG = [11, 12, 14];      // --bg
const FG = [198, 240, 77];    // --accent
const ANGLE = -Math.PI / 4;   // dumbbell tilted up to the right

// Dumbbell parts as rounded rects [x0, y0, x1, y1, radius] in a 100×100 space centred on 0,0.
const PARTS = [
  [-22, -4, 22, 4, 2],          // handle
  [-30, -18, -22, 18, 4],       // inner plates
  [22, -18, 30, 18, 4],
  [-38.5, -12, -31.5, 12, 3.5], // outer plates
  [31.5, -12, 38.5, 12, 3.5],
  [-43, -4, -38.5, 4, 2],       // bar ends
  [38.5, -4, 43, 4, 2],
];

const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 0.92, rounded: true },
  { file: 'icon-512.png', size: 512, scale: 0.92, rounded: true },
  { file: 'maskable-512.png', size: 512, scale: 0.76, rounded: false }, // keep inside Android's safe circle
  { file: 'apple-touch-icon.png', size: 180, scale: 0.92, rounded: false }, // iOS rounds the corners itself
];

function inRoundRect(x, y, [x0, y0, x1, y1, r]) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function rasterise(size, scale, rounded) {
  const SS = 4;
  const cos = Math.cos(ANGLE);
  const sin = Math.sin(ANGLE);
  const pixels = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let inside = 0;
      let ink = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / size) * 100 - 50;
          const y = ((py + (sy + 0.5) / SS) / size) * 100 - 50;
          if (rounded && !inRoundRect(x, y, [-50, -50, 50, 50, 22])) continue;
          inside++;
          // Rotate the sample back into the dumbbell's own (untilted) space.
          const u = (x * cos + y * sin) / scale;
          const v = (-x * sin + y * cos) / scale;
          if (PARTS.some((part) => inRoundRect(u, v, part))) ink++;
        }
      }
      const i = (py * size + px) * 4;
      const t = inside ? ink / inside : 0;
      for (let c = 0; c < 3; c++) pixels[i + c] = Math.round(BG[c] + (FG[c] - BG[c]) * t);
      pixels[i + 3] = Math.round((inside / (SS * SS)) * 255);
    }
  }
  return pixels;
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);

  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function svgIcon() {
  const hex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  const rects = PARTS.map(([x0, y0, x1, y1, r]) =>
    `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="${r}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`
    + `<rect width="100" height="100" rx="22" fill="${hex(BG)}"/>`
    + `<g fill="${hex(FG)}" transform="translate(50 50) rotate(-45) scale(0.92)">${rects}</g></svg>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}icon.svg`, svgIcon());
for (const { file, size, scale, rounded } of ICONS) {
  writeFileSync(`${OUT}${file}`, encodePng(size, rasterise(size, scale, rounded)));
  console.log(`icons/${file} (${size}×${size})`);
}
console.log('icons/icon.svg');
