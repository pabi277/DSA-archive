import { useSyncExternalStore } from 'react'

/**
 * Tiny local settings (phase 1). `docs/DATA-MODEL.md` §1 keeps "tiny
 * settings in localStorage" and §3 lists `theme` / `hideDone` on the
 * phase-2 user profile, so these keys are the local half of that shape.
 * Dark-first is the owner-approved 0-D default.
 */

export type Theme = 'dark' | 'light'
export type Settings = { theme: Theme; largeText: boolean; hideDone: boolean }

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
const listeners = new Set<() => void>()

function current(): Settings {
  if (cached === null) cached = readStorage()
  return cached
}

function commit(next: Settings) {
  cached = next
  writeStorage(next)
  for (const listener of listeners) listener()
}

export function subscribeSettings(listener: () => void) {
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
  commit({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })
}

export function toggleLargeText() {
  const settings = current()
  commit({ ...settings, largeText: !settings.largeText })
}

export function toggleHideDone() {
  const settings = current()
  commit({ ...settings, hideDone: !settings.hideDone })
}

export function resetSettingsStoreForTests() {
  cached = null
}
