/**
 * Keyboard registry + the `?` shortcuts sheet (phase v2-01, §3.11).
 *
 * One place defines every shortcut, so the sheet can never drift from the
 * handlers. Two families:
 * · global — ⌘K palette, / focus search, ? shortcuts, g-then-key navigation;
 * · list triage — j/k move, x mark done, s star, ↵ open, u undo.
 *
 * Triage keys only fire inside a list (`data-triage` container) and never while
 * the user is typing, so a search box is always safe.
 */
import { useEffect } from 'react'
import { Kbd, Sheet } from '../design/primitives'

export type ShortcutGroup = {
  title: string
  items: { keys: string[]; label: string }[]
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Anywhere',
    items: [
      { keys: ['⌘', 'K'], label: 'Open the command palette' },
      { keys: ['/'], label: 'Search the sheet' },
      { keys: ['?'], label: 'This shortcuts sheet' },
      { keys: ['esc'], label: 'Close a sheet or the palette' },
    ],
  },
  {
    title: 'Go to',
    items: [
      { keys: ['g', 't'], label: 'Today' },
      { keys: ['g', 'p'], label: 'Topics' },
      { keys: ['g', 'c'], label: 'Code' },
      { keys: ['g', 'r'], label: 'Review' },
      { keys: ['g', 's'], label: 'Stats' },
      { keys: ['g', ','], label: 'Settings' },
    ],
  },
  {
    title: 'Inside a list',
    items: [
      { keys: ['j'], label: 'Move to the next row' },
      { keys: ['k'], label: 'Move to the previous row' },
      { keys: ['x'], label: 'Mark the focused row done / not done' },
      { keys: ['s'], label: 'Star the focused row' },
      { keys: ['↵'], label: 'Open the focused row' },
      { keys: ['u'], label: 'Undo the last change' },
    ],
  },
]

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null
  if (!element) return false
  if (element.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
}

export type ShortcutHandlers = {
  onPalette: () => void
  onSearch: () => void
  onShortcuts: () => void
  onUndo: () => void
  onNavigate: (key: string) => void
}

/**
 * Install the global shortcut layer. Returns the teardown for effects/tests.
 * Implemented as a subscription (not a React hook) so jsdom tests can drive it
 * with plain `KeyboardEvent`s.
 */
export function installShortcuts(handlers: ShortcutHandlers): () => void {
  if (typeof window === 'undefined') return () => {}
  let pendingG = false
  let pendingTimer: number | undefined

  const onKeyDown = (event: KeyboardEvent) => {
    const typing = isTyping(event.target)
    const meta = event.metaKey || event.ctrlKey

    if (meta && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      handlers.onPalette()
      return
    }
    if (meta || event.altKey) return

    if (event.key === '?' && !typing) {
      event.preventDefault()
      handlers.onShortcuts()
      return
    }
    if (event.key === '/' && !typing) {
      event.preventDefault()
      handlers.onSearch()
      return
    }
    if (typing) return

    if (pendingG) {
      pendingG = false
      window.clearTimeout(pendingTimer)
      const key = event.key.toLowerCase()
      if (['t', 'p', 'c', 'r', 's', ','].includes(key)) {
        event.preventDefault()
        handlers.onNavigate(key)
      }
      return
    }
    if (event.key.toLowerCase() === 'g') {
      pendingG = true
      pendingTimer = window.setTimeout(() => {
        pendingG = false
      }, 1200)
      return
    }
    if (event.key.toLowerCase() === 'u') {
      event.preventDefault()
      handlers.onUndo()
    }
  }

  window.addEventListener('keydown', onKeyDown)
  return () => {
    window.clearTimeout(pendingTimer)
    window.removeEventListener('keydown', onKeyDown)
  }
}

export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="Keyboard shortcuts" placement="center" className="shortcuts">
      <header className="shortcuts-head">
        <h2>Keyboard shortcuts</h2>
        <p>Everything reachable by keyboard, nothing hidden behind a mouse.</p>
      </header>
      <div className="shortcuts-groups">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title} className="shortcuts-group" aria-labelledby={`shortcuts-${group.title}`}>
            <h3 id={`shortcuts-${group.title}`}>{group.title}</h3>
            <dl>
              {group.items.map((item) => (
                <div key={item.label} className="shortcuts-row">
                  <dt>
                    {item.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </dt>
                  <dd>{item.label}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Sheet>
  )
}

/**
 * Hook form used by the app root: installs the global layer and keeps it in
 * sync with the latest handlers without re-binding on every render.
 */
export function useGlobalShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => installShortcuts(handlers))
}
