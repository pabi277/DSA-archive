/** Fixed-section topic primer. Safe rich text; one code block; one mistakes callout. */
import { Card, Empty, Tag } from '../design/primitives'
import { getPrimer, getTopicContent } from './load'
import { RichText } from './richText'

export function PrimerView({ topicId, topicTitle }: { topicId: string; topicTitle: string }) {
  const primer = getPrimer(topicId)
  const sections = getTopicContent(topicId)?.sections ?? []
  if (!primer) {
    return (
      <Empty
        title="The primer is being prepared"
        mark="?"
        testId="topic-primer-missing"
      >
        {topicTitle} still has its learning order and practice rows. The 600–900 word primer, worked example and three mistakes will appear here after owner review.
      </Empty>
    )
  }

  return (
    <Card title={`Primer · ${topicTitle}`} className="primer-card" data-testid="topic-primer">
      <div className="primer-section" data-testid="primer-intro">
        <h3>What it is</h3>
        <RichText text={primer.intro} />
      </div>
      <div className="primer-section" data-testid="primer-when">
        <h3>When to use it</h3>
        <ul>
          {primer.whenToUse.map((item, index) => <li key={index}><RichText text={item} /></li>)}
        </ul>
      </div>
      <div className="primer-section" data-testid="primer-model">
        <h3>Mental model</h3>
        <RichText text={primer.mentalModel} />
      </div>
      <aside className="callout" aria-label="Three common mistakes" data-testid="primer-mistakes">
        <h3>Three mistakes to avoid</h3>
        <ul>
          {primer.mistakes.map((item, index) => <li key={index}><RichText text={item} /></li>)}
        </ul>
      </aside>
      <div className="primer-section" data-testid="primer-example">
        <h3>{primer.example.title}</h3>
        <pre className="code-block" tabIndex={0} aria-label="code sample"><code>{primer.example.code}</code></pre>
        <RichText text={primer.example.explain} />
      </div>
      {sections.map((section, index) => (
        <div className="primer-section" key={index} data-testid={`primer-extra-${index}`}>
          <h3>{section.title}</h3>
          <RichText text={section.text} />
        </div>
      ))}
      <div className="primer-section" data-testid="primer-practice">
        <h3>Practice next</h3>
        <RichText text={primer.practice} />
      </div>
      <div className="primer-foot">
        <Tag tone="neutral">≤900 words</Tag>
        <Tag tone="info">one worked example</Tag>
        <span className="quiet-note">Own writing · owner sample review pending</span>
      </div>
    </Card>
  )
}
