/**
 * Clean-room PWA icon generator for DSA Archive (phase 6.1).
 *
 * Uses only Node built-ins (`node:zlib`, `node:fs/promises`) and our frozen
 * phase-0-D palette (`#101313` canvas, `#171b1b` surface, `#343a38` line,
 * `#edf0ed` ink, `#c4d0ca` accent) — zero external dependencies and zero
 * assets from `copy-web/`.
 */
import { deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = path.join(root, 'public', 'icons')

const PALETTE = {
  canvas: [0x10, 0x13, 0x13, 0xff],
  surface: [0x17, 0x1b, 0x1b, 0xff],
  line: [0x34, 0x3a, 0x38, 0xff],
  ink: [0xed, 0xf0, 0xed, 0xff],
  accent: [0xc4, 0xd0, 0xca, 0xff],
}

// Crisp 5x7 bitmap glyphs for "D" and "A" (wordmark monogram).
const GLYPH_D = [
  '11110',
  '10001',
  '10001',
  '10001',
  '10001',
  '10001',
  '11110',
]

const GLYPH_A = [
  '01110',
  '10001',
  '10001',
  '11111',
  '10001',
  '10001',
  '10001',
]

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c >>> 0
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBytes, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([length, crcInput, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0 // filter: None
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x >= right || y < top || y >= bottom) return false
  const cx = x < left + radius ? left + radius : x >= right - radius ? right - radius - 1 : x
  const cy = y < top + radius ? top + radius : y >= bottom - radius ? bottom - radius - 1 : y
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

function drawGlyph(rgba, size, glyph, originX, originY, cell, color) {
  for (let row = 0; row < glyph.length; row += 1) {
    for (let col = 0; col < glyph[row].length; col += 1) {
      if (glyph[row][col] !== '1') continue
      const x0 = originX + col * cell
      const y0 = originY + row * cell
      for (let y = y0; y < y0 + cell; y += 1) {
        for (let x = x0; x < x0 + cell; x += 1) {
          if (x < 0 || x >= size || y < 0 || y >= size) continue
          const offset = (y * size + x) * 4
          rgba[offset] = color[0]
          rgba[offset + 1] = color[1]
          rgba[offset + 2] = color[2]
          rgba[offset + 3] = color[3]
        }
      }
    }
  }
}

function renderIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  const inset = maskable ? Math.round(size * 0.14) : Math.round(size * 0.06)
  const border = Math.max(2, Math.round(size * 0.02))
  const outerRadius = maskable ? Math.round(size * 0.16) : Math.round(size * 0.22)
  const innerRadius = Math.max(4, outerRadius - border)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color = PALETTE.canvas
      if (insideRoundedRect(x, y, inset, inset, size - inset, size - inset, outerRadius)) {
        color = insideRoundedRect(
          x,
          y,
          inset + border,
          inset + border,
          size - inset - border,
          size - inset - border,
          innerRadius,
        )
          ? PALETTE.surface
          : PALETTE.line
      }
      const offset = (y * size + x) * 4
      rgba[offset] = color[0]
      rgba[offset + 1] = color[1]
      rgba[offset + 2] = color[2]
      rgba[offset + 3] = color[3]
    }
  }

  // Monogram "DA": 5 + 1 + 5 = 11 cols wide, 7 rows tall.
  const cell = Math.max(4, Math.floor((size * (maskable ? 0.42 : 0.5)) / 11))
  const totalWidth = 11 * cell
  const totalHeight = 7 * cell
  const startX = Math.floor((size - totalWidth) / 2)
  const startY = Math.floor((size - totalHeight) / 2)
  drawGlyph(rgba, size, GLYPH_D, startX, startY, cell, PALETTE.ink)
  drawGlyph(rgba, size, GLYPH_A, startX + 6 * cell, startY, cell, PALETTE.accent)

  // Subtle progress bar underline in frozen accent below the monogram.
  const barY = startY + totalHeight + Math.max(3, Math.round(cell * 0.9))
  const barHeight = Math.max(2, Math.round(cell * 0.55))
  if (barY + barHeight < size - inset - border * 2) {
    for (let y = barY; y < barY + barHeight; y += 1) {
      for (let x = startX; x < startX + totalWidth; x += 1) {
        const color = x < startX + Math.round(totalWidth * 0.64) ? PALETTE.accent : PALETTE.line
        const offset = (y * size + x) * 4
        rgba[offset] = color[0]
        rgba[offset + 1] = color[1]
        rgba[offset + 2] = color[2]
        rgba[offset + 3] = color[3]
      }
    }
  }

  return encodePng(size, size, rgba)
}

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="DSA Archive">
  <rect width="128" height="128" rx="28" fill="#101313"/>
  <rect x="8" y="8" width="112" height="112" rx="22" fill="#171b1b" stroke="#343a38" stroke-width="3"/>
  <text x="64" y="72" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="44" font-weight="750" letter-spacing="-2">
    <tspan fill="#edf0ed">D</tspan><tspan fill="#c4d0ca">A</tspan>
  </text>
  <rect x="30" y="88" width="68" height="5" rx="2.5" fill="#343a38"/>
  <rect x="30" y="88" width="44" height="5" rx="2.5" fill="#c4d0ca"/>
</svg>
`

await mkdir(iconsDir, { recursive: true })
await writeFile(path.join(iconsDir, 'icon.svg'), svgIcon, 'utf8')
await writeFile(path.join(iconsDir, 'apple-touch-icon.png'), renderIcon(180))
await writeFile(path.join(iconsDir, 'icon-192.png'), renderIcon(192))
await writeFile(path.join(iconsDir, 'icon-512.png'), renderIcon(512))
await writeFile(path.join(iconsDir, 'icon-maskable-512.png'), renderIcon(512, { maskable: true }))
console.log('Generated clean-room PWA icons in public/icons/.')
