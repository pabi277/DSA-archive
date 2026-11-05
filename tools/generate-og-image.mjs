#!/usr/bin/env node
/**
 * Clean-room social card (Open Graph / Twitter) for the v2 release — phase v2-10.
 *
 * Node built-ins only (`node:zlib`), the frozen tokens-v2 palette, and a 5x7
 * bitmap alphabet defined here. No font file, no screenshot, no third-party
 * asset, nothing from `copy-web/`. The card states only what the release is:
 * 495 rows · 20 topics, quizzes, and a runner that compiles on the device.
 *
 *   node tools/generate-og-image.mjs   →  public/og-image.png (1200×630)
 */
import { deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WIDTH = 1200
const HEIGHT = 630

// Tokens v2 (FINAL) — the same values src/styles.css and the icon generator use.
const CANVAS = [0x0b, 0x0d, 0x0e, 0xff]
const SURFACE = [0x12, 0x15, 0x16, 0xff]
const LINE = [0x36, 0x3d, 0x3e, 0xff]
const INK = [0xed, 0xf0, 0xed, 0xff]
const ACCENT = [0x7f, 0xe3, 0xb4, 0xff]
const MUTED = [0x9a, 0xa3, 0xa0, 0xff]

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '·': ['00000', '00000', '00000', '00100', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)
  return Buffer.concat([length, typeBytes, data, crc])
}

function encodePng(width, height, rgb) {
  // rgb is a flat RGB buffer (3 bytes per pixel); PNG rows are filter-tagged.
  const stride = width * 3 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0
    rgb.copy(raw, y * stride + 1, y * width * 3, (y + 1) * width * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2 // truecolour, no alpha: smaller and universally supported
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const canvas = Buffer.alloc(WIDTH * HEIGHT * 3)

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return
  const offset = (y * WIDTH + x) * 3
  canvas[offset] = color[0]
  canvas[offset + 1] = color[1]
  canvas[offset + 2] = color[2]
}

function fillRect(left, top, width, height, color) {
  for (let y = top; y < top + height; y += 1) for (let x = left; x < left + width; x += 1) setPixel(x, y, color)
}

function roundedRect(left, top, right, bottom, radius, color, { border = 0, borderColor = color } = {}) {
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const cx = x < left + radius ? left + radius : x >= right - radius ? right - radius - 1 : x
      const cy = y < top + radius ? top + radius : y >= bottom - radius ? bottom - radius - 1 : y
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy > radius * radius) continue
      const onEdge = x < left + border || x >= right - border || y < top + border || y >= bottom - border
      setPixel(x, y, border > 0 && onEdge ? borderColor : color)
    }
  }
}

/** Draw 5x7 text; returns the pixel width used. `cell` is the glyph pixel size. */
function drawText(text, x, y, cell, color, { gap = 1 } = {}) {
  let cursor = x
  for (const char of text.toUpperCase()) {
    const glyph = FONT[char] ?? FONT[' ']
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] !== '1') continue
        fillRect(cursor + col * cell, y + row * cell, cell, cell, color)
      }
    }
    cursor += (5 + gap) * cell
  }
  return cursor - x - gap * cell
}

const textWidth = (text, cell, gap = 1) => [...text.toUpperCase()].length * (5 + gap) * cell - gap * cell

// --- composition ----------------------------------------------------------
// Canvas, then one inset card: the same visual grammar as the app's Today card.
fillRect(0, 0, WIDTH, HEIGHT, CANVAS)
roundedRect(40, 40, WIDTH - 40, HEIGHT - 40, 28, SURFACE, { border: 3, borderColor: LINE })

// Monogram tile, mirroring public/icons/icon.svg (5x7 pair, 11 cells + a gap).
const TILE = 200
const tileLeft = 96
const tileTop = 100
roundedRect(tileLeft, tileTop, tileLeft + TILE, tileTop + TILE, 44, CANVAS, { border: 4, borderColor: LINE })
const monogramCell = 14
const monogramWidth = 11 * monogramCell + 2 * monogramCell - monogramCell
drawText('DA', tileLeft + Math.round((TILE - monogramWidth) / 2), tileTop + 46, monogramCell, INK)
fillRect(tileLeft + 44, tileTop + 148, 96, 9, ACCENT)
fillRect(tileLeft + 148, tileTop + 148, 40, 9, LINE)

// Wordmark, the one-sentence promise, then the three facts that are true.
const TEXT_LEFT = 360
drawText('DSA ARCHIVE', TEXT_LEFT, 104, 8, INK)
drawText('A BEGINNER-FIRST DSA WORKSPACE', TEXT_LEFT, 186, 3, MUTED)
fillRect(TEXT_LEFT, 232, 760, 2, LINE)

const rows = [
  ['495 ROWS · 20 TOPICS', INK],
  ['QUIZZES · LOCAL RUNNER', INK],
  ['OFFLINE · NO TRACKERS', ACCENT],
]
rows.forEach(([text, color], index) => {
  drawText(text, TEXT_LEFT, 280 + index * 56, 5, color)
})

// Footer: the honest licence line, deliberately small and quiet. One line, and
// the width is asserted rather than hoped for — overlapping text is a bug that
// only shows up in the rendered card.
fillRect(96, HEIGHT - 126, WIDTH - 192, 2, LINE)
const footer = 'MIT CODE & DATA \u00b7 LINKS BELONG TO THEIR AUTHORS'
const footerCell = 3
if (textWidth(footer, footerCell) > WIDTH - 192) throw new Error('og-image footer is too wide')
drawText(footer, 96, HEIGHT - 104, footerCell, MUTED)

await mkdir(path.join(root, 'public'), { recursive: true })
const out = path.join(root, 'public', 'og-image.png')
await writeFile(out, encodePng(WIDTH, HEIGHT, canvas))
console.log(`og-image: ${WIDTH}x${HEIGHT} → public/og-image.png`)
