/**
 * Phase v2-07 — the Run panel.
 *
 * Lives beside the code on `#/problem/<id>?tab=code`, in both the read and the
 * edit view, and is loaded as its own chunk: it is an *installed add-on*, not
 * part of the frozen app shell (see `tools/build-runner-worker.mjs`). Nothing
 * here is fetched until the learner actually presses something.
 *
 * The states it must never fumble, in the order a learner meets them:
 *   unsupported language → copy-out and a reason (no dead Run button)
 *   first run            → "Download … · 29.0 MB, once", a real byte count,
 *                          a Cancel that works, and no auto-start
 *   compiling / running  → aria-busy output, a Stop that is instant
 *   compile error        → first diagnostic in monospace, "N more" underneath
 *   wrong answer         → which case, the first differing line, nothing else
 *   offline, not cached  → says so and offers copy-out
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import runnerStyles from './runner.css?inline'
import { Button, Tag } from '../design/primitives'
import { copyText } from '../code/editor'
import type { CodeLanguage } from '../code/codeStore'
import { outboundFor, PACK_LICENSES, supportFor } from './languages'
import { formatBytes, installPlan } from './packs'
import { RunnerClient, RunnerError, type RunnerErrorKind } from './client'
import { isInstalled, loadRuntimeAssets, packFileUrls, storageAvailable, type RuntimeAssets } from './runtimeStore'
import { runLine } from './output'
import { CASE_TIMEOUT_MS, runCases, type CaseRunSummary, type CaseSpec } from './tests'
import type { RunOutcome } from './protocol'

/**
 * The runner's stylesheet travels inside its own chunk (imported `?inline` and
 * injected once). A separate `assets/*.css` file would have landed in the app
 * shell's stylesheet bucket — or, split out, in a file whose name the Service
 * Worker and the budget gate would have to guess. One chunk, one rule.
 */
let stylesInjected = false

function injectRunnerStyles() {
  if (stylesInjected || typeof document === 'undefined') return
  stylesInjected = true
  const style = document.createElement('style')
  style.dataset.runnerStyles = 'v2-07'
  style.textContent = runnerStyles
  document.head.append(style)
}

/** Manifests are tiny and stable within a session: read them once per page. */
let assetsOnce: Promise<RuntimeAssets> | null = null

function runtimeAssets(): Promise<RuntimeAssets> {
  if (!assetsOnce) assetsOnce = loadRuntimeAssets()
  return assetsOnce
}

/** Reset between tests and after a Settings "Clear". */
export function forgetRuntimeAssets() {
  assetsOnce = null
}

type Busy = 'idle' | 'downloading' | 'running' | 'testing'

export default function RunPanel({
  code,
  language,
  cases,
  problemId,
  autoOpen = false,
  compact = false,
}: {
  code: string
  language: CodeLanguage
  cases: readonly CaseSpec[]
  problemId: string
  /** True when the learner arrived from a "run this snippet" hook. */
  autoOpen?: boolean
  /** Inside a theory card: no licence line, nothing to install twice. */
  compact?: boolean
}) {
  const support = supportFor(language)
  const [assets, setAssets] = useState<RuntimeAssets | null>(null)
  const [installed, setInstalled] = useState(false)
  const [busy, setBusy] = useState<Busy>('idle')
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [summary, setSummary] = useState<CaseRunSummary | null>(null)
  const [failure, setFailure] = useState<{ kind: RunnerErrorKind; message: string; diagnostics: string[] } | null>(null)
  const [stdin, setStdin] = useState('')
  const [stdinOpen, setStdinOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const clientRef = useRef<RunnerClient | null>(null)
  const outputRef = useRef<HTMLPreElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const runningRef = useRef(false)

  const plan = useMemo(
    () => (assets && support.supported ? installPlan(language, assets.packs, assets.runner) : null),
    [assets, language, support],
  )

  useEffect(() => {
    injectRunnerStyles()
  }, [])

  useEffect(() => {
    let live = true
    void runtimeAssets().then((value) => {
      if (live) setAssets(value)
    })
    return () => {
      live = false
    }
  }, [])

  const urls = useMemo(
    () => (assets && plan ? packFileUrls(assets.packs, plan.packs, assets.runner) : []),
    [assets, plan],
  )

  useEffect(() => {
    let live = true
    if (urls.length === 0) return
    void isInstalled(urls).then((ready) => {
      if (live) setInstalled(ready)
    })
    return () => {
      live = false
    }
  }, [urls])

  useEffect(
    () => () => {
      clientRef.current?.dispose()
      clientRef.current = null
    },
    [],
  )

  const client = useCallback((): RunnerClient => {
    if (!clientRef.current && assets) clientRef.current = new RunnerClient(assets)
    if (!clientRef.current) throw new RunnerError('unavailable', 'The runner is still starting.')
    return clientRef.current
  }, [assets])

  const describeError = useCallback((error: unknown) => {
    if (error instanceof RunnerError) {
      setFailure({ kind: error.kind, message: error.message, diagnostics: error.diagnostics })
      return
    }
    setFailure({
      kind: 'internal',
      message: error instanceof Error ? error.message : String(error),
      diagnostics: [],
    })
  }, [])

  const ensureRuntime = useCallback(async () => {
    if (!plan || !plan.ready) return
    if (installed) return
    setBusy('downloading')
    setProgress({ loaded: 0, total: plan.bytes })
    await client().warm(
      {
        packs: plan.packs,
        // The worker bundle is fetched by `new Worker`, not by the shim, so the
        // progress denominator is the packs alone.
        totalBytes: plan.packBytes,
        files: assets
          ? Object.values(assets.packs).flatMap((pack) => pack?.files.map((file) => file.path) ?? [])
          : [],
      },
      (loaded, total) => setProgress({ loaded, total }),
    )
    setInstalled(true)
  }, [assets, client, installed, plan])

  const markRunning = useCallback((on: boolean) => {
    runningRef.current = on
  }, [])

  const runProgram = useCallback(async () => {
    if (!plan?.ready || !support.supported || runningRef.current) return
    setFailure(null)
    setSummary(null)
    setOutcome(null)
    markRunning(true)
    try {
      await ensureRuntime()
      setBusy('running')
      const result = await client().run({
        runAs: support.runAs,
        packs: plan.packs,
        totalBytes: plan.packBytes,
        code,
        stdin,
        timeoutMs: CASE_TIMEOUT_MS,
      })
      setOutcome(result)
      if (result.diagnostics.length > 0) {
        setFailure({ kind: 'compile', message: result.diagnostics[0], diagnostics: result.diagnostics })
      }
    } catch (error) {
      describeError(error)
    } finally {
      markRunning(false)
      setBusy('idle')
    }
  }, [client, code, describeError, ensureRuntime, markRunning, plan, stdin, support])

  const runTests = useCallback(async () => {
    if (!plan?.ready || !support.supported || cases.length === 0 || runningRef.current) return
    setFailure(null)
    setOutcome(null)
    setSummary(null)
    markRunning(true)
    try {
      await ensureRuntime()
      setBusy('testing')
      const runner = client()
      const result = await runCases(cases, async (input, { timeoutMs }) => {
        const run = await runner.run({
          runAs: support.runAs,
          packs: plan.packs,
          totalBytes: plan.packBytes,
          code,
          stdin: input,
          timeoutMs,
        })
        return {
          stdout: run.stdout,
          stderr: run.stderr,
          exitCode: run.exitCode,
          diagnostics: run.diagnostics,
        }
      })
      setSummary(result)
      const compileCase = result.results.find((entry) => entry.status === 'error' && entry.diff.length === 0)
      if (compileCase && result.passed === 0 && compileCase.detail) {
        setFailure({ kind: 'compile', message: compileCase.detail.split('\n')[0], diagnostics: compileCase.detail.split('\n') })
      }
    } catch (error) {
      describeError(error)
    } finally {
      markRunning(false)
      setBusy('idle')
    }
  }, [cases, client, code, describeError, ensureRuntime, markRunning, plan, support])

  const stop = useCallback(() => {
    clientRef.current?.stop()
    markRunning(false)
    setBusy('idle')
    setFailure({ kind: 'stopped', message: 'Stopped. The sandbox was killed and nothing is left running.', diagnostics: [] })
  }, [markRunning])

  // ⌘/Ctrl + Enter runs, Escape stops — but only from inside this panel, so the
  // page's own shortcuts (and the code editor's ⌘S) keep working.
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void runProgram()
      return
    }
    if (event.key === 'Escape' && runningRef.current) {
      event.preventDefault()
      stop()
    }
  }

  const copyOutput = async () => {
    const text = [outcome?.stdout ?? '', outcome?.stderr ?? ''].filter(Boolean).join('\n')
    const ok = await copyText(text)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 2500)
  }

  const clearOutput = () => {
    setOutcome(null)
    setSummary(null)
    setFailure(null)
  }

  if (!support.supported) {
    const outbound = outboundFor(language)
    return (
      <section className="run-panel" data-testid="runner-panel" aria-label="Run code">
        <div className="run-unsupported" data-testid="runner-unsupported">
          <div>
            <strong>{support.label} cannot run in this tab</strong>
            <p className="quiet-note">{support.reason}</p>
          </div>
          <div className="inline-actions">
            <Button data-testid="runner-copy-out" onClick={() => void copyText(code)}>
              Copy code
            </Button>
            <a className="btn btn-secondary" href={outbound.href} target="_blank" rel="noopener noreferrer">
              {outbound.label}
            </a>
          </div>
        </div>
      </section>
    )
  }

  const busyLabel =
    busy === 'downloading'
      ? 'Downloading the runtime…'
      : busy === 'running'
        ? 'Running…'
        : busy === 'testing'
          ? 'Running the test cases…'
          : null
  const percent = progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0
  const showDownload = !installed && plan !== null && plan.ready && busy === 'idle' && !outcome && !summary

  return (
    <section
      className="run-panel"
      data-testid="runner-panel"
      aria-label="Run code"
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="run-bar">
        {showDownload ? (
          <Button
            data-testid="runner-download"
            onClick={() => {
              void (cases.length > 0 && autoOpen ? runTests() : runProgram())
            }}
          >
            {plan.label}
          </Button>
        ) : (
          <Button
            data-testid="runner-run-button"
            disabled={!plan?.ready || busy !== 'idle'}
            onClick={() => void runProgram()}
          >
            Run ▸
          </Button>
        )}
        {cases.length > 0 ? (
          <Button
            data-testid="runner-tests-button"
            disabled={!plan?.ready || busy !== 'idle'}
            onClick={() => void runTests()}
          >
            Run tests ▸ {cases.length}
          </Button>
        ) : null}
        {busy !== 'idle' ? (
          <Button variant="danger" data-testid="runner-stop" onClick={stop}>
            Stop
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          data-testid="runner-stdin-toggle"
          aria-expanded={stdinOpen}
          onClick={() => setStdinOpen((open) => !open)}
        >
          stdin
        </Button>
        <span className="run-spacer" />
        {outcome ? (
          <Button size="sm" variant="ghost" data-testid="runner-copy" onClick={() => void copyOutput()}>
            {copied ? 'Copied ✓' : 'Copy output'}
          </Button>
        ) : null}
        {outcome || summary || failure ? (
          <Button size="sm" variant="ghost" data-testid="runner-clear" onClick={clearOutput}>
            Clear
          </Button>
        ) : null}
      </div>

      {stdinOpen ? (
        <>
          <label className="field-label" htmlFor={`runner-stdin-${problemId}`}>
            Standard input (fed to the program, exactly as typed)
          </label>
          <textarea
            id={`runner-stdin-${problemId}`}
            className="run-stdin"
            data-testid="runner-stdin"
            rows={3}
            spellCheck={false}
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
          />
        </>
      ) : null}

      {plan?.unavailable ? (
        <p className="run-note run-note-caution" data-testid="runner-unavailable">
          {plan.unavailable} You can still copy the code into Compiler Explorer.
        </p>
      ) : null}

      {!storageAvailable() ? (
        <p className="run-note run-note-caution">This browser cannot keep the runtime offline (Cache Storage is off).</p>
      ) : null}

      {busy === 'downloading' ? (
        <div className="run-progress" data-testid="runner-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="run-progress-track">
            <div className="run-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="quiet-note num">
            {formatBytes(progress.loaded)} of {formatBytes(progress.total || plan?.bytes || 0)} · {percent}% · once, then it works offline
          </p>
        </div>
      ) : null}

      <div className="run-status" data-testid="runner-status" aria-live="polite">
        {busyLabel ?? (failure && failure.kind === 'stopped' ? failure.message : null)}
        {!busyLabel && outcome && outcome.diagnostics.length === 0 ? (
          <span className="num" data-testid="runner-facts">
            {runLine(outcome)}
          </span>
        ) : null}
      </div>

      {failure && failure.kind !== 'stopped' ? (
        <div className="run-failure" data-testid="runner-error" role="alert">
          <p>
            <Tag tone={failure.kind === 'compile' ? 'caution' : 'danger'}>
              {failure.kind === 'compile' ? 'Compile error' : failure.kind === 'timeout' ? 'Stopped' : 'Runner'}
            </Tag>{' '}
            {failure.message}
          </p>
          {failure.diagnostics.length > 1 ? (
            <p className="quiet-note">{failure.diagnostics.length - 1} more line(s) in the compiler output.</p>
          ) : null}
        </div>
      ) : null}

      <div className="run-output-wrap" aria-busy={busy === 'running' || busy === 'testing'}>
        <pre
          className="run-output"
          data-testid="runner-output"
          tabIndex={0}
          aria-label="Program output"
          ref={outputRef}
        >
          {outcome?.stdout ?? ''}
          {outcome && outcome.stdout === '' && (outcome.stderr ?? '') === '' && outcome.diagnostics.length === 0
            ? '(no output)'
            : ''}
          {outcome && outcome.stderr ? <span className="run-stderr">{outcome.stderr}</span> : null}
        </pre>
      </div>

      {summary ? (
        <div className="run-cases" data-testid="runner-cases">
          <p className={`run-cases-summary tone-${summary.tone}`} data-testid="runner-cases-summary" aria-live="polite">
            {summary.text}
          </p>
          <ul className="run-case-list">
            {summary.results.map((result) => (
              <li key={result.index} data-testid={`runner-case-${result.index}`} className={`run-case is-${result.status}`}>
                <span className="run-case-mark" aria-hidden="true">
                  {result.status === 'passed' ? '✓' : result.status === 'skipped' ? '·' : '✗'}
                </span>
                <span className="run-case-label">
                  Case {result.index}
                  {result.status === 'passed' ? ' passed' : ''}
                </span>
                {result.detail ? <p className="quiet-note">{result.detail}</p> : null}
                {result.diff.length > 0 ? (
                  <pre className="run-diff" data-testid={`runner-diff-${result.index}`}>
                    {result.diff.join('\n')}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {compact ? null : (
        <p className="fine-print">
          Runs locally in a sandboxed worker — nothing is uploaded, nothing is saved.{' '}
          {plan?.packs.length ? `${plan.packs.map((pack) => PACK_LICENSES[pack]).join(' · ')}.` : ''}
        </p>
      )}
    </section>
  )
}
