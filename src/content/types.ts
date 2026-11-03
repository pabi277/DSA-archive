/** Phase v2-03 learner-content schema. Mirrors the JSON in `data/content/`. */
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
export type PrimerSection = { title: string; text: string }
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
