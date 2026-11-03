/**
 * Phase v2-03 outbound-link integrity.
 *
 * The default CI check is deterministic: it validates every ranked resource,
 * canonical drill URL and theory reference against the approved source registry,
 * reports stale verified dates per publisher, and confirms the original video
 * links are preserved without multi-sourcing. Set CHECK_EXTERNAL_LINKS=1 for
 * an optional live HTTP audit; set LIVE_LINK_STRICT=1 to fail on 404/410.
 *
 * No tracker, proxy, oEmbed call or third-party script is involved. YouTube
 * links stay single-source by owner decision and are never re-hosted or fetched.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const AS_OF = process.env.CONTENT_AS_OF || '2026-11-03'
const LIVE = process.env.CHECK_EXTERNAL_LINKS === '1'
const STRICT = process.env.LIVE_LINK_STRICT === '1'
const CONCURRENCY = Number(process.env.LINK_CHECK_CONCURRENCY || 24)
const TIMEOUT_MS = Number(process.env.LINK_CHECK_TIMEOUT_MS || 4000)
const MAX_LIVE_CHECKS = Number(process.env.LINK_CHECK_MAX || 1500)

const EXPECTED_HOSTS = {
  leetcode: new Set(['leetcode.com']),
  neetcode: new Set(['neetcode.io']),
  takeuforward: new Set(['takeuforward.org', 'www.takeuforward.org']),
  geeksforgeeks: new Set(['www.geeksforgeeks.org']),
  programiz: new Set(['www.programiz.com']),
  'cp-algorithms': new Set(['cp-algorithms.com']),
  usaco: new Set(['usaco.guide']),
  cppreference: new Set(['en.cppreference.com']),
  'python-docs': new Set(['docs.python.org']),
  mdn: new Set(['developer.mozilla.org']),
  'roadmap-sh': new Set(['roadmap.sh']),
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

function addDays(day, count) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

function isStale(day) {
  return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && addDays(day, 180) < AS_OF
}

function canonical(url) {
  const parsed = new URL(url)
  parsed.hash = ''
  return parsed.toString()
}

const targets = []
function addTarget(source, url, label, verified, slug = null) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') throw new Error(`${label}: external links must use HTTPS (${url})`)
  const allowed = EXPECTED_HOSTS[source]
  if (!allowed || !allowed.has(parsed.hostname)) throw new Error(`${label}: ${url} is not an approved ${source} URL`)
  targets.push({ source, url, canonical: canonical(url), label, verified, slug, stale: isStale(verified) })
}

const catalogue = await readJson(path.join(root, 'data/problems.json'))
let videoLinks = 0
for (const topic of catalogue.topics) {
  for (const subtopic of topic.subtopics) {
    for (const problem of subtopic.problems) {
      for (const resource of problem.resources ?? []) {
        addTarget(resource.source, resource.url, `${problem.id} · ${resource.label}`, resource.verified)
      }
      if (problem.links.video) {
        const parsed = new URL(problem.links.video)
        if (!['youtu.be', 'www.youtube.com'].includes(parsed.hostname)) {
          throw new Error(`${problem.id}: video link changed to ${parsed.hostname}`)
        }
        videoLinks += 1
      }
    }
  }
}

const practiceDir = path.join(root, 'data/practice-sets')
for (const name of (await readdir(practiceDir)).filter((item) => item.endsWith('.json')).sort()) {
  const set = await readJson(path.join(practiceDir, name))
  for (const problem of set.problems) {
    addTarget('leetcode', `https://leetcode.com/problems/${problem.slug}/`, `${set.patternId} · ${problem.title}`, set.verified, problem.slug)
  }
}

const theoryDir = path.join(root, 'data/content/theory')
for (const name of (await readdir(theoryDir)).filter((item) => item.endsWith('.json')).sort()) {
  const mcq = await readJson(path.join(theoryDir, name))
  const reference = mcq.reveal.reference
  addTarget(reference.source, reference.url, `${mcq.problemId} · theory reference`, reference.verified)
}

// One live request per unique URL. Fragments are browser-only navigation hints.
const unique = new Map()
for (const target of targets) {
  const existing = unique.get(target.canonical)
  if (existing) {
    existing.sources.add(target.source)
    if (target.slug) existing.slug = target.slug
  } else {
    unique.set(target.canonical, { ...target, sources: new Set([target.source]) })
  }
}
const liveTargets = [...unique.values()].sort((a, b) => a.canonical.localeCompare(b.canonical))
const bySource = new Map()
for (const target of targets) {
  for (const source of target.sources ?? [target.source]) {
    const row = bySource.get(source) ?? { checked: 0, stale: 0, dead: 0, unverifiable: 0, ok: 0 }
    row.checked += 1
    if (target.stale) row.stale += 1
    bySource.set(source, row)
  }
}
const dead = []
let liveChecked = 0
let unverifiable = 0
let liveOk = 0
if (LIVE) {
  let cursor = 0
  const queue = liveTargets.slice(0, MAX_LIVE_CHECKS)
  async function checkOne(target) {
    const signal = AbortSignal.timeout(TIMEOUT_MS)
    let response
    try {
      response = await fetch(target.canonical, {
        method: 'HEAD',
        redirect: 'follow',
        signal,
        headers: { 'user-agent': 'DSA Archive link audit' },
      })
      if ([403, 404, 405, 429, 501].includes(response.status)) {
        response = await fetch(target.canonical, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'user-agent': 'DSA Archive link audit' },
        })
      }
    } catch {
      unverifiable += 1
      for (const source of target.sources) bySource.get(source).unverifiable += 1
      return
    }
    liveChecked += 1
    if ([404, 410].includes(response.status)) {
      dead.push(`${target.label} → ${response.status} ${target.canonical}`)
      for (const source of target.sources) bySource.get(source).dead += 1
      return
    }
    if (response.status >= 400) {
      unverifiable += 1
      for (const source of target.sources) bySource.get(source).unverifiable += 1
      return
    }
    if (target.slug) {
      const finalPath = new URL(response.url || target.canonical).pathname
      if (finalPath !== `/problems/${target.slug}/`) {
        dead.push(`${target.label} → redirected to ${finalPath}`)
        for (const source of target.sources) bySource.get(source).dead += 1
        return
      }
    }
    liveOk += 1
    for (const source of target.sources) bySource.get(source).ok += 1
  }
  async function worker() {
    while (cursor < queue.length) {
      const target = queue[cursor]
      cursor += 1
      await checkOne(target)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()))
}

const stale = targets.filter((target) => target.stale).length
console.log(`Resource links: ${targets.length} references · ${liveTargets.length} unique URLs · ${videoLinks} single-source video links preserved`)
console.log(`Verified dates stale (>180 d, as of ${AS_OF}): ${stale}`)
if (LIVE) {
  console.log(`Live HTTP audit: ${liveChecked}/${liveTargets.length} unique targets · ${liveOk} reachable · ${dead.length} dead · ${unverifiable} unverifiable`)
  if (dead.length > 0) console.log(`Dead links (first 10):\n${dead.slice(0, 10).map((item) => `  - ${item}`).join('\n')}`)
} else {
  console.log('Live HTTP audit: skipped (set CHECK_EXTERNAL_LINKS=1; the scheduled link-audit workflow enables it)')
}
console.log('By source (references / stale / dead / unverifiable):')
for (const [source, row] of [...bySource].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${source.padEnd(16)} ${String(row.checked).padStart(4)} / ${row.stale} / ${row.dead} / ${row.unverifiable}`)
}

if (stale > 0 && STRICT) {
  console.error('Stale verified dates found in strict mode')
  process.exit(1)
}
if (dead.length > 0 && STRICT) {
  console.error('Dead external links found in strict mode')
  process.exit(1)
}
