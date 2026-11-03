import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HintDisclosure } from './hint'

let container: HTMLDivElement
let root: Root

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  localStorage.clear()
})

describe('hint disclosure', () => {
  it('opens in local state only and writes no progress or network data', () => {
    const before = localStorage.getItem('dsa-archive.progress.v1')
    act(() => root.render(<HintDisclosure problemId="linear-search" />))
    const details = container.querySelector('[data-testid="hint-details"]') as HTMLDetailsElement
    const summary = details.querySelector('summary') as HTMLElement
    expect(details.open).toBe(false)
    expect(container.querySelector('[data-testid="hint-disclosure"]')).toBeTruthy()

    act(() => {
      summary.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      details.dispatchEvent(new Event('toggle', { bubbles: true }))
    })
    expect(details.open).toBe(true)
    expect(details.textContent).toContain('Hint')
    expect(localStorage.getItem('dsa-archive.progress.v1')).toBe(before)
    expect(container.querySelectorAll('details')).toHaveLength(2)
  })

  it('renders a designed state when no hint has been authored', () => {
    act(() => root.render(<HintDisclosure problemId="two-sum" />))
    expect(container.querySelector('[data-testid="hint-missing"]')).toBeTruthy()
    expect(container.querySelector('details')).toBeNull()
  })
})
