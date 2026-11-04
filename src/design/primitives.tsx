/**
 * Design primitives v2 (phase v2-01, §3.4).
 *
 * The shell composes only these; a screen never invents a button, a chip or a
 * card of its own. Each primitive is a thin wrapper over the token set in
 * `tokens.css`, so every control inherits the same height (`--control-height`),
 * radius (8/12/pill), focus ring (2 px action) and motion (120/180 ms).
 *
 * Rules encoded here rather than left to page authors:
 * · exactly one `Button variant="primary"` per view (it is the accent);
 * · a `Chip` is always a toggle with `aria-pressed`, never a decoration;
 * · a `Ring` always ships the number *and* the denominator in text;
 * · `Tag` colours follow the five semantic roles, and every tag keeps a label.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { IconClose } from './icons'

function classes(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

/* --- Button ---------------------------------------------------------------- */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
}) {
  return <button type={type} className={classes('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)} {...rest} />
}

/* --- Chip (toggle) --------------------------------------------------------- */

export function Chip({
  on,
  className,
  children,
  onClick,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & { on: boolean }) {
  return (
    <button
      type="button"
      className={classes('chip', on && 'is-on', className)}
      aria-pressed={on}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}

/* --- Tag ------------------------------------------------------------------- */

export type TagTone = 'neutral' | 'action' | 'success' | 'caution' | 'danger' | 'info'

export function Tag({
  tone = 'neutral',
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: TagTone }) {
  return (
    <span className={classes('tag', `tag-${tone}`, className)} {...rest}>
      {children}
    </span>
  )
}

/* --- SegmentedControl ------------------------------------------------------ */

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode; testId?: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={classes('segmented', className)} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={classes('segmented-item', option.value === value && 'is-on')}
          aria-pressed={option.value === value}
          data-testid={option.testId}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/* --- Ring ------------------------------------------------------------------ */

/**
 * Progress ring. `aria-hidden` by default because the callers always print the
 * same fact as text next to it ("12/32 done"); pass `label` to make the ring
 * itself the accessible carrier when there is no room for the sentence.
 */
export function Ring({
  value,
  total,
  size = 44,
  thickness = 4,
  tone = 'action',
  label,
}: {
  value: number
  total: number
  size?: number
  thickness?: number
  tone?: 'action' | 'success' | 'caution' | 'info'
  label?: string
}) {
  const safeTotal = total > 0 ? total : 1
  const ratio = Math.max(0, Math.min(1, value / safeTotal))
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const percent = Math.round(ratio * 100)
  return (
    <span
      className={classes('ring', `ring-${tone}`)}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-percent={percent}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} focusable="false">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={thickness} fill="none" />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-label num">{percent}%</span>
    </span>
  )
}

/* --- Stat ------------------------------------------------------------------ */

/** One number, one denominator, one label — never a naked percentage. */
export function Stat({
  value,
  label,
  detail,
  tone = 'neutral',
}: {
  value: ReactNode
  label: string
  detail?: ReactNode
  tone?: 'neutral' | 'action' | 'success' | 'caution'
}) {
  return (
    <div className={classes('stat', `stat-${tone}`)}>
      <span className="stat-value num">{value}</span>
      <span className="stat-label">{label}</span>
      {detail ? <span className="stat-detail">{detail}</span> : null}
    </div>
  )
}

/* --- Card / Sheet ---------------------------------------------------------- */

export function Card({
  title,
  action,
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & { title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={classes('card', className)} {...rest}>
      {(title || action) && (
        <header className="card-head">
          {title ? <h2 className="card-title">{title}</h2> : <span />}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/** Modal surface (palette, shortcuts, confirmations) built on <dialog>. */
export function Sheet({
  open,
  onClose,
  label,
  children,
  className,
  placement = 'center',
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  className?: string
  placement?: 'center' | 'top'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      // jsdom implements <dialog> only partially: showModal is missing or
      // throws "not implemented". The `open` attribute is the fallback path and
      // keeps the modal focusable/findable in unit tests.
      try {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        else dialog.setAttribute('open', '')
      } catch {
        dialog.setAttribute('open', '')
      }
    } else if (!open && dialog.open) {
      try {
        if (typeof dialog.close === 'function') dialog.close()
        else dialog.removeAttribute('open')
      } catch {
        dialog.removeAttribute('open')
      }
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      className={classes('sheet', `sheet-${placement}`, className)}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
    >
      {open && children}
    </dialog>
  )
}

/* --- Toasts + undo --------------------------------------------------------- */

export type ToastTone = 'neutral' | 'success' | 'danger'

export type ToastAction = { label: string; run: () => void }

export type ToastMessage = {
  id: number
  message: string
  detail?: string
  tone?: ToastTone
  action?: ToastAction
  /** Undo entries carry their remaining seconds; the host renders the ring. */
  secondsLeft?: number
}

export function ToastHost({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-host" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={classes('toast', `toast-${toast.tone ?? 'neutral'}`)} data-testid="toast">
          <div className="toast-copy">
            <strong>{toast.message}</strong>
            {toast.detail ? <span>{toast.detail}</span> : null}
          </div>
          {toast.action ? (
            <button type="button" className="toast-action" data-testid="toast-action" onClick={toast.action.run}>
              {toast.action.label}
              {toast.secondsLeft !== undefined ? <span className="toast-timer num">{toast.secondsLeft}s</span> : null}
            </button>
          ) : null}
          <button
            type="button"
            className="toast-close"
            aria-label={`Dismiss: ${toast.message}`}
            onClick={() => onDismiss(toast.id)}
          >
            <IconClose size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* --- Empty / Avatar -------------------------------------------------------- */

/**
 * Every view has a designed empty state with exactly one primary action.
 * `hint` is the sentence that tells a beginner what will make this screen
 * useful; `action` is the single next click.
 */
export function Empty({
  title,
  children,
  action,
  mark,
  testId,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  mark?: ReactNode
  testId?: string
}) {
  return (
    <div className="empty" data-testid={testId}>
      {mark ? (
        <span className="empty-mark" aria-hidden="true">
          {mark}
        </span>
      ) : null}
      <h2 className="empty-title">{title}</h2>
      {children ? <p className="empty-copy">{children}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  )
}

/** Shaped like the result it replaces: rows of text, not a spinner. */
export function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size }} aria-hidden="true">
      {initials}
    </span>
  )
}

/* --- Menu (⋯ row actions, account) ---------------------------------------- */

const MenuContext = createContext<{ close: () => void } | null>(null)

export function Menu({ label, trigger, children }: { label: string; trigger: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const node = ref.current
      if (!node || !node.open) return
      if (!node.contains(event.target as Node)) close()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close])
  return (
    <details className="menu" ref={ref} open={open}>
      <summary
        className="menu-trigger"
        role="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault()
          setOpen((current) => !current)
        }}
      >
        {trigger}
      </summary>
      <div className="menu-panel" role="group" aria-label={label}>
        <MenuContext.Provider value={{ close }}>{children}</MenuContext.Provider>
      </div>
    </details>
  )
}

export function MenuItem({
  children,
  onClick,
  href,
  tone = 'neutral',
  testId,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  tone?: 'neutral' | 'danger'
  testId?: string
}) {
  const context = useContext(MenuContext)
  const run = () => {
    context?.close()
    onClick?.()
  }
  if (href) {
    return (
      <a
        className={classes('menu-item', tone === 'danger' && 'is-danger')}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={testId}
        onClick={() => context?.close()}
      >
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={classes('menu-item', tone === 'danger' && 'is-danger')} onClick={run} data-testid={testId}>
      {children}
    </button>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}
