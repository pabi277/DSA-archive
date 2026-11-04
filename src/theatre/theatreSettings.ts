/**
 * Phase v2-06 — the theatre's device-local state, as one hook.
 *
 * Three small things survive a reload, all of them *device* preferences or
 * local flags — none of them is study data, so none is written to Firestore and
 * none appears in a backup:
 *
 *  · playback speed **per topic**   (`dsa-archive.speed.v1`)
 *  · the opt-in auto-advance toggle (`dsa-archive.theatre.autoadvance.v1`, off by default)
 *  · "watched" flags                (`dsa-archive.watch.v1`, ≥60% of the runtime)
 *
 * Changing something notifies subscribers, so the stage, the mini player and
 * Settings agree without passing props through five components.
 */
import { useSyncExternalStore } from 'react'
import {
  rateForTopic,
  readSpeeds,
  rememberRate,
  writeSpeeds,
  type PlaybackRate,
  type SpeedByTopic,
} from './speedMemory'
import { readAutoAdvance, writeAutoAdvance } from './autoAdvance'
import { mergeWatchFlag, sanitizeWatchFlags, WATCH_STORAGE_KEY, type WatchFlags } from './video'

export type TheatreState = {
  speeds: SpeedByTopic
  autoAdvance: boolean
  watched: WatchFlags
}

let cached: TheatreState | null = null
const listeners = new Set<() => void>()

function readWatched(): WatchFlags {
  try {
    const raw = globalThis.localStorage?.getItem(WATCH_STORAGE_KEY) ?? 'null'
    return sanitizeWatchFlags(JSON.parse(raw))
  } catch {
    return {}
  }
}

function current(): TheatreState {
  if (cached === null) {
    cached = { speeds: readSpeeds(), autoAdvance: readAutoAdvance(), watched: readWatched() }
  }
  return cached
}

function commit(next: TheatreState) {
  cached = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTheatreSettings(): TheatreState {
  return useSyncExternalStore(subscribe, current, current)
}

export function setTopicRate(topicId: string, rate: PlaybackRate) {
  const state = current()
  const speeds = rememberRate(state.speeds, topicId, rate)
  writeSpeeds(speeds)
  commit({ ...state, speeds })
}

export function resetAllRates() {
  const state = current()
  writeSpeeds({})
  commit({ ...state, speeds: {} })
}

export function setAutoAdvance(on: boolean) {
  writeAutoAdvance(on)
  commit({ ...current(), autoAdvance: on })
}

/** Record ≥60% seen. Highest percentage wins; the store is capped at 400 ids. */
export function markWatched(videoId: string, percent: number) {
  const state = current()
  const watched = mergeWatchFlag(state.watched, videoId, percent)
  try {
    globalThis.localStorage?.setItem(WATCH_STORAGE_KEY, JSON.stringify(watched))
  } catch {
    // A blocked storage quota must never break playback.
  }
  commit({ ...state, watched })
}

export function rateFor(topicId: string): PlaybackRate {
  return rateForTopic(current().speeds, topicId)
}

export function resetTheatreSettingsForTests() {
  cached = null
  listeners.clear()
}
