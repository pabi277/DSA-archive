/**
 * Phase v2-06 — `oEmbed` metadata access, build-time only.
 *
 * `tools/fetch-media.mjs` writes one `data/media/<videoId>.json` per *unique*
 * video (298 ids behind 369 single-source links), and `vite.config.ts` folds
 * that folder into the existing `virtual:dsa-content` bundle. The runtime
 * therefore never calls `https://www.youtube.com/oembed`: no CORS question, no
 * network request, and real titles/thumbnails in Airplane Mode.
 *
 * Every accessor tolerates a missing or malformed entry — a row with no cached
 * metadata simply shows the single-source link, and a row whose cached entry is
 * flagged `dead` gets the designed fallback instead of a broken frame.
 */

export type MediaThumbnail = { url: string; width: number; height: number }

export type MediaEntry = {
  videoId: string
  /** oEmbed `title`, or '' when the video could not be read. */
  title: string
  /** oEmbed `author_name` (the channel), shown verbatim. */
  author: string
  thumbnail: MediaThumbnail | null
  /** ISO day the metadata was fetched. */
  fetched: string
  /** oEmbed 404/401/403 at fetch time: do not embed, offer the watch link. */
  dead: boolean
  /** True when the id was never queried (builder had no network). */
  unknown: boolean
}

export const MEDIA_MIN = 0
export const MEDIA_TITLE_LIMIT = 160
export const MEDIA_AUTHOR_LIMIT = 80

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function text(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

function day(value: unknown): string {
  const raw = text(value, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

function thumbnail(value: unknown): MediaThumbnail | null {
  const item = record(value)
  if (!item) return null
  const url = text(item.url, 300)
  if (!url.startsWith('https://')) return null
  const width = typeof item.width === 'number' && Number.isInteger(item.width) && item.width > 0 ? item.width : 0
  const height = typeof item.height === 'number' && Number.isInteger(item.height) && item.height > 0 ? item.height : 0
  return width > 0 && height > 0 ? { url, width, height } : { url, width, height: height || 0 }
}

/** Shape-check one cached file; null when the id inside it disagrees. */
export function sanitizeMediaEntry(videoId: string, raw: unknown): MediaEntry | null {
  const item = record(raw)
  if (!item) return null
  if (text(item.videoId, 16) !== videoId) return null
  return {
    videoId,
    title: text(item.title, MEDIA_TITLE_LIMIT),
    author: text(item.author, MEDIA_AUTHOR_LIMIT),
    thumbnail: thumbnail(item.thumbnail),
    fetched: day(item.fetched),
    dead: item.dead === true,
    unknown: item.unknown === true,
  }
}

export type MediaIndex = Record<string, MediaEntry>

export function sanitizeMediaIndex(raw: unknown): MediaIndex {
  const bag = record(raw)
  if (!bag) return {}
  const index: MediaIndex = {}
  for (const [videoId, value] of Object.entries(bag)) {
    const entry = sanitizeMediaEntry(videoId, value)
    if (entry) index[videoId] = entry
  }
  return index
}

/**
 * What the page should do with one id. `live` embeds, `dead` shows the
 * fallback card, `unknown` embeds anyway (an unqueried id is not evidence of a
 * dead link, and the player reports its own error codes if it is one).
 */
export type MediaStatus = 'live' | 'dead' | 'unknown' | 'missing'

export function mediaStatus(entry: MediaEntry | undefined | null): MediaStatus {
  if (!entry) return 'missing'
  if (entry.dead) return 'dead'
  if (entry.unknown) return 'unknown'
  return 'live'
}

/** Real title when we have one, else the problem title — never a raw URL. */
export function videoTitle(entry: MediaEntry | undefined | null, fallback: string): string {
  const title = entry?.title?.trim()
  return title ? title : fallback
}

export function creditLine(entry: MediaEntry | undefined | null): string {
  if (!entry) return 'YouTube'
  if (entry.author && entry.title) return `${entry.author} on YouTube`
  return 'YouTube'
}
