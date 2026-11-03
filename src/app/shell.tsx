/**
 * Product shell (phase v2-01, §3.2 + §4 "Layout grid").
 *
 * Desktop: a 240 px sidebar that collapses to a 64 px rail (remembered in
 * settings). Phone: a 4-item bottom bar — Today · Topics · Code · Review — with
 * 16 px gutters and a safe-area inset, so navigation is never more than one tap
 * away and never requires scrolling to find.
 *
 * The top bar holds the wordmark (a link home, not a heading), the sync pill,
 * the `⌘K` affordance, the theme toggle and the account menu. The page header
 * (`PageHeader`) replaces the v1 eyebrow/hero/subtitle stack: one `h1`, one line
 * of context, at most one primary action.
 */
import type { ReactNode } from 'react'
import { buildPath, navigate, type Route, type RouteName } from './router'
import {
  IconCode,
  IconPanel,
  IconReview,
  IconSearch,
  IconSettings,
  IconStar,
  IconToday,
  IconTopics,
} from '../design/icons'
import { Avatar, Button, Menu, MenuItem } from '../design/primitives'
import { toggleRail, toggleTheme, type Settings } from '../settings'

export type ShellNavCounts = {
  today?: string
  topics?: string
  code?: string
  review?: string
}

const NAV: { name: RouteName; label: string; Icon: typeof IconToday; shortcut: string }[] = [
  { name: 'today', label: 'Today', Icon: IconToday, shortcut: 'g t' },
  { name: 'topics', label: 'Topics', Icon: IconTopics, shortcut: 'g p' },
  { name: 'code', label: 'Code', Icon: IconCode, shortcut: 'g c' },
  { name: 'review', label: 'Review', Icon: IconReview, shortcut: 'g r' },
]

const SECONDARY: { name: RouteName; label: string; Icon: typeof IconToday }[] = [
  { name: 'search', label: 'Search sheet', Icon: IconSearch },
  { name: 'lists', label: 'My lists', Icon: IconTopics },
  { name: 'notes', label: 'Notes', Icon: IconStar },
  { name: 'stats', label: 'Stats', Icon: IconTopics },
  { name: 'friends', label: 'Friends', Icon: IconTopics },
  { name: 'settings', label: 'Settings', Icon: IconSettings },
]

function isActive(route: Route, name: RouteName) {
  if (route.name === name) return true
  // Topic/problem/code are the same working area for the "Topics" item.
  if (name === 'topics') return route.name === 'topic' || route.name === 'problem'
  if (name === 'today') return route.name === 'today' || route.name === 'not-found'
  return false
}

export function NavSidebar({ route, counts }: { route: Route; counts: ShellNavCounts }) {
  return (
    <nav className="sidebar" aria-label="Main">
      <ul className="nav-list">
        {NAV.map(({ name, label, Icon, shortcut }) => {
          const active = isActive(route, name)
          const count = counts[name as keyof ShellNavCounts]
          return (
            <li key={name}>
              <a
                className={active ? 'nav-item is-active' : 'nav-item'}
                href={buildPath(name)}
                aria-current={active ? 'page' : undefined}
                data-testid={`nav-${name}`}
                title={`${label} (${shortcut})`}
              >
                <Icon size={18} />
                <span className="nav-label">{label}</span>
                {count ? <span className="nav-count num">{count}</span> : null}
              </a>
            </li>
          )
        })}
      </ul>
      <div className="nav-divider" role="presentation" />
      <ul className="nav-list nav-secondary">
        {SECONDARY.map(({ name, label, Icon }) => {
          const active = route.name === name
          return (
            <li key={name}>
              <a
                className={active ? 'nav-item is-active' : 'nav-item'}
                href={buildPath(name)}
                aria-current={active ? 'page' : undefined}
                data-testid={`nav-${name}`}
              >
                <Icon size={18} />
                <span className="nav-label">{label}</span>
              </a>
            </li>
          )
        })}
      </ul>
      <div className="nav-foot">
        <button type="button" className="rail-toggle" onClick={toggleRail} data-testid="rail-toggle">
          <IconPanel size={18} />
          <span className="nav-label">Collapse</span>
        </button>
        <p className="nav-foot-note">
          One accent, five roles, tabular numbers. Press <kbd className="kbd">⌘K</kbd> for anything.
        </p>
      </div>
    </nav>
  )
}

export function BottomBar({ route, counts }: { route: Route; counts: ShellNavCounts }) {
  return (
    <nav className="bottom-bar" aria-label="Main (phone)">
      {NAV.map(({ name, label, Icon }) => {
        const active = isActive(route, name)
        const count = counts[name as keyof ShellNavCounts]
        return (
          <a
            key={name}
            className={active ? 'bottom-item is-active' : 'bottom-item'}
            href={buildPath(name)}
            aria-current={active ? 'page' : undefined}
            data-testid={`bottom-${name}`}
          >
            <span className="bottom-icon">
              <Icon size={20} />
              {count ? <span className="bottom-count num">{count}</span> : null}
            </span>
            <span className="bottom-label">{label}</span>
          </a>
        )
      })}
    </nav>
  )
}

export function TopBar({
  settings,
  account,
  syncLabel,
  syncTone,
  onOpenPalette,
  onOpenShortcuts,
  onOpenSearch,
  installable,
  onInstall,
  onSignIn,
  onSignOut,
  onOpenAccount,
  busy,
}: {
  settings: Settings
  account: { displayName: string; email: string; initials: string } | null
  syncLabel: string
  syncTone: 'ok' | 'warn' | 'danger' | 'muted'
  onOpenPalette: () => void
  onOpenShortcuts: () => void
  onOpenSearch: () => void
  installable: boolean
  onInstall: () => void
  onSignIn: () => void
  onSignOut: () => void
  onOpenAccount: () => void
  busy: boolean
}) {
  return (
    <header className="topbar">
      <a className="wordmark" href={buildPath('today')} data-testid="wordmark">
        DSA Archive
      </a>

      <button type="button" className="palette-trigger" onClick={onOpenPalette} data-testid="palette-trigger">
        <IconSearch size={16} />
        <span className="palette-trigger-label">Search or jump to…</span>
        <kbd className="kbd palette-trigger-kbd">⌘K</kbd>
      </button>

      <div className="topbar-actions">
        <span
          className={`sync-pill sync-${syncTone}`}
          data-testid="sync-pill"
          aria-live="polite"
          title="Where your progress is saved right now"
        >
          <span className="status-dot" aria-hidden="true" />
          {syncLabel}
        </span>

        <button type="button" className="icon-button" onClick={onOpenSearch} aria-label="Search the sheet" data-testid="topbar-search">
          <IconSearch size={18} />
        </button>

        <button
          type="button"
          className="icon-button"
          onClick={toggleTheme}
          aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} appearance`}
          data-testid="theme-toggle"
        >
          {settings.theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        <button
          type="button"
          className="icon-button icon-button-square"
          onClick={onOpenShortcuts}
          aria-label="Keyboard shortcuts"
          aria-keyshortcuts="?"
          data-testid="shortcuts-button"
        >
          ?
        </button>

        {installable && (
          <Button size="sm" onClick={onInstall} data-testid="install-app">
            Install
          </Button>
        )}

        {account ? (
          <Menu
            label={`Account menu for ${account.displayName}`}
            trigger={<Avatar initials={account.initials} size={30} />}
          >
            <div className="menu-identity">
              <strong>{account.displayName}</strong>
              <span>{account.email}</span>
            </div>
            <MenuItem onClick={onOpenAccount} testId="menu-account">Account &amp; backup</MenuItem>
            <MenuItem onClick={onOpenAccount} testId="menu-settings">
              Settings &amp; appearance
            </MenuItem>
            <MenuItem onClick={onSignOut} testId="menu-sign-out">Sign out</MenuItem>
          </Menu>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onSignIn}
            disabled={busy}
            data-testid="sign-in"
          >
            Sign in
          </Button>
        )}
      </div>
    </header>
  )
}

/**
 * Route-aware page header: one `h1`, one line of context, at most one action.
 * Never an eyebrow + hero + subtitle stack (that was the v1 template tell).
 */
export function PageHeader({
  title,
  context,
  action,
  back,
  testId,
}: {
  title: string
  context?: ReactNode
  action?: ReactNode
  back?: { href: string; label: string }
  testId?: string
}) {
  return (
    <header className="page-header" data-testid={testId}>
      <div className="page-header-copy">
        {back ? (
          <a className="back-link" href={back.href}>
            ← {back.label}
          </a>
        ) : null}
        <h1>{title}</h1>
        {context ? <p className="page-context">{context}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </header>
  )
}

/** Compact banner used for sync/offline/error notices inside a route. */
export function Banner({
  tone = 'neutral',
  title,
  children,
  action,
  testId,
  role = 'status',
}: {
  tone?: 'neutral' | 'action' | 'danger' | 'caution'
  title: string
  children?: ReactNode
  action?: ReactNode
  testId?: string
  role?: 'status' | 'alert'
}) {
  return (
    <section className={`banner banner-${tone}`} role={role} data-testid={testId}>
      <div className="banner-copy">
        <strong>{title}</strong>
        {children ? <span>{children}</span> : null}
      </div>
      {action ? <div className="banner-actions">{action}</div> : null}
    </section>
  )
}

export function goTo(name: RouteName) {
  navigate(name)
}
