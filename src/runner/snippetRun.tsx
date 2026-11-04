/**
 * Phase v2-07 — "predict the output, then prove it".
 *
 * The single best use of a local compiler for a beginner: a theory card shows a
 * snippet and asks what it prints. The learner commits to an answer first (the
 * MCQ's own options), and only then does this affordance appear — pressing Run
 * shows what the code really does, on their device, without leaving the page.
 *
 * The panel itself is a lazy chunk, so a learner who never asks for it never
 * downloads the runner.
 */
import { Suspense, lazy, useState } from 'react'
import { Button } from '../design/primitives'

const RunPanel = lazy(() => import('./runPanel'))

export function SnippetRun({ code, problemId }: { code: string; problemId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="snippet-run" data-testid={`snippet-run-wrap-${problemId}`}>
      <Button
        size="sm"
        variant="ghost"
        aria-expanded={open}
        data-testid={`snippet-run-${problemId}`}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide the runner' : 'Run this snippet to check ▸'}
      </Button>
      {open ? (
        <Suspense fallback={null}>
          <RunPanel code={code} language="cpp" cases={[]} problemId={problemId} compact />
        </Suspense>
      ) : null}
    </div>
  )
}

export default SnippetRun
