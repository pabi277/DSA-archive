/** Collapsed hint + common-mistake disclosure. Open state is local only. */
import { useState } from 'react'
import { Empty } from '../design/primitives'
import { getHint } from './load'
import { useStatements } from './useStatements'
import { RichText } from './richText'

export function HintDisclosure({ problemId }: { problemId: string }) {
  useStatements() // re-render when the lazy statements chunk lands
  const hint = getHint(problemId)
  const [hintOpen, setHintOpen] = useState(false)
  const [mistakeOpen, setMistakeOpen] = useState(false)

  if (!hint) {
    return (
      <Empty
        title="Hint is being prepared"
        mark="?"
        testId="hint-missing"
      >
        No hint or common mistake has been authored for this row yet. The problem and its ranked sources still work.
      </Empty>
    )
  }

  return (
    <section className="hint-section" aria-label="Hint and common mistake" data-testid="hint-disclosure">
      <details
        className="hint-details"
        open={hintOpen}
        onToggle={(event) => setHintOpen(event.currentTarget.open)}
        data-testid="hint-details"
      >
        <summary className="hint-summary">▸ Hint · local, never tracked</summary>
        <div className="hint-body">
          <RichText text={hint.hint} />
        </div>
      </details>
      <details
        className="hint-details"
        open={mistakeOpen}
        onToggle={(event) => setMistakeOpen(event.currentTarget.open)}
        data-testid="common-mistake-details"
      >
        <summary className="hint-summary">▸ Common mistake</summary>
        <div className="hint-body">
          <RichText text={hint.mistake} />
        </div>
      </details>
    </section>
  )
}
