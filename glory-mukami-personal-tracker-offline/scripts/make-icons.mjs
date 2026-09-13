/**
 * Generates the app icons as PNGs with no image library.
 *
 * A manifest needs raster icons — Android's install prompt and launcher will
 * not take an SVG — and adding an image toolchain for three files is not worth
 * it. PNG is a zlib-compressed byte stream with a few checksummed chunks, all
 * of which Node has built in, so the icons are drawn pixel by pixel here.
 *
 * Usage: node scripts/make-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "..", "client", "public", "icons");

const INK = [0x28, 0x11, 0x2f]; // the journal's dark plum
const CREAM = [0xff, 0xfa, 0xf2];
const GOLD = [0xf4, 0xc7, 0x66];

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function png(size, pixelAt) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const at = y * (size * 4 + 1) + 1 + x * 4;
      raw[at] = r;
      raw[at + 1] = g;
      raw[at + 2] = b;
      raw[at + 3] = a;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * The mark: a plum square, a cream ring, a gold dot — a page, a cycle and a
 * day. Drawn with soft edges so it does not look jagged at 192px.
 *
 * `maskable` fills the whole canvas, because Android crops maskable icons to
 * a circle or squircle and anything outside the safe zone is lost; the plain
 * icon leaves rounded corners and transparent margins instead.
 */
function draw(size, { maskable }) {
  const centre = (size - 1) / 2;
  const corner = maskable ? 0 : size * 0.18;
  const ringOuter = size * 0.32;
  const ringInner = size * 0.24;
  const dot = size * 0.09;

  const coverage = (distance, edge) =>
    Math.max(0, Math.min(1, edge - distance + 0.5));

  return (x, y) => {
    const dx = x - centre;
    const dy = y - centre;
    const radial = Math.hypot(dx, dy);

    // Rounded-square alpha for the non-maskable icon.
    let alpha = 1;
    if (!maskable) {
      const inner = size / 2 - corner;
      const qx = Math.max(0, Math.abs(dx) - inner);
      const qy = Math.max(0, Math.abs(dy) - inner);
      alpha = coverage(Math.hypot(qx, qy), corner);
    }
    if (alpha === 0) return [0, 0, 0, 0];

    let colour = INK;
    const ring = coverage(radial, ringOuter) * (1 - coverage(radial, ringInner));
    const centreDot = coverage(radial, dot);
    if (centreDot > 0) colour = blend(INK, GOLD, centreDot);
    else if (ring > 0) colour = blend(INK, CREAM, ring);

    return [...colour, Math.round(alpha * 255)];
  };
}

function blend(from, to, t) {
  return from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * t)
  );
}

mkdirSync(OUT, { recursive: true });
for (const [name, size, options] of [
  ["icon-192.png", 192, { maskable: false }],
  ["icon-512.png", 512, { maskable: false }],
  ["maskable-512.png", 512, { maskable: true }],
]) {
  writeFileSync(resolve(OUT, name), png(size, draw(size, options)));
  console.log(`wrote icons/${name}`);
}
