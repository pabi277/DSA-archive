import { describe, expect, it } from 'vitest'
import { buildActions, fuzzyScore, rankActions, type PaletteAction } from './commandPalette'
import { catalogue } from '../catalogue'
import { defaultSettings } from '../settings'

const noopConfig = {
  route: { name: 'today' as const, param: '', query: {}, path: '#/' },
  settings: defaultSettings,
  onOpenShortcuts: () => {},
  onToggleHideDone: () => {},
  onSetDensity: () => {},
  onRunSession: () => {},
  onSignIn: () => {},
}

function action(overrides: Partial<PaletteAction>): PaletteAction {
  return { id: 'x', label: 'x', group: 'Action', run: () => {}, ...overrides }
}

describe('palette ranking (§3.10)', () => {
  it('scores a prefix hit above a scattered subsequence hit', () => {
    expect(fuzzyScore('two', 'Two Sum')).toBeGreaterThan(fuzzyScore('two', 'How to approach two pointers'))
    expect(fuzzyScore('zzz', 'Two Sum')).toBe(-1)
    expect(fuzzyScore('', 'anything')).toBe(0)
  })

  it('matches word starts, so initials find the row', () => {
    expect(fuzzyScore('bs', 'Binary Search')).toBeGreaterThan(0)
    expect(fuzzyScore('ts', 'Two Sum')).toBeGreaterThan(0)
  })

  it('falls back to keywords and detail', () => {
    const actions = [
      action({ id: 'theme', label: 'Theme: switch to light', keywords: 'dark appearance' }),
      action({ id: 'unrelated', label: 'My lists' }),
    ]
    expect(rankActions(actions, 'dark').map((entry) => entry.id)).toEqual(['theme'])
  })

  it('opens with routes and actions first, then topics and problems', () => {
    const actions = buildActions(noopConfig)
    const ranked = rankActions(actions, '')
    expect(ranked[0].group).toBe('Go to')
    expect(ranked.some((entry) => entry.group === 'Action')).toBe(true)
    expect(ranked.length).toBeLessThanOrEqual(40)
  })

  it('puts recent choices first for an empty query', () => {
    const actions = [action({ id: 'a', label: 'Arrays', group: 'Topic' }), action({ id: 'b', label: 'Graphs', group: 'Topic' })]
    expect(rankActions(actions, '', ['Graphs'])[0].label).toBe('Graphs')
  })

  it('covers every route, all 20 topics, the whole catalogue and 10+ actions', () => {
    const actions = buildActions(noopConfig)
    const groups = (group: PaletteAction['group']) => actions.filter((entry) => entry.group === group)
    const rows = catalogue.topics.reduce(
      (sum, topic) => sum + topic.subtopics.reduce((inner, subtopic) => inner + subtopic.problems.length, 0),
      0,
    )
    // 10 destinations: the 4 primary areas, search, lists, notes, stats,
    // friends and settings. Not-found is deliberately not a destination.
    expect(groups('Go to')).toHaveLength(10)
    expect(groups('Topic')).toHaveLength(catalogue.topics.length)
    expect(groups('Problem')).toHaveLength(rows)
    expect(groups('Action').length).toBeGreaterThanOrEqual(10)
    const ids = new Set(actions.map((entry) => entry.id))
    expect(ids.size).toBe(actions.length)
  })
})
