/**
 * Phase v2-08 — "How this plan was made".
 *
 * A native `<details>` on Today that shows the *exact* inputs the planner used
 * and the four rules it applied, in words a first-year student can check
 * against the list beside it. Nothing here is generated: every value is the same
 * number the screen above is already showing, and the last line says what would
 * change the answer.
 */
export function HowPlanWasMade({
  goal,
  due,
  weakest,
  targetDate,
  targetList,
  nextGoal,
}: {
  goal: number
  due: number
  weakest: string | null
  targetDate: string | null
  targetList: string | null
  nextGoal: number
}) {
  return (
    <details className="how-plan" data-testid="how-plan">
      <summary>How this plan was made</summary>
      <ol className="how-plan-rules">
        <li>{due} row{due === 1 ? '' : 's'} due for revision come first, most overdue first.</li>
        <li>Then the rows already on today’s plan — nothing is added behind your back.</li>
        <li>
          Then new picks from {weakest ? <strong>{weakest}</strong> : 'the top of the sheet'}, the topic with the
          lowest completion.
        </li>
        <li>
          {targetList
            ? `Inside 14 days of ${targetDate ?? 'your date'}, rows from “${targetList}” jump the queue.`
            : 'No target list, so nothing jumps the queue.'}
        </li>
      </ol>
      <p className="quiet-note num">
        Inputs: goal {goal}/day · {due} due · weakest {weakest ?? 'none yet'} ·{' '}
        {targetDate ? `target ${targetDate}` : 'no target date'}
      </p>
      <p className="quiet-note">
        What would change it: goal {nextGoal} · {targetDate ? 'another target date' : 'a target date'}.
      </p>
    </details>
  )
}
