import type { ResourceSource } from '../catalogue'

/** Phase v2-03 / v2-05 learner-content schema. Mirrors the JSON in `data/content/`. */
export type QuizKind = 'pattern' | 'dryrun' | 'complexity' | 'bug' | 'edge'

export type QuizOption = { text: string; explain: string }

export type QuizItem = {
  id: string
  kind: QuizKind
  prompt: string
  codeSnippet: string | null
  options: [QuizOption, QuizOption, QuizOption, QuizOption]
  answerIndex: 0 | 1 | 2 | 3
}

export type TheoryReference = {
  source: ResourceSource
  url: string
  label: string
  verified: string
}

export type TheoryReveal = {
  alwaysAvailable: true
  solution: string
  reference: TheoryReference
}

export type InlineCheck = {
  id: string
  prompt: string
  codeSnippet: string | null
  options: [QuizOption, QuizOption, QuizOption, QuizOption]
  answerIndex: 0 | 1 | 2 | 3
  rereadSectionId: string
  rereadSectionTitle: string
  reveal: TheoryReveal
}

export type TheoryMcq = {
  schemaVersion: 1
  problemId: string
  topicId: string
  id: string
  kind: 'theory' | QuizKind
  prompt: string
  codeSnippet: string | null
  options: [QuizOption, QuizOption, QuizOption, QuizOption]
  answerIndex: 0 | 1 | 2 | 3
  reveal: TheoryReveal
  verified: string
}

export type Example = { input: string; output: string; why: string }

export type TestCase = { input: string; expected: string; note: string }

export type Statement = {
  problemId: string
  statement: string
  constraints: string[]
  example: Example
  hint: string
  mistake: string
  tests: TestCase[]
}

export type PrimerExample = { title: string; code: string; explain: string }
export type Primer = {
  intro: string
  whenToUse: string[]
  mentalModel: string
  mistakes: string[]
  example: PrimerExample
  practice: string
}
export type PrimerSection = {
  id: string
  title: string
  text: string
  check: InlineCheck | null
}
export type TopicContent = {
  topicId: string
  patterns: string[]
  learnOrder: string[]
  primer: Primer | null
  sections: PrimerSection[]
  quiz: QuizItem[]
}

export type PracticeProblem = {
  lc: number
  slug: string
  title: string
  level: 'basic' | 'core' | 'pro'
  set: number
  estMinutes: number
  why: string
  classic: boolean
}
export type PracticeSet = {
  patternId: string
  topicId: string
  title: string
  summary: string
  prerequisites: string[]
  verified: string
  problems: PracticeProblem[]
}

export type CoverageTopic = {
  topicId: string
  title: string
  primer: boolean
  statements: number
  hints: number
  quizItems: number
  theoryMcqs: number
  drills: number
}
export type CoverageReport = {
  schemaVersion: 1
  asOf: string
  catalogue: { rows: number; topics: number; theoryRows: number }
  resources: {
    rowsWithResources: number
    multiPublisherRows: number
    multiPublisherPercent: number
    leetcodeExactOrNear: number
    theoryLabelled: number
    staleLinks: number
    sources: string[]
  }
  content: {
    primers: number
    primerWords: number
    statements: number
    hints: number
    mistakes: number
    testCases: number
    quizItems: number
    theoryMcqs: number
    fullyAuthoredTopics: string[]
  }
  practice: {
    patterns: number
    drills: number
    uniqueSlugs: number
    contiguousSets: boolean
    sets: number[]
  }
  byTopic: CoverageTopic[]
}
