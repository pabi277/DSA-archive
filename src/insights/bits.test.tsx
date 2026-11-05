import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DetectorRow, MomentumLine, MomentumStrip, PlanRealityLine, ReasonChips } from './bits'
import type { Reason } from './reasons'
import type { Momentum } from './momentum'
import type { PlanReality } from './trajectory'

/**
 * jsdom mount tests for the phase v2-08 furniture: the chips, the momentum
 * line/strip, the detector row and the plan-reality line. The Playwright spec
 * proves the same pieces inside Today against the emulator; this file is the
 * local proof, because this sandbox cannot download Chromium.
 */

let container: HTMLDivElement
let root: Root

function mount(node: React.ReactNode) {
  act(() => {
    root.render(node)
  })
}

function qa(selector: string): HTMLElement[] {
  return [...container.querySelectorAll(selector)] as HTMLElement[]
}

function click(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const reasons: Reason[] = [
  { id: 'overdue', text: 'overdue 2d' },
  { id: 'due', text: 'due today' },
  { id: 'shaky', text: 'shaky — couldn’t last time' },
]

const momentum: Momentum = {
  value: 7.2,
  studyDaysThisWeek: 4,
  restDayEarned: false,
  strip: Array.from({ length: 14 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, '0')}`,
    active: index % 3 === 0,
  })),
  summary: '7.2 of 10 · 4 study days this week',
}

describe('reason chips', () => {
  it('renders at most two chips and keeps every reason in the tooltip', () => {
    mount(<ReasonChips reasons={reasons} testId="today-reasons" />)
    expect(qa('.reason-chip')).toHaveLength(2)
    expect(qa('.reason-chip')[0].textContent).toBe('overdue 2d')
    expect(container.querySelector('[data-testid="today-reasons"]')?.getAttribute('title')).toBe(
      'overdue 2d · due today · shaky — couldn’t last time',
    )
  })

  it('renders nothing at all when no reason applies', () => {
    mount(<ReasonChips reasons={[]} testId="empty-reasons" />)
    expect(container.querySelector('[data-testid="empty-reasons"]')).toBeNull()
  })

  it('is plain text, never a control', () => {
    mount(<ReasonChips reasons={reasons} />)
    expect(qa('button')).toHaveLength(0)
    expect(qa('a')).toHaveLength(0)
  })
})

describe('momentum', () => {
  it('states the number, the week and never calls it a streak', () => {
    mount(<MomentumLine momentum={momentum} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Momentum')
    expect(text).toContain('7.2')
    expect(text).toContain('4 study days this week')
    expect(text.toLowerCase()).not.toContain('streak')
  })

  it('says when a rest day is earned', () => {
    mount(<MomentumLine momentum={{ ...momentum, restDayEarned: true }} />)
    expect(container.textContent).toContain('rest day earned')
  })

  it('gives the strip one sentence instead of colour', () => {
    mount(<MomentumStrip momentum={momentum} />)
    const strip = container.querySelector('[data-testid="momentum-strip"]')!
    expect(strip.getAttribute('role')).toBe('img')
    expect(strip.getAttribute('aria-label')).toBe(momentum.summary)
    expect(qa('.momentum-bar')).toHaveLength(14)
  })
})

describe('detector row', () => {
  const detector = {
    id: 'forgotten-done' as const,
    count: 6,
    problemIds: ['linear-search'],
    text: '6 problems marked done 30+ days ago and never revised',
    action: 'Add 6 to today',
  }

  it('puts the count in the action label and offers exactly one action', () => {
    const onAction = vi.fn()
    const onDismiss = vi.fn()
    mount(<DetectorRow detector={detector} onAction={onAction} onDismiss={onDismiss} />)
    expect(container.textContent).toContain('6 problems marked done')
    const action = container.querySelector('[data-testid="detector-action-forgotten-done"]') as HTMLElement
    expect(action.textContent).toBe('Add 6 to today')
    click(action)
    expect(onAction).toHaveBeenCalledWith(detector)
    click(container.querySelector('[data-testid="detector-dismiss-forgotten-done"]') as HTMLElement)
    expect(onDismiss).toHaveBeenCalledWith(detector)
  })
})

describe('plan vs reality', () => {
  const reality: PlanReality = { planned: 5, completed: 3, medianPerDay: 3, suggestion: 3 }

  it('shows the plan, the reality and one suggestion', () => {
    const onSetGoal = vi.fn()
    mount(<PlanRealityLine reality={reality} goal={6} onSetGoal={onSetGoal} />)
    expect(container.textContent).toContain('Planned 5')
    expect(container.textContent).toContain('completed 3')
    const button = container.querySelector('[data-testid="plan-reality-set-goal"]') as HTMLElement
    expect(button.textContent).toBe('Set goal to 3')
    click(button)
    expect(onSetGoal).toHaveBeenCalledWith(3)
  })

  it('offers no action when reality already meets the goal', () => {
    mount(<PlanRealityLine reality={{ ...reality, suggestion: null }} goal={3} onSetGoal={() => {}} />)
    expect(container.querySelector('[data-testid="plan-reality-set-goal"]')).toBeNull()
  })
})
