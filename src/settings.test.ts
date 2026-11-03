import { afterEach, describe, expect, it } from 'vitest'
import {
  DENSITIES,
  DENSITY_ROW_HEIGHT,
  applyProfileSettings,
  clampDensity,
  cycleDensity,
  getSettingsSnapshot,
  resetSettingsStoreForTests,
  setDensity,
  setRailCollapsed,
  toggleRail,
} from './settings'

/**
 * Settings module contract for phase v2-01: the two new device preferences
 * (`density`, `railCollapsed`) are sanitised on every read and write, and a
 * malformed value can never reach the DOM as a broken `data-density`.
 */

afterEach(() => {
  localStorage.clear()
  resetSettingsStoreForTests()
})

describe('density', () => {
  it('froze the three documented row heights', () => {
    expect(DENSITIES).toEqual(['compact', 'comfortable', 'roomy'])
    expect(DENSITY_ROW_HEIGHT).toEqual({ compact: 38, comfortable: 48, roomy: 62 })
  })

  it('clamps anything that is not a known density', () => {
    expect(clampDensity('roomy')).toBe('roomy')
    for (const bad of ['enormous', 'COMPACT', '', null, undefined, 48, {}, ['roomy']]) {
      expect(clampDensity(bad)).toBe('comfortable')
    }
  })

  it('persists the choice and round-trips it', () => {
    setDensity('compact')
    expect(getSettingsSnapshot().density).toBe('compact')
    expect(JSON.parse(localStorage.getItem('dsa-archive.settings.v1')!).density).toBe('compact')
  })

  it('survives a corrupt stored blob without throwing', () => {
    localStorage.setItem('dsa-archive.settings.v1', '{ not json')
    expect(getSettingsSnapshot().density).toBe('comfortable')
    expect(getSettingsSnapshot().theme).toBe('dark')
  })
})

describe('rail', () => {
  it('remembers the collapsed rail per device', () => {
    expect(getSettingsSnapshot().railCollapsed).toBe(false)
    setRailCollapsed(true)
    expect(getSettingsSnapshot().railCollapsed).toBe(true)
    setRailCollapsed(false)
    expect(getSettingsSnapshot().railCollapsed).toBe(false)
    toggleRail()
    expect(getSettingsSnapshot().railCollapsed).toBe(true)
  })
})

describe('cloud profile never moves a device preference', () => {
  it('keeps density and the rail when a Firestore profile is applied', () => {
    setDensity('roomy')
    toggleRail()
    applyProfileSettings('light', true, true)
    const settings = getSettingsSnapshot()
    expect(settings).toMatchObject({
      theme: 'light',
      hideDone: true,
      largeText: true,
      density: 'roomy',
      railCollapsed: true,
    })
  })

  it('cycles compact → comfortable → roomy and wraps', () => {
    setDensity('compact')
    cycleDensity()
    expect(getSettingsSnapshot().density).toBe('comfortable')
    cycleDensity()
    expect(getSettingsSnapshot().density).toBe('roomy')
    cycleDensity()
    expect(getSettingsSnapshot().density).toBe('compact')
  })
})
