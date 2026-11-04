/**
 * Phase v2-07 — which languages actually run locally, and what we tell the
 * learner about the rest.
 *
 * One table, consumed by three places so they can never disagree: the run panel
 * (Run vs. copy-out), the Settings card (what a download buys) and the content
 * hooks (does this snippet have a Run button at all).
 *
 * The honest limit is the browser: C, C++ and Python have mature wasm runtimes,
 * JavaScript is native to it, and Java/C#/Go/Rust do not — shipping a fake
 * partial interpreter for those would teach the wrong lesson. Those languages
 * keep the copy-out route that phase 04 already shipped.
 */
import type { CodeLanguage } from '../code/codeStore'

/** Languages the worker can execute. */
export type RunLanguage = 'cpp' | 'c' | 'python' | 'js'

/** Compiler packs a language needs on top of the runner bundle itself. */
export type PackId = 'cpp' | 'python'

export type LanguageSupport =
  | {
      supported: true
      /** What the worker is asked to run. */
      runAs: RunLanguage
      label: string
      /** `null` for JavaScript: the worker bundle alone is enough. */
      pack: PackId | null
      /** Shown before the first download, so nobody spends 29 MB by accident. */
      note: string
    }
  | {
      supported: false
      label: string
      reason: string
    }

export const PACK_LABELS: Record<PackId, string> = {
  cpp: 'C and C++ compiler',
  python: 'Python runtime',
}

export const PACK_LICENSES: Record<PackId, string> = {
  cpp: 'Clang on wasm · MIT',
  python: 'Pyodide · MPL-2.0',
}

/** Every code language the editor offers, and what pressing Run would do. */
export const LANGUAGE_SUPPORT: Record<CodeLanguage, LanguageSupport> = {
  cpp: {
    supported: true,
    runAs: 'cpp',
    label: 'C++',
    pack: 'cpp',
    note: 'Compiled with Clang 22 at -O0 with warnings on, then run in a sandbox in this tab.',
  },
  c: {
    supported: true,
    runAs: 'c',
    label: 'C',
    pack: 'cpp',
    note: 'Compiled with Clang 22, then run in a sandbox in this tab.',
  },
  python: {
    supported: true,
    runAs: 'python',
    label: 'Python',
    pack: 'python',
    note: 'CPython 3.13 on wasm, run in a sandbox in this tab.',
  },
  js: {
    supported: true,
    runAs: 'js',
    label: 'JavaScript',
    pack: null,
    note: 'Runs in a sandboxed worker here — no download beyond the runner itself.',
  },
  ts: {
    supported: false,
    label: 'TypeScript',
    reason: 'TypeScript needs a type checker, which would double the runner download. Run the compiled JavaScript here, or open the playground.',
  },
  java: {
    supported: false,
    label: 'Java',
    reason: 'There is no JVM that runs inside a phone browser. Copy your code into Compiler Explorer or LeetCode instead.',
  },
  go: {
    supported: false,
    label: 'Go',
    reason: 'The Go toolchain does not fit a browser download. Copy your code into the Go playground instead.',
  },
  rust: {
    supported: false,
    label: 'Rust',
    reason: 'Rust needs its own multi-megabyte toolchain. Copy your code into the playground or Compiler Explorer.',
  },
  other: {
    supported: false,
    label: 'Other',
    reason: 'This runner only speaks C, C++, Python and JavaScript. Copy the code out to whichever tool the language needs.',
  },
}

export function supportFor(language: CodeLanguage): LanguageSupport {
  return LANGUAGE_SUPPORT[language]
}

/** The pack ids a language installs, in the order the panel announces them. */
export function packsFor(language: CodeLanguage): PackId[] {
  const support = supportFor(language)
  return support.supported && support.pack ? [support.pack] : []
}

/** Copy-out target for a language the runner cannot take. */
export function outboundFor(language: CodeLanguage): { href: string; label: string } {
  if (language === 'go') {
    return { href: 'https://go.dev/play/', label: 'Open the Go playground' }
  }
  if (language === 'ts') {
    return { href: 'https://www.typescriptlang.org/play', label: 'Open the TypeScript playground' }
  }
  return { href: 'https://godbolt.org/', label: 'Open in Compiler Explorer' }
}
