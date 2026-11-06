/**
 * Hybrid precache split (v3): per-problem statements arrive from a lazy
 * add-on chunk instead of the precached shell. Any component that reads
 * `getStatement`/`getTests`/`getHint` calls this hook so it re-renders once
 * the chunk lands; until then the designed empty states show.
 */
import { useSyncExternalStore } from 'react'
import { statementsVersion, subscribeStatements } from './load'

/** Version counter: 0 before the statements land, 1 after. Also a memo dep. */
export function useStatements(): number {
  return useSyncExternalStore(subscribeStatements, statementsVersion, statementsVersion)
}
