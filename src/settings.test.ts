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
  localSettingsVersion,
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

describe('a local change is detectable while a profile load is in flight (phase v2-10)', () => {
  /**
   * The screenshots work found a real race: `users/{uid}` carries theme and
   * hideDone, and the account hook applied every profile snapshot over local
   * state. A read that started before a tap could land after it and put the old
   * theme back — and the reverted value was then written to Firestore, so the
   * next boot agreed with the revert. The hook now asks "did this device change
   * a preference since the load began?", which is what this counter answers.
   * Whether the snapshot listener exists yet must not matter (that ordering is
   * itself a race), so the counter is what the decision reads.
   */
  it('counts only local changes, never a cloud application', () => {
    const start = localSettingsVersion()
    expect(localSettingsVersion()).toBe(start)

    // A cloud value arriving must not look like a local change: that would
    // block the very first profile load from applying.
    applyProfileSettings('light', true)
    expect(localSettingsVersion()).toBe(start)

    // A learner's tap does look like one, and stays visible after the write
    // path re-reads the store.
    toggleRail()
    expect(localSettingsVersion()).toBe(start + 1)
    expect(getSettingsSnapshot().railCollapsed).toBe(true)
    expect(localSettingsVersion()).toBe(start + 1)
  })

  it('is independent of listeners, so it cannot depend on registration order', () => {
    // No subscriber is registered in this test at all; the old implementation
    // (a `settingsTouched` flag set inside the account hook's listener) would
    // have reported "untouched" here and let the cloud value win.
    const start = localSettingsVersion()
    setDensity('compact')
    expect(localSettingsVersion()).toBeGreaterThan(start)
    expect(getSettingsSnapshot().density).toBe('compact')
  })

  it('starts from zero in a fresh store so a new page cannot inherit a count', () => {
    toggleRail()
    expect(localSettingsVersion()).toBe(1)
    resetSettingsStoreForTests()
    expect(localSettingsVersion()).toBe(0)
  })
})
