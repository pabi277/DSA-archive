import { useSyncExternalStore } from 'react'

/**
 * Tiny local settings (phase 1), plus the phase-2 profile sync hand-off.
 * `theme` / `hideDone` map to `users/{uid}` in DATA-MODEL §3; `largeText`
 * stays a local accessibility preference. A change source lets the cloud
 * listener distinguish a local toggle from a profile snapshot applied here.
 *
 * Phase v2-01 adds two shell preferences — `density` (row height) and
 * `railCollapsed` (desktop sidebar rail). They are **local only** on purpose:
 * they describe the device you are holding, not your study record, so they are
 * never written to Firestore and never change the profile/rules shape. Both are
 * sanitised on read (malformed → default) and older backups that lack them keep
 * importing unchanged.
 */

export type Theme = 'dark' | 'light'
export type Density = 'compact' | 'comfortable' | 'roomy'
export type Settings = {
  theme: Theme
  largeText: boolean
  hideDone: boolean
  density: Density
  railCollapsed: boolean
}
export type SettingsChangeSource = 'local' | 'cloud'

const STORAGE_KEY = 'dsa-archive.settings.v1'
export const DENSITIES: Density[] = ['compact', 'comfortable', 'roomy']
export const DENSITY_LABELS: Record<Density, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  roomy: 'Roomy',
}
/** Row heights frozen in tokens v2 (`--row-height`). */
export const DENSITY_ROW_HEIGHT: Record<Density, number> = {
  compact: 38,
  comfortable: 48,
  roomy: 62,
}

export const defaultSettings: Settings = {
  theme: 'dark',
  largeText: false,
  hideDone: false,
  density: 'comfortable',
  railCollapsed: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function clampDensity(value: unknown): Density {
  return typeof value === 'string' && (DENSITIES as string[]).includes(value)
    ? (value as Density)
    : defaultSettings.density
}

function sanitize(raw: unknown): Settings {
  if (!isRecord(raw)) return defaultSettings
  return {
    theme: raw.theme === 'light' ? 'light' : 'dark',
    largeText: raw.largeText === true,
    hideDone: raw.hideDone === true,
    density: clampDensity(raw.density),
    railCollapsed: raw.railCollapsed === true,
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

export function setTheme(theme: Theme) {
  const settings = current()
  if (settings.theme === theme) return
  commit({ ...settings, theme }, 'local')
}

export function toggleLargeText() {
  const settings = current()
  commit({ ...settings, largeText: !settings.largeText }, 'local')
}

export function toggleHideDone() {
  const settings = current()
  commit({ ...settings, hideDone: !settings.hideDone }, 'local')
}

export function setDensity(density: Density) {
  const settings = current()
  const next = clampDensity(density)
  if (next === settings.density) return
  commit({ ...settings, density: next }, 'local')
}

export function cycleDensity() {
  const settings = current()
  const index = DENSITIES.indexOf(settings.density)
  setDensity(DENSITIES[(index + 1) % DENSITIES.length])
}

export function toggleRail() {
  const settings = current()
  commit({ ...settings, railCollapsed: !settings.railCollapsed }, 'local')
}

export function setRailCollapsed(railCollapsed: boolean) {
  const settings = current()
  if (settings.railCollapsed === railCollapsed) return
  commit({ ...settings, railCollapsed }, 'local')
}

/**
 * Apply a Firestore profile or backup without echoing a cloud write. Local-only
 * preferences (density, rail) are preserved — a phone and a laptop keep their
 * own row height even while sharing one study record.
 */
export function applyProfileSettings(theme: Theme, hideDone: boolean, largeText?: boolean) {
  const settings = current()
  const next: Settings = {
    ...settings,
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
