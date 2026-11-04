import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  installPlan,
  sanitisePacks,
  sanitiseRunnerBundle,
  type RuntimePacks,
} from './packs'
import { languageChip } from '../code/codeStore'
import { CODE_LANGUAGES } from '../code/codeStore'
import { LANGUAGE_SUPPORT, outboundFor, packsFor, supportFor } from './languages'

const manifests = sanitisePacks({
  packs: {
    cpp: {
      label: 'ignored',
      version: '0.3.0',
      license: 'MIT',
      bytes: 1, // ignored: the total is summed from the files
      files: [
        { path: 'clang/bin/clang.wasm.gz', bytes: 15_721_977 },
        { path: 'clang/bin/sysroot.tar.gz', bytes: 5_401_380 },
      ],
    },
    python: {
      version: '314.0.7',
      files: [{ path: 'pyodide/pyodide.asm.wasm', bytes: 9_598_218 }],
    },
  },
})

const runner = { worker: 'runtime/runner/worker-4c2dd683fdb3.js', bytes: 1_276_000 }

describe('runtime manifests', () => {
  it('sizes packs from their files, never from a number someone typed', () => {
    expect(manifests.cpp?.bytes).toBe(21_123_357)
    expect(manifests.cpp?.label).toBe('C and C++ compiler')
  })

  it('drops malformed entries instead of trusting them', () => {
    const messy = sanitisePacks({
      packs: {
        cpp: { files: [{ path: '../../etc/passwd', bytes: 10 }] },
        python: { files: [] },
        java: { files: [{ path: 'x', bytes: 1 }] },
      },
    })
    expect(messy).toEqual({})
    expect(sanitisePacks(null)).toEqual({})
    expect(sanitisePacks({ packs: 'nope' })).toEqual({})
  })

  it('only ever spawns a same-origin, hashed worker path', () => {
    expect(sanitiseRunnerBundle(runner)).toEqual(runner)
    expect(sanitiseRunnerBundle({ worker: 'https://evil.example/worker.js', bytes: 1 })).toBeNull()
    expect(sanitiseRunnerBundle({ worker: 'runtime/runner/worker.js', bytes: 1 })).toBeNull()
    expect(sanitiseRunnerBundle({ worker: '../../worker.js', bytes: 1 })).toBeNull()
  })

  it('prints the size it will really download', () => {
    expect(formatBytes(28_987_000)).toBe('29.0 MB')
    expect(formatBytes(57_500)).toBe('58 kB')
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })
})

describe('what pressing Run costs', () => {
  it('announces C++ with its pack and the runner bundle added in', () => {
    const plan = installPlan('cpp', manifests, runner)
    expect(plan.ready).toBe(true)
    expect(plan.packs).toEqual(['cpp'])
    expect(plan.bytes).toBe(21_123_357 + 1_276_000)
    expect(plan.label).toBe('Download C and C++ compiler · 22.4 MB, once')
  })

  it('adds nothing but the runner bundle for JavaScript', () => {
    const plan = installPlan('js', manifests, runner)
    expect(plan.packs).toEqual([])
    expect(plan.label).toBe('Download JavaScript runner · 1.3 MB, once')
  })

  it('says which pack a deploy forgot instead of failing at the first fetch', () => {
    const plan = installPlan('python', {}, runner)
    expect(plan.ready).toBe(false)
    expect(plan.unavailable).toBe('The Python runtime is not deployed with this build.')
    const noWorker = installPlan('js', manifests, null)
    expect(noWorker.ready).toBe(false)
    expect(noWorker.unavailable).toContain('runner bundle is not deployed')
  })

  it('never claims a download for a language it cannot run', () => {
    const plan = installPlan('java', manifests, runner)
    expect(plan.ready).toBe(false)
    expect(plan.unavailable).toBeNull()
    expect(plan.bytes).toBe(0)
  })
})

describe('the language support matrix', () => {
  it('covers every language the editor offers', () => {
    for (const language of CODE_LANGUAGES) {
      expect(LANGUAGE_SUPPORT[language], language).toBeTruthy()
      expect(supportFor(language).label.length).toBeGreaterThan(0)
    }
  })

  it('runs C, C++, Python and JavaScript, and explains the rest', () => {
    expect(packsFor('cpp')).toEqual(['cpp'])
    expect(packsFor('c')).toEqual(['cpp'])
    expect(packsFor('python')).toEqual(['python'])
    expect(packsFor('js')).toEqual([])
    for (const language of ['java', 'go', 'rust', 'ts', 'other'] as const) {
      const support = supportFor(language)
      expect(support.supported).toBe(false)
      if (!support.supported) expect(support.reason.length).toBeGreaterThan(20)
    }
  })

  it('sends a language it cannot run somewhere it can be run', () => {
    expect(outboundFor('java').href).toBe('https://godbolt.org/')
    expect(outboundFor('go').href).toBe('https://go.dev/play/')
    expect(outboundFor('ts').href).toBe('https://www.typescriptlang.org/play')
  })

  it('keeps the row chip text the code screen already uses', () => {
    expect(languageChip('cpp')).toBe('cpp')
    expect(languageChip('python')).toBe('py')
  })
})

describe('a missing deploy', () => {
  it('reports an empty pack set when nothing is shipped', () => {
    const empty: RuntimePacks = {}
    expect(installPlan('cpp', empty, null)).toEqual({
      packs: ['cpp'],
      bytes: 0,
      packBytes: 0,
      label: 'C++',
      ready: false,
      unavailable: 'The C and C++ compiler is not deployed with this build.',
    })
  })
})
