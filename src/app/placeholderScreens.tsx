/**
 * Routes that exist (so every screen has a URL, the back button works and the
 * palette can reach them) but whose body arrives in a later v2 phase. Each one
 * is a *designed* state, not "coming soon" filler: it says what will live here,
 * what you can do right now instead, and offers exactly one primary action.
 *
 * Phase contract: 01 ships the routes + the states; 02 turns `topic` into the
 * Learn · Practice · Quiz body, 04 fills `code`, 05 the quiz home and checks,
 * 03 the drills (whose source of truth is takeuforward — the video links stay
 * single-source by owner decision and are never re-hosted here).
 */
import { catalogue } from '../catalogue'
import { tallyTopic } from '../progress'
import { buildPath } from './router'
import { Button, Card, Empty, Stat } from '../design/primitives'
import { IconArrowLeft, IconCheck, IconCode, IconSpark, IconToday } from '../design/icons'

export function ProblemScreen({ problemId }: { problemId: string }) {
  const rows = catalogue.topics.flatMap((topic) =>
    topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => ({ topic, subtopic, problem }))),
  )
  const match = rows.find((row) => row.problem.id === problemId)
  if (!match) {
    return (
      <Empty
        title="That problem does not exist"
        mark="?"
        testId="problem-missing"
        action={
          <Button variant="primary" onClick={() => { window.location.hash = buildPath('topics') }}>
            Browse all topics
          </Button>
        }
      >
        <code>{problemId}</code> is not in this archive.
      </Empty>
    )
  }
  const { topic, subtopic, problem } = match
  const links = ['practice', 'article', 'video', 'leetcode'] as const
  return (
    <div className="problem-screen">
      <a className="back-link" href={buildPath('topic', topic.id)}>
        <IconArrowLeft size={14} /> {topic.title}
      </a>
      {/* The page header owns the only h1 on every route (a11y rule 1); the
          problem title is the document's second level. */}
      <h2 className="problem-screen-title">{problem.title}</h2>
      <p className="quiet-note">
        {subtopic.title} · {problem.kind === 'theory' ? 'Theory' : 'Problem'} ·{' '}
        <span className="num">{tallyTopic({}, topic).total}</span> rows in this topic
      </p>

      <div className="problem-actions">
        {problem.kind === 'theory' ? (
          <Button variant="primary" disabled>
            <IconCheck size={16} /> Check (phase 05)
          </Button>
        ) : (
          <Button variant="primary" disabled>
            <IconCode size={16} /> Solve in the runner (phase 07)
          </Button>
        )}
        <Button onClick={() => { window.location.hash = buildPath('search', '', { q: problem.title }) }}>
          Find it in the sheet
        </Button>
      </div>

      <section className="problem-links" aria-label="Sources for this row">
        <h2>Sources</h2>
        <p className="quiet-note">
          Articles and videos are ranked across publishers in phase 03. Until then the bundled
          single-source links are shown exactly as extracted — never rewritten.
        </p>
        <ul>
          {links.map((linkType) => {
            const href = problem.links[linkType]
            if (!href) return null
            return (
              <li key={linkType}>
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {linkType === 'practice' ? 'Practice' : linkType === 'article' ? 'Article' : linkType === 'video' ? 'Video' : 'LeetCode'}
                </a>
              </li>
            )
          })}
          {links.every((linkType) => !problem.links[linkType]) ? <li className="quiet-note">No outbound link for this row.</li> : null}
        </ul>
      </section>

      <Empty
        title="Statement, hint and tests arrive with the content pipeline"
        mark={<IconSpark size={20} />}
        testId="problem-content-pending"
      >
        Phase 03 writes our own statement, hint and common-mistake text per row; phase 06 adds the
        in-app video theatre and phase 07 the local runner. This page exists now so every row has a
        URL you can bookmark and share.
      </Empty>
    </div>
  )
}

export function CodeScreen({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="code-screen">
      <Empty
        title={signedIn ? 'No saved solutions yet' : 'Sign in to keep your code'}
        mark={<IconCode size={20} />}
        testId="code-view"
        action={
          signedIn ? (
            <a className="btn btn-primary" href={buildPath('topics')}>
              Pick a problem to start
            </a>
          ) : (
            <Button variant="primary" disabled>
              Sign in from the top bar
            </Button>
          )
        }
      >
        {signedIn
          ? 'The Code section stores one snippet per problem in Firestore, synced and included in your JSON backup. Phase 04 replaces the old notes store with it.'
          : 'Notes and snippets are personal data, so they need an account. The sheet and its search keep working signed out.'}
      </Empty>
      <div className="stat-row">
        <Stat value="0" label="saved solutions" detail="phase 04" />
        <Stat value="3" label="supported languages" detail="C++ · Python · JS" />
        <Stat value="1" label="backup file" detail="schema v4" />
      </div>
    </div>
  )
}

export function PracticeScreen() {
  return (
    <div className="practice-screen">
      <Empty
        title="Drills arrive with the practice sets"
        mark={<IconSpark size={20} />}
        testId="practice-view"
        action={
          <a className="btn btn-primary" href={buildPath('search')}>
            Browse the 495-row sheet
          </a>
        }
      >
        Phase 03 adds +120–140 LeetCode drills grouped by pattern in <code>data/practice-sets/</code>.
        Progress reuses the same topic shards — no new schema, no new rules.
      </Empty>
    </div>
  )
}

export function QuizHome({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="quiz-screen">
      <Empty
        title="Topic quizzes arrive in phase 05"
        mark={<IconCheck size={20} />}
        testId="quiz-view"
        action={
          <a className="btn btn-primary" href={buildPath('topics')}>
            Study a topic first
          </a>
        }
      >
        Each topic gets 12 checkable items at 80% to pass, built from our own writing. Theory rows
        become 4-option cards with a solution you can always reveal — never a quiz on a coding row.
        {signedIn ? null : ' Results sync once you sign in.'}
      </Empty>
    </div>
  )
}

export function InsightsScreen({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="insights-screen">
      <Empty
        title="Insights stay cheap and honest"
        mark={<IconSpark size={20} />}
        testId="insights-view"
        action={
          <a className="btn btn-primary" href={buildPath('stats')}>
            See today's numbers
          </a>
        }
      >
        Phase 08 adds reason chips, a momentum counter that never punishes a missed day, and one
        line of trajectory against your target. No readiness score, no FSRS, no ETA model —
        {signedIn ? ' those were dropped on purpose.' : ' sign in to see yours when they land.'}
      </Empty>
    </div>
  )
}

export function SettingsScreen({
  theme,
  density,
  largeText,
  railCollapsed,
  onTheme,
  onDensity,
  onLargeText,
  onRail,
}: {
  theme: 'dark' | 'light'
  density: 'compact' | 'comfortable' | 'roomy'
  largeText: boolean
  railCollapsed: boolean
  onTheme: (theme: 'dark' | 'light') => void
  onDensity: (density: 'compact' | 'comfortable' | 'roomy') => void
  onLargeText: () => void
  onRail: () => void
}) {
  return (
    <div className="settings-screen">
      <Card title="Appearance">
        <div className="setting-row">
          <div>
            <strong>Theme</strong>
            <p className="quiet-note">Dark is the default; light is contrast-checked in CI.</p>
          </div>
          <div className="segmented" role="group" aria-label="Theme">
            <button type="button" className={theme === 'dark' ? 'segmented-item is-on' : 'segmented-item'} aria-pressed={theme === 'dark'} onClick={() => onTheme('dark')}>
              Dark
            </button>
            <button type="button" className={theme === 'light' ? 'segmented-item is-on' : 'segmented-item'} aria-pressed={theme === 'light'} onClick={() => onTheme('light')}>
              Light
            </button>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <strong>Density</strong>
            <p className="quiet-note">Row height: 38 / 48 / 62 px. Remembered per device.</p>
          </div>
          <div className="segmented" role="group" aria-label="Density">
            {(['compact', 'comfortable', 'roomy'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={density === option ? 'segmented-item is-on' : 'segmented-item'}
                aria-pressed={density === option}
                data-testid={`density-${option}`}
                onClick={() => onDensity(option)}
              >
                {option === 'compact' ? 'Compact' : option === 'comfortable' ? 'Comfortable' : 'Roomy'}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <div>
            <strong>Large text</strong>
            <p className="quiet-note">Larger type at every level, without breaking the grid.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            aria-pressed={largeText}
            data-testid="large-text-toggle"
            onClick={onLargeText}
          >
            {largeText ? 'On' : 'Off'}
          </button>
        </div>
        <div className="setting-row">
          <div>
            <strong>Collapse the sidebar</strong>
            <p className="quiet-note">Desktop only: 240 px sidebar ⇄ 64 px icon rail.</p>
          </div>
          <button type="button" className="btn btn-secondary" aria-pressed={railCollapsed} onClick={onRail}>
            {railCollapsed ? 'Collapsed' : 'Expanded'}
          </button>
        </div>
      </Card>

      <Card title="Your data">
        <p className="quiet-note">
          Progress, notes and lists sync to your own Firestore documents; JSON backup and import live
          in the account panel so nobody's progress is locked into Firebase.
        </p>
        <div className="inline-actions">
          <a className="btn btn-secondary" href="#account-panel">
            Account &amp; backup
          </a>
        </div>
      </Card>

      <Card title="About">
        <dl className="about-list">
          <div>
            <dt>Build</dt>
            <dd>v2 phase 01 — router, shell, design tokens v2</dd>
          </div>
          <div>
            <dt>Catalogue</dt>
            <dd>Catalogue 495 rows · 20 topics · bundled from <code>data/problems.json</code></dd>
          </div>
          <div>
            <dt>Licence</dt>
            <dd>MIT for our own code and data; outbound links belong to their authors.</dd>
          </div>
          <div>
            <dt>Firebase</dt>
            <dd>Auth + Firestore + Hosting on the Spark plan. No Functions, no Storage, no Analytics.</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}

export function NotFoundScreen({ path }: { path: string }) {
  return (
    <Empty
      title="Page not found"
      mark="?"
      testId="not-found-view"
      action={
        <Button
          variant="primary"
          data-testid="not-found-home"
          onClick={() => {
            window.location.hash = '#/'
          }}
        >
          <IconToday size={16} /> Back to Today
        </Button>
      }
    >
      No page exists at <code>{path}</code>. Every screen in this archive has a <code>#/</code> address —
      try the palette with <kbd className="kbd">⌘K</kbd>.
    </Empty>
  )
}
