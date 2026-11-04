#!/usr/bin/env node
/**
 * Phase v2-06 — oEmbed metadata fetcher (build time, never runtime).
 *
 * Reads every single-source `links.video` out of `data/problems.json`
 * (369 links → 298 unique ids, unchanged byte-for-byte — the owner decided
 * videos stay single-source and are never rewritten) and writes one
 * `data/media/<videoId>.json` per id:
 *
 *   { videoId, title, author, thumbnail, fetched, dead, unknown }
 *
 * · `title` / `author` / `thumbnail` come from YouTube's public oEmbed
 *   endpoint (`https://www.youtube.com/oembed?url=…&format=json`).
 * · `dead: true` when oEmbed answers 404/401/403 — the video is private,
 *   removed, or not embeddable. The app then shows the fallback card with an
 *   `Open on YouTube` link instead of a broken frame.
 * · `unknown: true` when the request could neither succeed nor fail (no
 *   network in the build sandbox, a timeout). Never treated as dead: a missing
 *   answer is not evidence.
 *
 * Re-runs are polite: an entry is reused when its `fetched` day is inside
 * `MEDIA_MAX_AGE_DAYS` unless `--refresh` is passed, and every request is
 * sequential with a small pause so 298 ids do not hammer the endpoint.
 *
 *   node tools/fetch-media.mjs                 # fetch missing/stale entries
 *   node tools/fetch-media.mjs --dry-run       # report only, write nothing
 *   node tools/fetch-media.mjs --refresh       # re-fetch every id
 *   node tools/fetch-media.mjs --only=<id>     # one id (debugging)
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const catalogueFile = path.join(root, 'data/problems.json')
const mediaDir = path.join(root, 'data/media')
const MEDIA_MAX_AGE_DAYS = 30
const REQUEST_TIMEOUT_MS = Number(process.env.MEDIA_TIMEOUT_MS || 6000)
const PAUSE_MS = Number(process.env.MEDIA_PAUSE_MS || 120)
const UA = 'DSA-Archive-oembed/1.0 (+clean-room study archive; contact via GitHub)'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const REFRESH = args.has('--refresh')
const ONLY = [...args].find((arg) => arg.startsWith('--only='))?.split('=')[1] ?? null

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set(['youtu.be', 'www.youtube.com', 'youtube.com', 'm.youtube.com'])

export function parseVideoId(url) {
  try {
    const parsed = new URL(url)
    if (!YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) return null
    const candidate = parsed.hostname.toLowerCase() === 'youtu.be'
      ? parsed.pathname.replace(/^\/+/, '').split('/')[0]
      : parsed.searchParams.get('v') ?? ''
    return VIDEO_ID.test(candidate) ? candidate : null
  } catch {
    return null
  }
}

function dayOf(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function ageDays(day) {
  const then = Date.parse(`${day}T00:00:00Z`)
  if (Number.isNaN(then)) return Infinity
  return Math.floor((Date.now() - then) / 86_400_000)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** One polite oEmbed request. Returns { ok: true, data } | { ok: false, status, unknown }. */
export async function fetchOembed(videoId) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (response.status === 404 || response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, unknown: false }
    }
    if (!response.ok) return { ok: false, status: response.status, unknown: true }
    const data = await response.json()
    if (typeof data?.title !== 'string' || data.title.trim() === '') {
      return { ok: false, status: response.status, unknown: true }
    }
    return { ok: true, data }
  } catch (error) {
    return { ok: false, status: 0, unknown: true, error: String(error?.message ?? error) }
  }
}

export function entryFrom(videoId, oembed) {
  const thumb = oembed?.thumbnail_url
  return {
    videoId,
    title: typeof oembed?.title === 'string' ? oembed.title.trim().slice(0, 160) : '',
    author: typeof oembed?.author_name === 'string' ? oembed.author_name.trim().slice(0, 80) : '',
    thumbnail:
      typeof thumb === 'string' && thumb.startsWith('https://')
        ? {
            url: thumb,
            width: Number.isInteger(oembed?.thumbnail_width) ? oembed.thumbnail_width : 480,
            height: Number.isInteger(oembed?.thumbnail_height) ? oembed.thumbnail_height : 360,
          }
        : null,
    fetched: dayOf(),
    dead: false,
    unknown: false,
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  const catalogue = await readJson(catalogueFile)
  if (!catalogue) throw new Error('data/problems.json is unreadable')

  const ids = new Set()
  const links = new Map()
  let videoLinks = 0
  let unparseable = 0
  for (const topic of catalogue.topics) {
    for (const subtopic of topic.subtopics) {
      for (const problem of subtopic.problems) {
        const url = problem.links?.video
        if (!url) continue
        videoLinks += 1
        const id = parseVideoId(url)
        if (!id) {
          unparseable += 1
          console.warn(`  ! ${problem.id}: video link is not a parseable YouTube id (left untouched): ${url}`)
          continue
        }
        ids.add(id)
        links.set(id, problem.links.video)
      }
    }
  }

  await mkdir(mediaDir, { recursive: true })
  const existingFiles = new Set((await readdir(mediaDir)).filter((name) => name.endsWith('.json')))
  const all = ONLY ? [...ids].filter((id) => id === ONLY) : [...ids].sort()

  let fetched = 0
  let reused = 0
  let dead = 0
  let unknown = 0
  const written = []

  for (const videoId of all) {
    const file = path.join(mediaDir, `${videoId}.json`)
    const previous = existingFiles.has(`${videoId}.json`) ? await readJson(file) : null
    if (previous && !REFRESH && previous.videoId === videoId && ageDays(previous.fetched) <= MEDIA_MAX_AGE_DAYS) {
      reused += 1
      if (previous.dead) dead += 1
      if (previous.unknown) unknown += 1
      continue
    }

    if (DRY_RUN) {
      console.log(`  would fetch ${videoId} (${links.get(videoId)})`)
      continue
    }

    const result = await fetchOembed(videoId)
    let entry
    if (result.ok) {
      entry = entryFrom(videoId, result.data)
      fetched += 1
    } else if (result.unknown) {
      // No answer (offline builder, timeout, rate limit): write nothing at all.
      // A missing file is the honest state — the player is still shown and
      // still reports its own error codes — whereas a committed `unknown` entry
      // would be a guess about a video we never actually heard about.
      unknown += 1
      console.warn(`  ? ${videoId}: could not reach oEmbed (${result.error ?? `HTTP ${result.status}`}) — no file written`)
      await sleep(PAUSE_MS)
      continue
    } else {
      entry = { videoId, title: '', author: '', thumbnail: null, fetched: dayOf(), dead: true, unknown: false }
      dead += 1
      console.warn(`  x ${videoId}: oEmbed HTTP ${result.status} — recorded as dead`)
    }
    await writeFile(file, `${JSON.stringify(entry, null, 2)}\n`, 'utf8')
    written.push(entry)
    await sleep(PAUSE_MS)
  }

  console.log(
    [
      `Media metadata: ${videoLinks} single-source video links · ${ids.size} unique ids`,
      unparseable > 0 ? `  ${unparseable} link(s) were not parseable YouTube ids and were left untouched` : null,
      `  fetched ${fetched} · reused ${reused} · dead ${dead} · unknown ${unknown} · written ${written.length}`,
      DRY_RUN ? '  dry run — nothing written' : `  files in data/media/: ${(await readdir(mediaDir)).filter((n) => n.endsWith('.json')).length}`,
    ]
      .filter(Boolean)
      .join('\n'),
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await main()
}
