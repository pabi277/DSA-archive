/**
 * Routes that exist (so every screen has a URL, the back button works and the
 * palette can reach them) but whose body arrives in a later v2 phase. Each one
 * is a *designed* state, not "coming soon" filler: it says what will live here,
 * what you can do right now instead, and offers exactly one primary action.
 *
 * Phase contract: 01 shipped the routes + the states; the problem, practice
 * and code bodies graduated to their own modules in phases 03–04, and 05
 * replaces the quiz home below.
 */
import { Suspense, lazy } from 'react'
import { buildPath } from './router'
import { Button, Card, Empty, Tag } from '../design/primitives'
import { useTheatreSettings, resetAllRates } from '../theatre/theatreSettings'
import { memorisedTopics, rateLabel } from '../theatre/speedMemory'
import { IconSpark, IconToday } from '../design/icons'

/**
 * Phase v2-07: the runner's storage card is a lazy chunk. It imports the runtime
 * manifests, which belong to the installed add-on — not to the frozen shell.
 */
const RunnerSettingsCard = lazy(() => import('../runner/settingsCard'))

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

      <TheatreSettingsCard />

      <Suspense fallback={null}>
        <RunnerSettingsCard />
      </Suspense>

      <Card title="Your data">
        <p className="quiet-note">
          Progress, saved code and lists sync to your own Firestore documents; JSON backup and import live
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

/**
 * Phase v2-06 §9: one honest theatre card. It states the player's terms once,
 * lists the device-local speeds the learner actually chose, and offers the one
 * reset that matters — "forget them all". No toggle pretends to block ads.
 */
function TheatreSettingsCard() {
  const theatre = useTheatreSettings()
  const tuned = memorisedTopics(theatre.speeds)
  return (
    <Card title="Video"
      data-testid="theatre-settings">
      <p className="quiet-note">
        Videos play through YouTube&rsquo;s official player in its own frame. Ads are handled by your browser;
        the app doesn&rsquo;t block them, and nothing is ever drawn over the video.
      </p>
      <div className="setting-row">
        <div>
          <strong>Playback speed</strong>
          <p className="quiet-note">
            Remembered per topic, on this device only{theatre.autoAdvance ? ' · auto-advance is on' : ''}.
          </p>
        </div>
        <Tag tone={tuned.length ? 'info' : 'neutral'} data-testid="speed-count">
          {tuned.length === 0 ? 'All at 1×' : `${tuned.length} topic${tuned.length === 1 ? '' : 's'} tuned`}
        </Tag>
      </div>
      {tuned.length > 0 ? (
        <>
          <ul className="quiet-note speed-list" data-testid="speed-list">
            {tuned.map(({ topicId, rate }) => (
              <li key={topicId}>
                <code>{topicId}</code> at {rateLabel(rate)}
              </li>
            ))}
          </ul>
          <div className="inline-actions">
            <Button size="sm" data-testid="speed-reset" onClick={() => resetAllRates()}>
              Forget every speed
            </Button>
          </div>
        </>
      ) : null}
    </Card>
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
