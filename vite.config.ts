import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { writeServiceWorker } from './tools/build-sw.mjs'

const VIRTUAL_CATALOGUE = 'virtual:dsa-catalogue'
const RESOLVED_CATALOGUE = `\0${VIRTUAL_CATALOGUE}`
const VIRTUAL_CONTENT = 'virtual:dsa-content'
const RESOLVED_CONTENT = `\0${VIRTUAL_CONTENT}`

const URL_PREFIXES = [
  'https://takeuforward.org/plus/dsa/problems/',
  'https://takeuforward.org/practice/dsa/',
  'https://takeuforward.org/blogs/data-structure-and-algorithm/',
  'https://takeuforward.org/data-structure/',
  'https://leetcode.com/problems/',
  'https://www.geeksforgeeks.org/dsa/',
  'https://www.geeksforgeeks.org/',
  'https://neetcode.io/problems/',
  'https://neetcode.io/practice#',
  'https://usaco.guide/',
  'https://www.programiz.com/dsa#',
  'https://cp-algorithms.com/',
  'https://youtu.be/',
  'https://www.youtube.com/watch?v=',
  'https://',
]
const LEVELS = [null, 'basic', 'core', 'pro']
const LCM = ['', 'exact', 'near', 'theory']
const RES_TYPES = ['practice', 'article', 'video', 'reference', 'docs']
const RES_SOURCES = [
  'leetcode', 'neetcode', 'takeuforward', 'geeksforgeeks', 'programiz',
  'cp-algorithms', 'usaco', 'cppreference', 'python-docs', 'mdn',
  'roadmap-sh', 'youtube',
]
const RES_MATCHES = ['', 'exact', 'near', 'chapter']

function packUrl(url: string | undefined, slug = ''): string | 0 {
  if (!url) return 0
  for (let i = 0; i < URL_PREFIXES.length; i += 1) {
    if (url.startsWith(URL_PREFIXES[i])) {
      let rest = url.slice(URL_PREFIXES[i].length)
      if (slug && rest.includes(slug)) rest = rest.replaceAll(slug, '$')
      return `${String.fromCharCode(65 + i)}${rest}`
    }
  }
  return url
}

/**
 * Lossless build-time table-packing of the four derived catalogue shards.
 * `data/problems.json` and `data/catalogue/*.json` stay untouched on disk;
 * `src/catalogue.ts` unpacks the exact runtime `Catalogue` shape (proven
 * deep-equal in `src/catalogue.test.ts`).
 */
async function buildPackedCatalogue() {
  const parts = await Promise.all(
    ['a', 'b', 'c', 'd'].map(async (part) =>
      JSON.parse(await readFile(path.resolve(`data/catalogue/catalogue-${part}.json`), 'utf8')),
    ),
  )
  const labels: string[] = []
  const labelIndex = (label: string) => {
    let idx = labels.indexOf(label)
    if (idx < 0) {
      idx = labels.length
      labels.push(label)
    }
    return idx
  }
  const topics = parts.flatMap((part) => part.topics)
  const packedTopics = topics.map((t: Record<string, unknown>) => [
    t.id,
    t.title,
    t.order,
    (t.subtopics as Record<string, unknown>[]).map((s) => [
      s.id,
      s.title,
      s.order,
      (s.problems as Record<string, unknown>[]).map((p) => {
        const pid = String(p.id)
        const links = (p.links ?? {}) as Record<string, string | undefined>
        const resources = ((p.resources ?? []) as Record<string, unknown>[]).map((r) => [
          RES_TYPES.indexOf(String(r.type)),
          RES_SOURCES.indexOf(String(r.source)),
          packUrl(String(r.url), pid),
          labelIndex(String(r.label)),
          r.rank,
          r.verified === '2026-11-03' ? 0 : r.verified,
          r.match ? RES_MATCHES.indexOf(String(r.match)) : 0,
        ])
        return [
          pid,
          p.title,
          p.order,
          LEVELS.indexOf((p.level as string | null) ?? null),
          p.kind === 'theory' ? 1 : 0,
          [
            packUrl(links.practice, pid),
            packUrl(links.article, pid),
            packUrl(links.video, pid),
            packUrl(links.leetcode, pid),
          ],
          p.lcMatch ? LCM.indexOf(String(p.lcMatch)) : 0,
          p.lcLabel === p.title ? 0 : p.lcLabel === 'Theory · no exact LeetCode twin' ? 1 : (p.lcLabel ?? ''),
          p.coveredBy ?? 0,
          resources,
        ]
      }),
    ]),
  ])
  return [parts[0].generatedFrom, URL_PREFIXES, labels, packedTopics]
}

async function readJsonDir(relDir: string): Promise<Record<string, unknown>> {
  const abs = path.resolve(relDir)
  const names = (await readdir(abs)).filter((name) => name.endsWith('.json')).sort()
  const entries = await Promise.all(
    names.map(async (name) => [
      name.replace(/\.json$/, ''),
      JSON.parse(await readFile(path.join(abs, name), 'utf8')),
    ] as const),
  )
  return Object.fromEntries(entries)
}

async function buildContentBundle() {
  const [topics, problems, theory, practice, coverageText, media] = await Promise.all([
    readJsonDir('data/content/topics'),
    readJsonDir('data/content/problems'),
    readJsonDir('data/content/theory'),
    readJsonDir('data/practice-sets'),
    readFile(path.resolve('data/content/coverage.json'), 'utf8'),
    // Phase v2-06: build-time oEmbed metadata (`tools/fetch-media.mjs`). An
    // empty folder is fine — the theatre then shows the plain player.
    readJsonDir('data/media').catch(() => ({})),
  ])
  const packedTheory = Object.values(theory).map((raw) => {
    const m = raw as Record<string, unknown>
    const opts = (m.options as Record<string, string>[]).map((o) => [o.text, o.explain])
    const rev = m.reveal as { solution: string; reference: Record<string, string> }
    const ref = rev.reference
    return [
      m.problemId,
      m.topicId,
      m.id,
      m.prompt,
      m.codeSnippet ?? 0,
      opts,
      m.answerIndex,
      rev.solution,
      RES_SOURCES.indexOf(ref.source),
      packUrl(ref.url),
      ref.label,
      ref.verified === '2026-11-03' ? 0 : ref.verified,
      m.verified === '2026-11-03' ? 0 : m.verified,
    ]
  })
  const packedPractice = Object.values(practice).map((raw) => {
    const s = raw as Record<string, unknown>
    const probs = (s.problems as Record<string, unknown>[]).map((d) => [
      d.lc,
      d.slug,
      d.title,
      LEVELS.indexOf(d.level as string),
      d.set,
      d.estMinutes,
      d.why,
      d.classic ? 1 : 0,
    ])
    return [
      s.patternId,
      s.topicId,
      s.title,
      s.summary,
      s.prerequisites,
      s.verified === '2026-11-03' ? 0 : s.verified,
      probs,
    ]
  })
  const packedMedia = Object.values(media).map((raw) => {
    const m = raw as Record<string, unknown>
    const thumb = m.thumbnail as Record<string, unknown> | null
    return [
      m.videoId,
      m.title ?? '',
      m.author ?? '',
      thumb ? [thumb.url, thumb.width, thumb.height] : 0,
      m.fetched ?? '',
      m.dead === true ? 1 : 0,
      m.unknown === true ? 1 : 0,
    ]
  })
  // The runtime uses exactly three numbers from the coverage report; the full
  // report (byTopic, source lists, counts) is generated, checked in and
  // published by CI. Packing only what a screen renders keeps ~1.3 kB gzip of
  // per-topic JSON out of the precached shell.
  const coverage = JSON.parse(coverageText)
  const slimCoverage = [
    coverage.asOf ?? '',
    coverage.resources?.leetcodeExactOrNear ?? 0,
    coverage.practice?.drills ?? 0,
    coverage.content?.quizItems ?? 0,
  ]
  return [URL_PREFIXES, topics, problems, packedTheory, packedPractice, slimCoverage, packedMedia]
}

export default defineConfig({
  plugins: [
    {
      name: 'dsa-archive-compact-catalogue',
      resolveId(id) {
        if (id === VIRTUAL_CATALOGUE) return RESOLVED_CATALOGUE
        if (id === VIRTUAL_CONTENT) return RESOLVED_CONTENT
        return null
      },
      async load(id) {
        if (id === RESOLVED_CATALOGUE) {
          const packed = await buildPackedCatalogue()
          return `export default ${JSON.stringify(packed)};`
        }
        if (id === RESOLVED_CONTENT) {
          const content = await buildContentBundle()
          return `export default ${JSON.stringify(content)};`
        }
        return null
      },
    },
    react(),
    {
      name: 'dsa-archive-pwa-sw',
      apply: 'build',
      async closeBundle() {
        await writeServiceWorker()
      },
    },
  ],
  server: { allowedHosts: ['.e2b.app'] },
  preview: { allowedHosts: ['.e2b.app'] },
  build: {
    // Modern-evergreen baseline (React 19 + PWA already require it): keeps
    // the modulepreload polyfill and down-level helpers out of the shell.
    target: 'esnext',
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase-auth', test: /node_modules[\\/]@firebase[\\/](?:app|component|logger|util|webchannel-wrapper|auth)[\\/]/ },
            { name: 'firebase-firestore', test: /node_modules[\\/](?:@firebase[\\/]firestore|firebase[\\/])/ },
            { name: 'react-vendor', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/ },
            { name: 'catalogue', test: /virtual:dsa-(?:catalogue|content)/ },
            // Phase v2-06: the theatre screens (problem page, stage, stamps,
            // player controller) ride in the lazy `content-ui` route chunk,
            // because `StatementCard` + `CodePanel` + `TheoryMcqCard` are only
            // ever needed by the same `#/problem/<id>` route. Two chunks would
            // duplicate that UI and cost ~1.4 kB gzip more than one.
            { name: 'content-ui', test: /src[\\/](?:content[\\/]|quiz[\\/]|theatre[\\/]|backup\.ts|app[\\/](?:practiceScreen)\.tsx|topics[\\/]topicPage\.tsx)/ },
            { name: 'content-ui', test: /src[\\/](?:content[\\/]|quiz[\\/]|backup\.ts|app[\\/](?:problemScreen|practiceScreen)\.tsx|topics[\\/]topicPage\.tsx)/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
