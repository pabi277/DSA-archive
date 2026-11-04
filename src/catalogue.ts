import packedCatalogue from 'virtual:dsa-catalogue'

export type ResourceType = 'practice' | 'article' | 'video' | 'reference' | 'docs'
export type ResourceSource =
  | 'leetcode'
  | 'neetcode'
  | 'takeuforward'
  | 'geeksforgeeks'
  | 'programiz'
  | 'cp-algorithms'
  | 'usaco'
  | 'cppreference'
  | 'python-docs'
  | 'mdn'
  | 'roadmap-sh'
  | 'youtube'
export type Resource = {
  type: ResourceType
  source: ResourceSource
  url: string
  label: string
  rank: number
  verified: string
  match?: 'exact' | 'near' | 'chapter'
}

export type Problem = {
  id: string
  title: string
  order: number
  /** Optional author-curated study sequence used by phase 02. */
  learnOrder?: number
  level: 'basic' | 'core' | 'pro' | null
  kind: 'problem' | 'theory'
  links: Partial<Record<'practice' | 'article' | 'video' | 'leetcode', string>>
  /** Phase 03 ranked, multi-publisher resource set; legacy fixtures may omit it. */
  resources?: Resource[]
  /** Editorial LeetCode mapping: exact, near twin, or a theory-labelled row. */
  lcMatch?: 'exact' | 'near' | 'theory'
  lcLabel?: string
  /** Duplicate sheet slugs point at the first row that already covers them. */
  coveredBy?: string
}

export type Subtopic = { id: string; title: string; order: number; learnOrder?: number; problems: Problem[] }
export type Topic = { id: string; title: string; order: number; subtopics: Subtopic[] }
export type Catalogue = {
  schemaVersion: 2
  generatedFrom: string
  topics: Topic[]
}

const LEVELS: Problem['level'][] = [null, 'basic', 'core', 'pro']
const LCM: (Problem['lcMatch'] | undefined)[] = [undefined, 'exact', 'near', 'theory']
const RES_TYPES: ResourceType[] = ['practice', 'article', 'video', 'reference', 'docs']
const RES_SOURCES: ResourceSource[] = [
  'leetcode', 'neetcode', 'takeuforward', 'geeksforgeeks', 'programiz',
  'cp-algorithms', 'usaco', 'cppreference', 'python-docs', 'mdn',
  'roadmap-sh', 'youtube',
]
const RES_MATCHES: (Resource['match'] | undefined)[] = [undefined, 'exact', 'near', 'chapter']
const LINK_KEYS = ['practice', 'article', 'video', 'leetcode'] as const

type PackedResource = [number, number, string, number, number, number | string, number]
type PackedProblem = [
  string,
  string,
  number,
  number,
  number,
  (string | 0)[],
  number,
  number | string,
  number | string,
  PackedResource[],
]
type PackedSubtopic = [string, string, number, PackedProblem[]]
type PackedTopic = [string, string, number, PackedSubtopic[]]

function unpackCatalogue(raw: unknown[]): Catalogue {
  const [generatedFrom, prefixes, labels, rawTopics] = raw as [string, string[], string[], PackedTopic[]]
  const unpackUrl = (val: string | 0, slug: string): string | undefined => {
    if (!val) return undefined
    const code = val.charCodeAt(0) - 65
    const rest = val.slice(1).replaceAll('$', slug)
    return code >= 0 && code < prefixes.length ? `${prefixes[code]}${rest}` : val
  }
  return {
    schemaVersion: 2,
    generatedFrom,
    topics: rawTopics.map(([id, title, order, subtopics]) => ({
      id,
      title,
      order,
      subtopics: subtopics.map(([sid, stitle, sorder, problems]) => ({
        id: sid,
        title: stitle,
        order: sorder,
        problems: problems.map(([pid, ptitle, porder, lvl, kind, rawLinks, lcm, lcl, cov, res]) => {
          const links: Problem['links'] = {}
          rawLinks.forEach((entry, idx) => {
            const url = unpackUrl(entry, pid)
            if (url) links[LINK_KEYS[idx]] = url
          })
          const lcMatch = LCM[lcm]
          const lcLabel: string | undefined =
            lcl === 0 ? ptitle : lcl === 1 ? 'Theory · no exact LeetCode twin' : typeof lcl === 'string' && lcl ? lcl : undefined
          const resources: Resource[] = res.map(([rt, rs, ru, rl, rr, rv, rm]) => ({
            type: RES_TYPES[rt],
            source: RES_SOURCES[rs],
            url: unpackUrl(ru, pid) ?? '',
            label: labels[rl] ?? '',
            rank: rr,
            verified: rv === 0 ? '2026-11-03' : String(rv),
            ...(RES_MATCHES[rm] ? { match: RES_MATCHES[rm] } : {}),
          }))
          return {
            id: pid,
            title: ptitle,
            order: porder,
            level: LEVELS[lvl],
            kind: kind === 1 ? 'theory' : 'problem',
            links,
            ...(lcMatch ? { lcMatch } : {}),
            ...(lcLabel ? { lcLabel } : {}),
            ...(typeof cov === 'string' && cov ? { coveredBy: cov } : {}),
            resources,
          }
        }),
      })),
    })),
  }
}

export const catalogue: Catalogue = unpackCatalogue(packedCatalogue)

export const catalogueProblems = catalogue.topics.flatMap((topic) =>
  topic.subtopics.flatMap((subtopic) => subtopic.problems),
)

export function summarizeCatalogue(data: Catalogue = catalogue) {
  const allProblems = data.topics.flatMap((topic) =>
    topic.subtopics.flatMap((subtopic) => subtopic.problems),
  )

  return {
    topicCount: data.topics.length,
    problemCount: allProblems.length,
    levels: allProblems.reduce<Record<string, number>>((counts, problem) => {
      const level = problem.level ?? 'ungraded'
      counts[level] = (counts[level] ?? 0) + 1
      return counts
    }, {}),
  }
}
