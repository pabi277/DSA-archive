/**
 * Hand-drawn 16/20 px SVG icon set for the v2 shell — no icon library, no
 * external asset (one library per job, and this job is 24 paths).
 *
 * Every icon is decorative by default (`aria-hidden`): the control around it
 * carries an accessible name. Icons never appear alone in a way that would make
 * meaning depend on the drawing — the shell pairs each with a text label in the
 * sidebar/bottom bar, and with `aria-label` inside icon buttons.
 */
import type { SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 18, strokeWidth = 1.7, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false as const,
    ...rest,
  }
}

export function IconToday(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.2" y="4.2" width="13.6" height="12.6" rx="2.4" />
      <path d="M3.2 8h13.6M6.8 2.8v2.6M13.2 2.8v2.6" />
      <path d="M7 11.6h2.2M7 14h4.4" />
    </svg>
  )
}

export function IconTopics(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.8" y="2.8" width="5.6" height="5.6" rx="1.6" />
      <rect x="11.6" y="2.8" width="5.6" height="5.6" rx="1.6" />
      <rect x="2.8" y="11.6" width="5.6" height="5.6" rx="1.6" />
      <rect x="11.6" y="11.6" width="5.6" height="5.6" rx="1.6" />
    </svg>
  )
}

export function IconCode(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.2 5.4 3 10l4.2 4.6M12.8 5.4 17 10l-4.2 4.6" />
      <path d="M11.4 3.6 8.6 16.4" />
    </svg>
  )
}

export function IconReview(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M16.6 10a6.6 6.6 0 1 1-2-4.7" />
      <path d="M16.9 3v3.4h-3.4" />
      <path d="M10 6.6V10l2.4 1.5" />
    </svg>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="8.7" cy="8.7" r="5.3" />
      <path d="m12.8 12.8 3.7 3.7" />
    </svg>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.6v2M10 15.4v2M2.6 10h2M15.4 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M15.2 4.8l-1.4 1.4M6.2 13.8l-1.4 1.4" />
    </svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4.4 10.4 3.6 3.6 7.6-8" />
    </svg>
  )
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="6.8" />
      <path d="M10 6.2V10l2.6 1.6" />
    </svg>
  )
}

export function IconStar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m10 3.2 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7L2.2 8.2l4.7-.7z" />
    </svg>
  )
}

export function IconStarFilled(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="m10 3.2 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7L2.2 8.2l4.7-.7z" />
    </svg>
  )
}

export function IconExternal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M11.4 3.4H16v4.6M16 3.4 9.2 10.2" />
      <path d="M15.2 12v3.2a1.6 1.6 0 0 1-1.6 1.6H4.4a1.6 1.6 0 0 1-1.6-1.6V6.4A1.6 1.6 0 0 1 4.4 4.8H8" />
    </svg>
  )
}

export function IconMore(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <circle cx="4.6" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="15.4" cy="10" r="1.5" />
    </svg>
  )
}

export function IconChevron(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m7.6 4.6 5.4 5.4-5.4 5.4" />
    </svg>
  )
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  )
}

export function IconPanel(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.8" y="3.6" width="14.4" height="12.8" rx="2.2" />
      <path d="M7.6 3.6v12.8" />
    </svg>
  )
}

export function IconSun(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.4v1.8M10 15.8v1.8M2.4 10h1.8M15.8 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M15.3 4.7 14 6M6 14l-1.3 1.3" />
    </svg>
  )
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15.6 12.4A6.4 6.4 0 0 1 7.6 4.4a6.8 6.8 0 1 0 8 8z" />
    </svg>
  )
}

export function IconCommand(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.2 5.6a1.8 1.8 0 1 0-1.8 1.8h9.2a1.8 1.8 0 1 0-1.8-1.8v8.8a1.8 1.8 0 1 0 1.8-1.8H5.4a1.8 1.8 0 1 0 1.8 1.8z" />
    </svg>
  )
}

export function IconUndo(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.4 8.2h7.2a4 4 0 0 1 0 8H8.6" />
      <path d="M7.4 5.2 4.4 8.2l3 3" />
    </svg>
  )
}

export function IconKeyboard(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.4" y="5.4" width="15.2" height="9.2" rx="2" />
      <path d="M5.4 8.4h.1M8 8.4h.1M10.6 8.4h.1M13.2 8.4h.1M5.4 11.4h.1M8 11.4h.1M10.6 11.4h.1M13.2 11.4h.1M7 13.4h6" />
    </svg>
  )
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 2.8 16 5v5.2c0 3.4-2.5 6-6 7-3.5-1-6-3.6-6-7V5z" />
      <path d="m7.6 9.8 1.8 1.8 3.4-3.6" />
    </svg>
  )
}

export function IconSpark(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 2.6 11.6 8l5.4 1.6-5.4 1.6L10 16.6 8.4 11.2 3 9.6l5.4-1.6z" />
    </svg>
  )
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15.6 10H4.4M9 4.6 3.6 10 9 15.4" />
    </svg>
  )
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.4 10h11.2M11 4.6 16.4 10 11 15.4" />
    </svg>
  )
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.6 4.4 15 10l-8.4 5.6z" />
    </svg>
  )
}

export function IconFilter(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.8 5h14.4M5.6 10h8.8M8.4 15h3.2" />
    </svg>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 4.2v11.6M4.2 10h11.6" />
    </svg>
  )
}

/** Route → icon, consumed by the shell and the command palette. */
export const ROUTE_ICONS = {
  today: IconToday,
  topics: IconTopics,
  code: IconCode,
  review: IconReview,
  search: IconSearch,
  settings: IconSettings,
  lists: IconTopics,
  friends: IconTopics,
  stats: IconTopics,
  practice: IconSpark,
  quiz: IconCheck,
  insights: IconSpark,
  problem: IconPlay,
  'not-found': IconAction404,
}

function IconAction404(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="7" />
      <path d="M7.6 12.2a3.2 3.2 0 0 1 4.8 0M7.4 7.8h.1M12.5 7.8h.1" />
    </svg>
  )
}
