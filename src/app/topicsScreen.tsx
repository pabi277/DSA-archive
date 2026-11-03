/**
 * `#/topics` — all 20 topics, always visible (phase v2-01 ships the grid with
 * real progress rings; phase 02 adds the Learn · Practice · Quiz body).
 *
 * Beginner rule: nothing is hidden behind "show more". Every topic shows its
 * name, its ring, its `done/total`, and one sentence about what it covers, so a
 * first-year student can pick a starting point without guessing.
 */
import { catalogue } from '../catalogue'
import { tallyTopic, type ProgressByTopic } from '../progress'
import { buildPath } from './router'
import { Empty, Ring, Tag } from '../design/primitives'
import { IconArrowRight, IconSpark } from '../design/icons'

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

export function TopicsScreen({ progress }: { progress: ProgressByTopic }) {
  const total = catalogue.topics.reduce((sum, topic) => sum + tallyTopic(progress, topic).total, 0)
  const done = catalogue.topics.reduce((sum, topic) => sum + tallyTopic(progress, topic).done, 0)

  if (catalogue.topics.length === 0) {
    return <Empty title="No topics in the catalogue">The bundled catalogue is empty.</Empty>
  }

  return (
    <div className="topics-screen">
      <p className="screen-lede">
        {catalogue.topics.length} topics, {total} rows, <span className="num">{done}</span> done. Start
        anywhere — the order below is the one this archive recommends, not a lock.
      </p>
      <ul className="topic-grid">
        {catalogue.topics.map((topic, index) => {
          const tally = tallyTopic(progress, topic)
          const complete = tally.total > 0 && tally.done === tally.total
          return (
            <li key={topic.id}>
              <a className="topic-tile" href={buildPath('topic', topic.id)} data-testid={`topic-tile-${topic.id}`}>
                <span className="topic-tile-rank num">{String(index + 1).padStart(2, '0')}</span>
                <span className="topic-tile-body">
                  <span className="topic-tile-title">
                    {topic.title}
                    {complete ? (
                      <Tag tone="success" className="topic-tile-tag">
                        Complete
                      </Tag>
                    ) : null}
                  </span>
                  <span className="topic-tile-blurb">{BLURB[topic.id] ?? 'Read, practise, then check.'}</span>
                  <span className="topic-tile-meta num">
                    {tally.done}/{tally.total} done · {tally.total - tally.done} left
                  </span>
                </span>
                <span className="topic-tile-ring">
                  <Ring value={tally.done} total={tally.total} size={44} thickness={4} />
                </span>
                <span className="topic-tile-arrow" aria-hidden="true">
                  <IconArrowRight size={16} />
                </span>
              </a>
            </li>
          )
        })}
      </ul>
      <p className="screen-foot-note">
        <IconSpark size={14} /> Rings count solved rows only. Sessions, quizzes and drills arrive in
        later v2 phases; nothing here pretends to be finished before it is.
      </p>
    </div>
  )
}
