/** Publisher-aware helpers for the ranked Phase v2-03 `resources[]` array. */
import type { Problem, Resource, ResourceSource, ResourceType } from '../catalogue'

export const SOURCE_LABELS: Record<ResourceSource, string> = {
  leetcode: 'LeetCode',
  neetcode: 'NeetCode',
  takeuforward: 'takeUforward',
  geeksforgeeks: 'GeeksforGeeks',
  programiz: 'Programiz',
  'cp-algorithms': 'CP-Algorithms',
  usaco: 'USACO Guide',
  cppreference: 'cppreference',
  'python-docs': 'Python docs',
  mdn: 'MDN',
  'roadmap-sh': 'roadmap.sh',
  youtube: 'YouTube',
}

export const TYPE_LABELS: Record<ResourceType, string> = {
  practice: 'Practice',
  article: 'Read',
  video: 'Watch',
  reference: 'Reference',
  docs: 'Docs',
}

const RESOURCE_TYPES = new Set<ResourceType>(['practice', 'article', 'video', 'reference', 'docs'])
const RESOURCE_SOURCES = new Set<string>(Object.keys(SOURCE_LABELS))

export function publisherName(source: ResourceSource): string {
  return SOURCE_LABELS[source] ?? source
}

function isResource(value: unknown): value is Resource {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.type === 'string' && RESOURCE_TYPES.has(item.type as ResourceType) &&
    typeof item.source === 'string' && RESOURCE_SOURCES.has(item.source) &&
    typeof item.url === 'string' && item.url.startsWith('https://') &&
    typeof item.label === 'string' && item.label.length > 0 && item.label.length <= 60 &&
    typeof item.rank === 'number' && Number.isInteger(item.rank) && item.rank >= 1 &&
    typeof item.verified === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.verified)
  )
}

export function rankedResources(problem: Problem): Resource[] {
  const resources = Array.isArray(problem.resources)
    ? problem.resources.filter(isResource).slice()
    : []
  if (resources.length === 0) {
    const fallback: Resource[] = []
    const order = ['practice', 'article', 'video', 'leetcode'] as const
    for (const [index, linkType] of order.entries()) {
      const url = problem.links[linkType]
      if (!url || !url.startsWith('https://')) continue
      const source: ResourceSource =
        linkType === 'leetcode' ? 'leetcode' : linkType === 'video' ? 'youtube' : 'takeuforward'
      const type: ResourceType = linkType === 'article' ? 'article' : linkType === 'video' ? 'video' : 'practice'
      fallback.push({
        type,
        source,
        url,
        label: `${publisherName(source)} ${TYPE_LABELS[type].toLowerCase()}`,
        rank: index + 1,
        verified: '2026-11-03',
      })
    }
    resources.push(...fallback)
  }
  return resources.sort((a, b) => a.rank - b.rank || a.type.localeCompare(b.type))
}

export function primaryResource(problem: Problem): Resource | null {
  return rankedResources(problem)[0] ?? null
}

export function resourceFor(problem: Problem, label: 'practice' | 'read' | 'watch'): Resource | null {
  const resources = rankedResources(problem)
  if (label === 'practice') return resources.find((item) => item.type === 'practice') ?? null
  if (label === 'read') return resources.find((item) => ['article', 'reference', 'docs'].includes(item.type)) ?? null
  const fromResources = resources.find((item) => item.type === 'video')
  if (fromResources) return fromResources
  const url = problem.links.video
  if (!url || !url.startsWith('https://')) return null
  return {
    type: 'video',
    source: 'youtube',
    url,
    label: 'Single-source video · YouTube',
    rank: 100,
    verified: '2026-11-03',
  }
}

export function allSources(problem: Problem): Resource[] {
  const resources = rankedResources(problem)
  const watch = resourceFor(problem, 'watch')
  const seen = new Set(resources.map((item) => item.url))
  if (watch && !seen.has(watch.url)) resources.push(watch)
  return resources.sort((a, b) => a.rank - b.rank || a.type.localeCompare(b.type))
}

export function resourceActionLabel(resource: Resource): string {
  const glyph = resource.type === 'video' ? '▶' : resource.type === 'practice' ? '↗' : '📖'
  return `${glyph} ${TYPE_LABELS[resource.type]} · ${publisherName(resource.source)}`
}
