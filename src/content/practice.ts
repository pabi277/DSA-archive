/**
 * Synthetic `lc-<n>` drill ids. They are *not* catalogue rows: they live in the
 * existing `progressByTopic/{topicId}` shard under a deterministic key, so no
 * new Firestore collection, schema or quota path is introduced.
 */
import { catalogue, type Problem } from '../catalogue'
import { getPracticeSets } from './load'
import type { PracticeSet } from './types'

export type Drill = {
  id: string
  lc: number
  slug: string
  title: string
  level: 'basic' | 'core' | 'pro'
  set: number
  estMinutes: number
  why: string
  classic: boolean
  patternId: string
  patternTitle: string
  topicId: string
  topicTitle: string
  url: string
  verified: string
}

const TOPIC_TITLES = new Map(catalogue.topics.map((topic) => [topic.id, topic.title]))

export const PRACTICE_SETS: PracticeSet[] = getPracticeSets()

export const DRILLS: Drill[] = PRACTICE_SETS.flatMap((set) =>
  set.problems.map((problem) => ({
    id: `lc-${problem.lc}`,
    lc: problem.lc,
    slug: problem.slug,
    title: problem.title,
    level: problem.level,
    set: problem.set,
    estMinutes: problem.estMinutes,
    why: problem.why,
    classic: problem.classic,
    patternId: set.patternId,
    patternTitle: set.title,
    topicId: set.topicId,
    topicTitle: TOPIC_TITLES.get(set.topicId) ?? set.topicId,
    url: `https://leetcode.com/problems/${problem.slug}/`,
    verified: set.verified,
  })),
)

export const DRILL_BY_ID = new Map(DRILLS.map((drill) => [drill.id, drill]))
export const DRILL_IDS = new Set(DRILLS.map((drill) => drill.id))
export const DRILLS_BY_TOPIC = new Map<string, Drill[]>()
for (const drill of DRILLS) {
  const current = DRILLS_BY_TOPIC.get(drill.topicId) ?? []
  current.push(drill)
  DRILLS_BY_TOPIC.set(drill.topicId, current)
}

export function drillsForTopic(topicId: string): Drill[] {
  return DRILLS_BY_TOPIC.get(topicId) ?? []
}

export function drillIdsForTopic(topicId: string): string[] {
  return drillsForTopic(topicId).map((drill) => drill.id)
}

export function isDrillId(problemId: string): boolean {
  return DRILL_IDS.has(problemId)
}

/** A drill shaped exactly like a catalogue Problem for Today / Review / planner. */
export function drillAsProblem(drill: Drill): Problem {
  return {
    id: drill.id,
    title: `${drill.title} · LC ${drill.lc}`,
    order: drill.set,
    level: drill.level,
    kind: 'problem',
    links: { practice: drill.url, leetcode: drill.url },
    resources: [{
      type: 'practice',
      source: 'leetcode',
      url: drill.url,
      label: `${drill.title} · LeetCode ${drill.lc}`,
      rank: 1,
      verified: drill.verified,
      match: 'exact',
    }],
    lcMatch: 'exact',
    lcLabel: `LeetCode ${drill.lc}`,
  }
}
