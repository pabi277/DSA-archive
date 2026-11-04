/**
 * Phase v2-06 — the problem page's tab is URL state, not widget state.
 *
 * `#/problem/two-sum?tab=code` has to open the Code panel on any device at any
 * width: the phone tab strip is only a *control* for the address, and the
 * desktop rail writes the same address. Keeping the parser here (rather than
 * inline in the screen) means the contract is unit-tested without a DOM, and
 * the screen only has to re-read it when the address changes.
 */

export type ProblemTab = 'problem' | 'stamps' | 'code'

export const PROBLEM_TABS: readonly ProblemTab[] = ['problem', 'stamps', 'code']

/** The canonical address of one tab on one problem. `problem` is the default. */
export function tabHref(problemId: string, tab: ProblemTab): string {
  return tab === 'problem' ? `#/problem/${problemId}` : `#/problem/${problemId}?tab=${tab}`
}

/**
 * The tab named by a location hash. Anything unrecognised (including no query
 * at all) is the default panel, so a hand-edited URL degrades instead of
 * breaking.
 */
export function tabFromHash(hash: string): ProblemTab {
  const match = hash.match(/[?&]tab=(problem|stamps|code)(?:&|$)/)
  return (match?.[1] as ProblemTab | undefined) ?? 'problem'
}
