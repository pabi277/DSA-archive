/**
 * Phase v2-06 — playback speed, remembered **per topic**.
 *
 * A learner who watches graph videos at 1.5× usually wants the next graph video
 * at 1.5× too, and the next arrays video at their own arrays pace. This is a
 * device preference, not a study record: it lives in `localStorage`
 * (`dsa-archive.speed.v1`), never in Firestore, never in a backup, and never in
 * the profile/rules shape.
 */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

export const DEFAULT_RATE: PlaybackRate = 1
export const SPEED_STORAGE_KEY = 'dsa-archive.speed.v1'
/** One entry per topic (20) plus headroom for renamed ids; old entries expire. */
export const SPEED_TOPIC_LIMIT = 40

export type SpeedByTopic = Record<string, PlaybackRate>

const RATE_LABELS: Record<PlaybackRate, string> = {
  0.5: '0.5×',
  0.75: '0.75×',
  1: '1×',
  1.25: '1.25×',
  1.5: '1.5×',
  1.75: '1.75×',
  2: '2×',
}

export function rateLabel(rate: PlaybackRate): string {
  return RATE_LABELS[rate] ?? `${rate}×`
}

export function clampRate(value: unknown): PlaybackRate {
  const rate = typeof value === 'number' ? value : Number(value)
  return (PLAYBACK_RATES as readonly number[]).includes(rate) ? (rate as PlaybackRate) : DEFAULT_RATE
}

/** Step one rung up or down through the documented list. */
export function stepRate(rate: PlaybackRate, direction: 1 | -1): PlaybackRate {
  const index = PLAYBACK_RATES.indexOf(clampRate(rate))
  const next = Math.max(0, Math.min(PLAYBACK_RATES.length - 1, index + direction))
  return PLAYBACK_RATES[next]
}

export function sanitizeSpeeds(raw: unknown): SpeedByTopic {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: SpeedByTopic = {}
  for (const [topicId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-z0-9-]{1,60}$/.test(topicId)) continue
    if (typeof value !== 'number' || !(PLAYBACK_RATES as readonly number[]).includes(value)) continue
    out[topicId] = value as PlaybackRate
  }
  const ids = Object.keys(out)
  for (const id of ids.slice(0, Math.max(0, ids.length - SPEED_TOPIC_LIMIT))) delete out[id]
  return out
}

export function readSpeeds(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): SpeedByTopic {
  if (!storage) return {}
  try {
    return sanitizeSpeeds(JSON.parse(storage.getItem(SPEED_STORAGE_KEY) ?? 'null'))
  } catch {
    return {}
  }
}

export function writeSpeeds(speeds: SpeedByTopic, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  if (!storage) return
  try {
    storage.setItem(SPEED_STORAGE_KEY, JSON.stringify(sanitizeSpeeds(speeds)))
  } catch {
    // A blocked storage quota must never break playback.
  }
}

/** Speed for this topic — the remembered rate, else 1×. */
export function rateForTopic(speeds: SpeedByTopic, topicId: string): PlaybackRate {
  return speeds[topicId] ?? DEFAULT_RATE
}

export function rememberRate(speeds: SpeedByTopic, topicId: string, rate: PlaybackRate): SpeedByTopic {
  const clean = clampRate(rate)
  if (clean === DEFAULT_RATE) {
    // 1× is the default, so storing it would only make "reset" ambiguous.
    const { [topicId]: _dropped, ...rest } = speeds
    return rest
  }
  return { ...speeds, [topicId]: clean }
}

export function forgetTopic(speeds: SpeedByTopic, topicId: string): SpeedByTopic {
  const { [topicId]: _dropped, ...rest } = speeds
  return rest
}

/** Topics with a non-default remembered speed, for the Settings reset list. */
export function memorisedTopics(speeds: SpeedByTopic): { topicId: string; rate: PlaybackRate }[] {
  return Object.entries(speeds)
    .map(([topicId, rate]) => ({ topicId, rate: clampRate(rate) }))
    .sort((a, b) => a.topicId.localeCompare(b.topicId))
}
