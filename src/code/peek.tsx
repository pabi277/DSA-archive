/**
 * Peek (phase v2-04): your own saved solution, blurred behind one honest
 * button so it works as active recall instead of dead text.
 *
 * The blurred code is `aria-hidden` and unselectable until revealed, so a
 * screen reader cannot leak the answer either. Reveal state is local to the
 * component: it resets whenever the panel unmounts (session-only, never
 * stored), exactly as the phase contract asks.
 */
import { useState } from 'react'
import { Button } from '../design/primitives'

export function PeekCode({ code }: { code: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div data-testid="code-peek">
      <div className={revealed ? 'code-peek-body is-revealed' : 'code-peek-body'}>
        <pre className="code-preview code-view" data-testid="peek-code" aria-hidden={!revealed}>
          {code}
        </pre>
        {!revealed ? (
          <div className="code-peek-cover">
            <p className="quiet-note">Your solution is hidden. Try it from memory first.</p>
            <Button variant="primary" data-testid="peek-reveal" onClick={() => setRevealed(true)}>
              Reveal — I’ve attempted it
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
