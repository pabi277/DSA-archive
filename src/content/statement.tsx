/**
 * The four fixed statement blocks. Missing authored content never blocks the
 * page: it renders a designed state and still shows the ranked outbound links.
 */
import type { Problem } from '../catalogue'
import { Empty, Tag } from '../design/primitives'
import { getStatement, getTests } from './load'
import { HintDisclosure } from './hint'
import { ResourceActions } from './resourceActions'
import { RichText } from './richText'

export function StatementCard({ problem }: { problem: Problem }) {
  const statement = getStatement(problem.id)
  const tests = getTests(problem.id)

  return (
    <section className="content-statement" aria-label={`Statement for ${problem.title}`} data-testid="statement-card">
      {statement ? (
        <>
          <div className="statement-block" data-testid="statement-what">
            <h3>What's asked</h3>
            <RichText text={statement.statement} />
          </div>
          <div className="statement-block" data-testid="statement-constraints">
            <h3>Constraints</h3>
            <ul>
              {statement.constraints.map((constraint, index) => (
                <li key={index}><RichText text={constraint} /></li>
              ))}
            </ul>
          </div>
          <div className="statement-block" data-testid="statement-example">
            <h3>Example</h3>
            <pre className="code-block" tabIndex={0} aria-label="code sample" data-testid="statement-example-input"><code>in  {statement.example.input}</code></pre>
            <pre className="code-block" tabIndex={0} aria-label="code sample" data-testid="statement-example-output"><code>out {statement.example.output}</code></pre>
            <p className="quiet-note"><strong>Why:</strong> <span>{statement.example.why}</span></p>
          </div>
          <div className="statement-block" data-testid="statement-tests">
            <Tag tone="info">{tests.length} local test cases</Tag>
            <span className="quiet-note">Bundled for the Phase 07 runner; no code executes here.</span>
          </div>
        </>
      ) : (
        <Empty
          title="Statement is being prepared"
          mark="?"
          testId="statement-missing"
        >
          This row has no authored statement, constraints, example or hint yet. Its ranked sources are ready below, and the rest of the sheet is unchanged.
        </Empty>
      )}
      <HintDisclosure problemId={problem.id} />
      <div className="statement-block" data-testid="statement-further">
        <h3>Further reading</h3>
        <p className="quiet-note">One top-ranked action, publisher names, and all remaining sources in one list.</p>
        <ResourceActions problem={problem} />
      </div>
    </section>
  )
}
