import { writeFileSync } from "node:fs";
import zlib from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ressourcesDir = join(__dirname, "..", "resources");

const SIZE = 256;

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function isInsideRoundedRect(x, y, w, h, r) {
  if (x >= r && x <= w - r && y >= r && y <= h - r) return true;
  if (x < r && y < r) return (x - r) ** 2 + (y - r) ** 2 <= r ** 2;
  if (x > w - r && y < r) return (x - (w - r)) ** 2 + (y - r) ** 2 <= r ** 2;
  if (x < r && y > h - r) return (x - r) ** 2 + (y - (h - r)) ** 2 <= r ** 2;
  if (x > w - r && y > h - r) return (x - (w - r)) ** 2 + (y - (h - r)) ** 2 <= r ** 2;
  return false;
}

function makePNG(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    for (let x = 0; x < size; x++) {
      const idx = y * (1 + size * 4) + 1 + x * 4;
      const inside = isInsideRoundedRect(x, y, size - 1, size - 1, size * 0.18);

      if (inside) {
        const edgeDist = Math.min(
          x,
          y,
          size - 1 - x,
          size - 1 - y,
          Math.sqrt((x - size * 0.18) ** 2 + (y - size * 0.18) ** 2) - size * 0.18,
          Math.sqrt((x - (size - size * 0.18)) ** 2 + (y - size * 0.18) ** 2) - size * 0.18,
          Math.sqrt((x - size * 0.18) ** 2 + (y - (size - size * 0.18)) ** 2) - size * 0.18,
          Math.sqrt((x - (size - size * 0.18)) ** 2 + (y - (size - size * 0.18)) ** 2) - size * 0.18
        );

        const edgeIntensity = Math.min(1, Math.max(0, edgeDist / 6));
        const baseR = 255;
        const baseG = 60;
        const baseB = 0;

        const factor = 1 + (1 - edgeIntensity) * 0.15;
        raw[idx] = Math.min(255, Math.round(baseR * factor));
        raw[idx + 1] = Math.min(255, Math.round(baseG * factor));
        raw[idx + 2] = Math.min(255, Math.round(baseB * factor));
        raw[idx + 3] = 255;
      } else {
        raw[idx] = 0;
        raw[idx + 1] = 0;
        raw[idx + 2] = 0;
        raw[idx + 3] = 0;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);

  return png;
}

function makeICO(pngBuffer) {
  const dir = Buffer.alloc(16);
  dir[0] = 0;
  dir[1] = 0;
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32BE(pngBuffer.length, 8);
  dir.writeUInt32BE(6 + 16, 12);

  return Buffer.concat([
    Buffer.from([0, 0, 1, 0, 1, 0, 0, 0]),
    dir,
    pngBuffer,
  ]);
}

function main() {
  console.log("Building OmniSystem icon assets...");

  const png256 = makePNG(256);
  const ico = makeICO(png256);

  writeFileSync(join(ressourcesDir, "icon.png"), png256);
  writeFileSync(join(ressourcesDir, "icon.ico"), ico);

  const png512 = makePNG(512);
  writeFileSync(join(ressourcesDir, "splash-logo.png"), png512);

  console.log("Icon assets built successfully");
  console.log(`   ${join(ressourcesDir, "icon.png")}`);
  console.log(`   ${join(ressourcesDir, "icon.ico")}`);
  console.log(`   ${join(ressourcesDir, "splash-logo.png")}`);
}

main();
