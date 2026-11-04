import { describe, expect, it } from 'vitest'
import { PROBLEM_TABS, tabFromHash, tabHref } from './tab'

describe('tabFromHash', () => {
  it('defaults to the problem panel when the address names no tab', () => {
    expect(tabFromHash('')).toBe('problem')
    expect(tabFromHash('#/problem/two-sum')).toBe('problem')
  })

  it('reads every tab the address can name', () => {
    expect(tabFromHash('#/problem/two-sum?tab=code')).toBe('code')
    expect(tabFromHash('#/problem/two-sum?tab=stamps')).toBe('stamps')
    expect(tabFromHash('#/problem/two-sum?tab=problem')).toBe('problem')
  })

  it('reads the tab when other parameters surround it', () => {
    expect(tabFromHash('#/problem/two-sum?tab=code&from=search')).toBe('code')
    expect(tabFromHash('#/problem/two-sum?from=search&tab=stamps')).toBe('stamps')
  })

  it('degrades to the default instead of breaking on junk', () => {
    expect(tabFromHash('#/problem/two-sum?tab=nonsense')).toBe('problem')
    expect(tabFromHash('#/problem/two-sum?tab=codex')).toBe('problem')
    expect(tabFromHash('#/problem/two-sum?tabs=code')).toBe('problem')
  })
})

describe('tabHref', () => {
  it('omits the query for the default panel, so one address is canonical', () => {
    expect(tabHref('two-sum', 'problem')).toBe('#/problem/two-sum')
    expect(tabHref('two-sum', 'code')).toBe('#/problem/two-sum?tab=code')
  })

  it('round-trips through the parser for every tab', () => {
    for (const tab of PROBLEM_TABS) {
      expect(tabFromHash(tabHref('two-sum', tab))).toBe(tab)
    }
  })
})
