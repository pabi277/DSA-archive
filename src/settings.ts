import { useSyncExternalStore } from 'react'

/**
 * Tiny local settings (phase 1), plus the phase-2 profile sync hand-off.
 * `theme` / `hideDone` map to `users/{uid}` in DATA-MODEL §3; `largeText`
 * stays a local accessibility preference. A change source lets the cloud
 * listener distinguish a local toggle from a profile snapshot applied here.
 */

export type Theme = 'dark' | 'light'
export type Settings = { theme: Theme; largeText: boolean; hideDone: boolean }
export type SettingsChangeSource = 'local' | 'cloud'

const STORAGE_KEY = 'dsa-archive.settings.v1'
export const defaultSettings: Settings = { theme: 'dark', largeText: false, hideDone: false }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitize(raw: unknown): Settings {
  if (!isRecord(raw)) return defaultSettings
  return {
    theme: raw.theme === 'light' ? 'light' : 'dark',
    largeText: raw.largeText === true,
    hideDone: raw.hideDone === true,
  }
}

function readStorage(): Settings {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return defaultSettings
  }
}

function writeStorage(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Settings are a convenience; never break the sheet over them.
  }
}

let cached: Settings | null = null
const listeners = new Set<(source: SettingsChangeSource) => void>()

function current(): Settings {
  if (cached === null) cached = readStorage()
  return cached
}

function commit(next: Settings, source: SettingsChangeSource) {
  cached = next
  writeStorage(next)
  for (const listener of listeners) listener(source)
}

export function subscribeSettings(listener: (source: SettingsChangeSource) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSettingsSnapshot(): Settings {
  return current()
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsSnapshot)
}

export function toggleTheme() {
  const settings = current()
  commit({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' }, 'local')
}

export function toggleLargeText() {
  const settings = current()
  commit({ ...settings, largeText: !settings.largeText }, 'local')
}

export function toggleHideDone() {
  const settings = current()
  commit({ ...settings, hideDone: !settings.hideDone }, 'local')
}

/** Apply a Firestore profile or backup without echoing a cloud write. */
export function applyProfileSettings(theme: Theme, hideDone: boolean, largeText?: boolean) {
  const settings = current()
  const next: Settings = {
    theme,
    hideDone,
    largeText: typeof largeText === 'boolean' ? largeText : settings.largeText,
  }
  if (
    next.theme === settings.theme &&
    next.hideDone === settings.hideDone &&
    next.largeText === settings.largeText
  ) {
    return
  }
  commit(next, 'cloud')
}

export function resetSettingsStoreForTests() {
  cached = null
  listeners.clear()
}
