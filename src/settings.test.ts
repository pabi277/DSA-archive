import { afterEach, describe, expect, it } from 'vitest'
import {
  DENSITIES,
  DENSITY_ROW_HEIGHT,
  applyProfileSettings,
  applyProfileTargets,
  clampDensity,
  clampTargetDate,
  clampTargetListId,
  cycleDensity,
  getSettingsSnapshot,
  resetSettingsStoreForTests,
  setDensity,
  setRailCollapsed,
  setTargetDate,
  setTargetList,
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

describe('target date and target list (phase v2-08)', () => {
  it('accepts only a real calendar day', () => {
    expect(clampTargetDate('2026-12-02')).toBe('2026-12-02')
    for (const bad of ['2026-02-30', '2026-13-01', '26-12-02', '2026-12-02T00:00', '', null, undefined, 20261202, {}]) {
      expect(clampTargetDate(bad)).toBeNull()
    }
  })

  it('accepts only a rules-shaped list id', () => {
    expect(clampTargetListId('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')).toBe('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')
    for (const bad of ['short', 'UPPER-CASE-1111', 'has space 1234', '', null, undefined, 42, {}]) {
      expect(clampTargetListId(bad)).toBeNull()
    }
  })

  it('round-trips through storage and survives a corrupt blob', () => {
    setTargetDate('2026-12-02')
    setTargetList('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')
    expect(getSettingsSnapshot()).toMatchObject({
      targetDate: '2026-12-02',
      targetListId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    })
    localStorage.setItem('dsa-archive.settings.v1', JSON.stringify({ targetDate: 'tomorrow', targetListId: 'x' }))
    resetSettingsStoreForTests()
    expect(getSettingsSnapshot()).toMatchObject({ targetDate: null, targetListId: null })
  })

  it('applies a cloud profile without clobbering device preferences, and clears when absent', () => {
    setDensity('compact')
    applyProfileTargets('2026-12-02', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')
    expect(getSettingsSnapshot()).toMatchObject({
      density: 'compact',
      targetDate: '2026-12-02',
      targetListId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    })
    applyProfileTargets(undefined, undefined)
    expect(getSettingsSnapshot()).toMatchObject({ targetDate: null, targetListId: null, density: 'compact' })
  })

  it('clears a target with null', () => {
    setTargetDate('2026-12-02')
    setTargetDate(null)
    expect(getSettingsSnapshot().targetDate).toBeNull()
  })
})
