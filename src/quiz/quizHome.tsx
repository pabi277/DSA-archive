import { buildPath, openHref } from '../app/router'
import { catalogue } from '../catalogue'
import { getTheoryMcqCount, getTopicQuizCount } from '../content/load'
import { Button, Card, Tag } from '../design/primitives'
import { pickWeakestQuizTopic, QUIZ_TARGET_COUNT } from './engine'
import type { QuizDataState } from './results'

export function QuizHome({ quiz }: { quiz: QuizDataState }) {
  const weakestTopicId = pickWeakestQuizTopic(catalogue.topics, getTopicQuizCount, quiz.results)
  const weakestTopic = weakestTopicId
    ? catalogue.topics.find((topic) => topic.id === weakestTopicId) ?? null
    : null
  const passedCount = catalogue.topics.filter((topic) => quiz.results[topic.id]?.passed).length
  const availableCount = catalogue.topics.filter((topic) => getTopicQuizCount(topic.id) > 0).length

  const startWeakest = () => {
    if (!weakestTopic) return
    const priorAttempts = quiz.results[weakestTopic.id]?.attempts ?? 0
    openHref(
      buildPath(
        'quiz',
        weakestTopic.id,
        priorAttempts > 0 ? { seed: String(priorAttempts) } : {},
      ),
    )
  }

  return (
    <div className="quiz-home-screen" data-testid="quiz-view">
      <Card
        title="4-minute topic check"
        action={
          <Button
            variant="primary"
            disabled={!weakestTopic}
            data-testid="quiz-start-primary"
            onClick={startWeakest}
          >
            Start a 4-minute check
          </Button>
        }
      >
        <p className="quiet-note num">
          {passedCount}/{availableCount} available topic bank{availableCount === 1 ? '' : 's'} passed ·{' '}
          {catalogue.topics.length} topics in curriculum.
          {weakestTopic ? ` Suggested next: ${weakestTopic.title}.` : ''}
        </p>
      </Card>

      <div className="quiz-topic-grid" role="list" aria-label="Topic quizzes">
        {catalogue.topics.map((topic, index) => {
          const itemCount = getTopicQuizCount(topic.id)
          const theoryCount = getTheoryMcqCount(topic.id)
          const result = quiz.results[topic.id]
          const ready = itemCount > 0
          const incomplete = itemCount > 0 && itemCount < QUIZ_TARGET_COUNT
          const retakeSeed = result?.attempts ?? 0

          return (
            <div key={topic.id} role="listitem" data-testid={`quiz-home-topic-${topic.id}`}>
              <Card className="quiz-topic-card">
                <div className="quiz-topic-top">
                  <span className="topic-tile-rank num">{String(index + 1).padStart(2, '0')}</span>
                  <div className="quiz-topic-badges">
                    {!ready ? (
                      <Tag tone="neutral">Coming soon</Tag>
                    ) : result?.passed ? (
                      <Tag tone="success">{`Quiz ✓ ${result.bestScore}/${result.bestTotal}`}</Tag>
                    ) : result ? (
                      <Tag tone="caution">{`Best ${result.bestScore}/${result.bestTotal}`}</Tag>
                    ) : (
                      <Tag tone="neutral">Not taken</Tag>
                    )}
                    {incomplete ? <Tag tone="caution">bank incomplete</Tag> : null}
                  </div>
                </div>

                <h2 className="quiz-topic-title">{topic.title}</h2>

                <p className="quiet-note num">
                  {ready ? (
                    <>
                      {itemCount} question{itemCount === 1 ? '' : 's'} · pass ≥80%
                      {result
                        ? ` · ${result.attempts} attempt${result.attempts === 1 ? '' : 's'} (last ${result.lastScore}/${result.bestTotal})`
                        : ''}
                    </>
                  ) : (
                    <>
                      12-item bank in authoring
                      {theoryCount > 0
                        ? ` · ${theoryCount} theory check${theoryCount === 1 ? '' : 's'} ready in Practice`
                        : ''}
                    </>
                  )}
                </p>

                <div className="inline-actions">
                  {ready ? (
                    <a
                      className="btn btn-secondary btn-sm"
                      href={buildPath('quiz', topic.id, retakeSeed > 0 ? { seed: String(retakeSeed) } : {})}
                      data-testid={`quiz-topic-run-${topic.id}`}
                    >
                      {result ? 'Retake quiz' : 'Start quiz'}
                    </a>
                  ) : (
                    <a
                      className="btn btn-ghost btn-sm"
                      href={buildPath('topic', topic.id, { tab: theoryCount > 0 ? 'practice' : 'learn' })}
                      data-testid={`quiz-topic-study-${topic.id}`}
                    >
                      {theoryCount > 0 ? 'Open theory checks' : 'Open topic'}
                    </a>
                  )}
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
