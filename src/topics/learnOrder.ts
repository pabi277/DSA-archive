import type { Problem, Subtopic, Topic } from '../catalogue'

const levelRank: Record<NonNullable<Problem['level']> | 'ungraded', number> = {
  basic: 0,
  core: 1,
  pro: 2,
  ungraded: 3,
}

/** Curated learnOrder wins when present; otherwise use the catalogue's stable order. */
function authoredOrder(value: { order: number; learnOrder?: number }) {
  return value.learnOrder ?? value.order
}

/**
 * Flatten a topic in study order: subtopic order, then an optional curated row
 * order, then a gentle Basic → Core → Pro ramp with source order as the tie-break.
 */
export function problemsInLearningOrder(topic: Topic): { subtopic: Subtopic; problem: Problem }[] {
  return [...topic.subtopics]
    .sort((a, b) => authoredOrder(a) - authoredOrder(b) || a.order - b.order)
    .flatMap((subtopic) =>
      [...subtopic.problems]
        .sort((a, b) => {
          const aCurated = a.learnOrder
          const bCurated = b.learnOrder
          if (aCurated !== undefined || bCurated !== undefined) {
            if (aCurated === undefined) return 1
            if (bCurated === undefined) return -1
            if (aCurated !== bCurated) return aCurated - bCurated
          }
          return levelRank[a.level ?? 'ungraded'] - levelRank[b.level ?? 'ungraded'] || a.order - b.order
        })
        .map((problem) => ({ subtopic, problem })),
    )
}

export function learningOrderedSubtopics(topic: Topic): Subtopic[] {
  const ordered = problemsInLearningOrder(topic)
  return [...topic.subtopics]
    .sort((a, b) => authoredOrder(a) - authoredOrder(b) || a.order - b.order)
    .map((subtopic) => ({
      ...subtopic,
      problems: ordered.filter((row) => row.subtopic.id === subtopic.id).map((row) => row.problem),
    }))
}
