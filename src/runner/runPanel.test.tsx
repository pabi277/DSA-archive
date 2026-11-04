import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RunPanel, { forgetRuntimeAssets } from './runPanel'

/**
 * The panel's *designed states*, without a 29 MB compiler: what a learner sees
 * before anything is downloaded, when a deploy forgot a pack, and when the
 * language cannot run locally at all. The real compile path is covered by
 * `e2e/runner.spec.ts`.
 */
let container: HTMLDivElement
let root: Root

const packs = {
  packs: {
    cpp: { version: '0.3.0', files: [{ path: 'clang/bin/clang.wasm.gz', bytes: 15_700_000 }] },
  },
}
const runner = { worker: 'runtime/runner/worker-4c2dd683fdb3.js', bytes: 1_276_000 }

function stubEnvironment(options: { packs?: unknown; runner?: unknown } = {}) {
  const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('packs.json')) {
      return new Response(JSON.stringify(options.packs ?? packs), { status: 200 })
    }
    if (url.includes('index.json')) {
      return new Response(JSON.stringify(options.runner ?? runner), { status: 200 })
    }
    return new Response('{}', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchStub)
  vi.stubGlobal('caches', {
    open: async () => ({ match: async () => undefined, put: async () => undefined }),
    delete: async () => true,
  })
}

beforeEach(() => {
  // React 19 needs this flag to accept updates wrapped in `act`. Without it,
  // every render logs "The current testing environment is not configured to
  // support act(...)" — and vitest forwards each of those logs as an async RPC,
  // which is exactly the traffic that can still be in flight when a worker
  // tears down and takes the whole run with it. The other three React suites
  // already set it; this one was simply missed in phase v2-07.
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  forgetRuntimeAssets()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  forgetRuntimeAssets()
})

function mount(node: React.ReactNode) {
  act(() => root.render(node))
}

/**
 * Flush the panel's async start-up (two manifest fetches, then the cache probe)
 * inside `act`. React 19 warns — and forwards that warning as an async console
 * RPC — when a state update escapes `act`, which is what a fixed two-microtask
 * flush allowed on a slower machine: the manifests resolve in a later turn than
 * the flush, so `setAssets` fired outside it. Draining a real macrotask (the
 * fetch stubs are `async`, so their continuations are already queued) settles
 * however many turns the environment needs.
 */
async function settle() {
  await act(async () => {
    for (let turn = 0; turn < 4; turn += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  })
}

const q = (selector: string) => container.querySelector(selector) as HTMLElement | null

describe('a language the browser cannot run', () => {
  it('replaces Run with an honest reason and a copy-out, never a dead button', async () => {
    stubEnvironment()
    mount(<RunPanel code="class Main {}" language="java" cases={[]} problemId="two-sum" />)
    await settle()
    expect(q('[data-testid="runner-unsupported"]')).toBeTruthy()
    expect(q('[data-testid="runner-run-button"]')).toBeNull()
    expect(q('[data-testid="runner-unsupported"]')?.textContent).toContain('no JVM that runs inside a phone browser')
  })
})

describe('the first run', () => {
  it('announces the download and waits for an explicit tap', async () => {
    stubEnvironment()
    mount(<RunPanel code="int main(){}" language="cpp" cases={[]} problemId="two-sum" />)
    await settle()
    const download = q('[data-testid="runner-download"]')
    expect(download).toBeTruthy()
    expect(download?.textContent).toBe('Download C and C++ compiler · 17.0 MB, once')
    // Nothing has been downloaded by merely opening the panel.
    expect(q('[data-testid="runner-run-button"]')).toBeNull()
  })

  it('says which pack a build forgot instead of failing at the first fetch', async () => {
    stubEnvironment({ packs: { packs: {} } })
    mount(<RunPanel code="int main(){}" language="python" cases={[]} problemId="two-sum" />)
    await settle()
    expect(q('[data-testid="runner-unavailable"]')?.textContent).toContain('Python runtime is not deployed')
  })

  it('offers the test count only when a problem has authored cases', async () => {
    stubEnvironment()
    mount(
      <RunPanel
        code="int main(){}"
        language="cpp"
        cases={[{ input: '1\n', expected: '1' }]}
        problemId="largest-element"
      />,
    )
    await settle()
    expect(q('[data-testid="runner-tests-button"]')?.textContent).toContain('Run tests ▸ 1')
  })

  it('states the local, sandboxed promise once, in the fine print', async () => {
    stubEnvironment()
    mount(<RunPanel code="int main(){}" language="cpp" cases={[]} problemId="two-sum" />)
    await settle()
    expect(container.textContent).toContain('nothing is uploaded, nothing is saved')
  })

  it('hides the fine print inside a theory card (compact mode)', async () => {
    stubEnvironment()
    mount(<RunPanel code="int main(){}" language="cpp" cases={[]} problemId="two-sum" compact />)
    await settle()
    expect(q('[data-testid="runner-download"]')).toBeTruthy()
    expect(container.textContent).not.toContain('nothing is uploaded')
  })
})
