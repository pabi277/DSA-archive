import { catalogue } from '../catalogue'
import type { CloudProgressByTopic } from '../cloudProgress'
import { tallyTopic, type Outcome, type ProgressByTopic } from '../progress'
import { levelOf, type LevelFilter } from '../sheet'
import { revisionQueue } from '../planner'
import { buildPath } from './router'
import { Empty, Ring, Tag } from '../design/primitives'
import { IconArrowRight } from '../design/icons'

const BLURB: Record<string, string> = {
  'beginner-problems': 'Warm-ups: patterns, loops, arrays and strings you will reuse everywhere.',
  sorting: 'Order a list, then reuse the same code to answer harder questions.',
  arrays: 'Indexing, prefix sums, two pointers and the sliding window.',
  hashing: 'Trade memory for speed with maps and sets.',
  'binary-search': 'Halve the search space — on arrays and on answers.',
  'strings-basic-and-medium': 'Characters, substrings, palindromes and building strings.',
  recursion: 'Solve a small part, trust the rest, stop somewhere.',
  'linked-list': 'Pointers between nodes, reversal and cycles.',
  'bit-manipulation': 'Work with the bits of a number directly.',
  'greedy-algorithms': 'Take the locally best step and prove it stays best.',
  'sliding-window-2-pointer': 'Move two edges of a window instead of rescanning.',
  'stack-queues': 'Last-in-first-out and first-in-first-out structures.',
  'binary-trees': 'Traversals, depth, and recursion over nodes.',
  'binary-search-trees': 'Ordered trees: search, insert and validate.',
  heaps: 'Always know the smallest or largest element.',
  graphs: 'Traverse, level by level or as deep as it goes.',
  'dynamic-programming': 'Remember answers to repeated sub-problems.',
  tries: 'Trees of characters for prefix questions.',
  'strings-advanced-algo': 'KMP, hashing and pattern matching.',
  maths: 'Number theory and modular arithmetic.',
}

function summaries(entries: CloudProgressByTopic, today: string) {
  const dueByTopic: Record<string, number> = {}
  for (const item of revisionQueue(entries, today).due) dueByTopic[item.topicId] = (dueByTopic[item.topicId] ?? 0) + 1
  return { dueByTopic }
}

export function TopicsScreen({ progress, entries, today }: {
  progress: ProgressByTopic
  entries: CloudProgressByTopic
  today: string
}) {
  const { dueByTopic } = summaries(entries, today)
  const total = catalogue.topics.reduce((sum, topic) => sum + tallyTopic(progress, topic).total, 0)
  const learned = catalogue.topics.reduce((sum, topic) => {
    const shard = progress[topic.id] ?? {}
    return sum + Object.values(shard).filter((entry) => entry.s === 'done' && (entry.o ?? 'clean') === 'clean').length
  }, 0)

  if (catalogue.topics.length === 0) return <Empty title="No topics in the catalogue">The bundled catalogue is empty.</Empty>

  return (
    <div className="topics-screen">
      <p className="screen-lede">
        {catalogue.topics.length} topics · {total} problems · <span className="num">{learned}</span> learned confidently. Choose a topic; you can change your path at any time.
      </p>
      <ul className="topic-grid">
        {catalogue.topics.map((topic, index) => {
          const tally = tallyTopic(progress, topic)
          const shard = progress[topic.id] ?? {}
          const outcomeCounts: Record<Outcome, number> = { clean: 0, hint: 0, couldnt: 0 }
          for (const entry of Object.values(shard)) if (entry.s === 'done') outcomeCounts[entry.o ?? 'clean'] += 1
          const levelCounts: Record<LevelFilter, number> = { basic: 0, core: 0, pro: 0, ungraded: 0 }
          for (const subtopic of topic.subtopics) for (const problem of subtopic.problems) levelCounts[levelOf(problem)] += 1
          const learnedHere = outcomeCounts.clean
          const complete = tally.total > 0 && tally.done === tally.total
          return (
            <li key={topic.id}>
              <a className="topic-tile" href={buildPath('topic', topic.id)} data-testid={`topic-tile-${topic.id}`}>
                <span className="topic-tile-rank num">{String(index + 1).padStart(2, '0')}</span>
                <span className="topic-tile-body">
                  <span className="topic-tile-title">
                    {topic.title}
                    {complete ? <Tag tone="success" className="topic-tile-tag">Complete</Tag> : null}
                  </span>
                  <span className="topic-tile-blurb">{BLURB[topic.id] ?? 'Read, practise, then check.'}</span>
                  <span className="topic-tile-meta num">
                    {tally.total} problems · {levelCounts.basic} Basic · {levelCounts.core} Core · {levelCounts.pro} Pro
                  </span>
                  <span className="topic-tile-meta num" data-testid={`topic-outcomes-${topic.id}`}>
                    {outcomeCounts.clean} clean · {outcomeCounts.hint} hints · {outcomeCounts.couldnt} couldn’t · {dueByTopic[topic.id] ?? 0} due
                  </span>
                  <span className="topic-patterns" aria-label="Subtopics">
                    {topic.subtopics.slice(0, 3).map((subtopic) => <Tag key={subtopic.id} tone="neutral">{subtopic.title}</Tag>)}
                    {topic.subtopics.length > 3 ? <span className="quiet-note">+{topic.subtopics.length - 3}</span> : null}
                  </span>
                  <span className="quiet-note topic-quiz-status">Quiz content is authored in Phase 03; quiz runs arrive in Phase 05.</span>
                </span>
                <span className="topic-tile-ring">
                  <Ring value={learnedHere} total={tally.total} size={44} thickness={4} label={`${topic.title}: ${learnedHere} of ${tally.total} learned confidently`} />
                </span>
                <span className="topic-tile-arrow" aria-hidden="true"><IconArrowRight size={16} /></span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
