/**
 * Phase v2-06 — the stage: YouTube's official player inside our chrome.
 *
 * The iframe is created by `player.ts` (lazy `iframe_api` load, documented
 * parameters only). Everything drawn here is *outside* the frame: our control
 * bar beneath it and the stamps list beside it. Nothing is ever placed over the
 * player, and no part of YouTube's UI is hidden or restyled (ToS §4.13).
 *
 * The stage renders in every non-embedding state too — offline, dead link,
 * player error, no video — because a learner who opened a problem page still
 * gets the statement, the code panel and their stamps.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Tag } from '../design/primitives'
import { IconArrowRight, IconClock, IconExternal, IconPlay } from '../design/icons'
import {
  embedFailureMessage,
  formatClock,
  isDeadLinkError,
  isWatched,
  watchUrl,
  watchedPercent,
  type WatchFlag,
} from './video'
import { creditLine, mediaStatus, videoTitle, type MediaEntry } from './oembed'
import {
  acquirePlayer,
  pollPlayer,
  releaseSlot,
  setRate,
  skip,
  subscribePlayer,
  toggleCaptions,
  togglePlay,
  type PlayerSnapshot,
} from './player'
import { type Moment } from './stamps'
import { PLAYBACK_RATES, clampRate, rateLabel, type PlaybackRate } from './speedMemory'

export type StageState = 'loading' | 'ready' | 'offline' | 'dead' | 'error' | 'api-failed' | 'no-video'

const CLOCK_TICK_MS = 500

export function TheatreStage({
  problemTitle,
  videoId,
  media,
  stamps,
  rate,
  topicLabel,
  nextLine,
  onNext,
  onRate,
  onStamp,
  onSkipStamp,
  onWatched,
  onDeadLink,
  onNextProblem,
  online,
  watchFlag,
  children,
}: {
  problemTitle: string
  videoId: string | null
  media: MediaEntry | null
  stamps: Moment[]
  rate: PlaybackRate
  topicLabel: string
  nextLine: string | null
  onNext: () => void
  onRate: (rate: PlaybackRate) => void
  onStamp: (at: number) => void
  onSkipStamp: () => void
  onWatched: (videoId: string, percent: number) => void
  onDeadLink: (videoId: string, code: number) => void
  /** `n` — the same target as the end-of-video offer (null when nothing is queued). */
  onNextProblem: () => void
  online: boolean
  watchFlag: WatchFlag | null
  children: ReactNode
}) {
  const holderRef = useRef<HTMLDivElement>(null)
  const [snapshot, setSnapshot] = useState<PlayerSnapshot | null>(null)
  const [state, setState] = useState<StageState>(() => {
    if (!videoId) return 'no-video'
    if (mediaStatus(media) === 'dead') return 'dead'
    if (!online) return 'offline'
    return 'loading'
  })
  const [captions, setCaptions] = useState(true)
  const reportedRef = useRef(new Set<string>())
  const callbacks = useRef({ onWatched, onDeadLink, onStamp, onNextProblem })
  callbacks.current = { onWatched, onDeadLink, onStamp, onNextProblem }
  // Read by the key handler, which is installed once (a listener that closed
  // over the first render would stamp 0:00 forever).
  const captionsRef = useRef(true)
  const liveRef = useRef(0)
  liveRef.current = snapshot?.currentTime ?? 0
  const embeddableRef = useRef(true)

  useEffect(() => {
    if (!videoId) {
      setState('no-video')
      return
    }
    if (mediaStatus(media) === 'dead') {
      setState('dead')
      return
    }
    if (!online) {
      setState('offline')
      return
    }
    const holder = holderRef.current
    if (!holder) return
    let cancelled = false
    setState('loading')
    acquirePlayer({
      videoId,
      host: holder,
      slot: 'stage',
      rate,
      start: startFromLocation(),
    })
      .then((next) => {
        if (cancelled) return
        if (next?.error != null) {
          setSnapshot(next)
          setState('error')
          return
        }
        setSnapshot(next)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('api-failed')
      })
    return () => {
      cancelled = true
      // Never destroy the frame on unmount: the mini player adopts it when the
      // route changes, so the video keeps playing. Hand the slot over *without*
      // pausing (a paused video would make the dock look broken) and without
      // clearing listeners the dock still needs.
      releaseSlot('stage')
    }
    // The frame is built once per video and per connectivity change; a rate
    // change must never rebuild it (that would restart playback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, online])

  useEffect(() => {
    const unsubscribe = subscribePlayer(setSnapshot)
    const tick = () => {
      const next = pollPlayer()
      if (!next) return
      setSnapshot(next)
      if (!videoId) return
      if (next.error != null) {
        setState('error')
        const key = `${videoId}:error`
        if (!reportedRef.current.has(key)) {
          reportedRef.current.add(key)
          if (isDeadLinkError(next.error)) callbacks.current.onDeadLink(videoId, next.error)
        }
      }
      if (next.duration > 0 && isWatched(next.currentTime, next.duration)) {
        const key = `${videoId}:watched`
        if (!reportedRef.current.has(key)) {
          reportedRef.current.add(key)
          callbacks.current.onWatched(videoId, watchedPercent(next.currentTime, next.duration))
        }
      }
    }
    const timer = window.setInterval(tick, CLOCK_TICK_MS)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [videoId])

  // The remembered per-topic speed follows the learner between videos.
  useEffect(() => {
    setRate(rate)
  }, [rate])

  /**
   * The theatre keys from the phase contract: `space`/`k` play-pause, `←`/`→`
   * ±10 s, `f` fill-screen, `c` captions, `s` stamp, `n` next problem.
   *
   * Two rules keep them from stealing keys the rest of the shell owns: they only
   * fire while the stage is on screen, and never while the learner is typing
   * (a stamp draft, the code editor) or pressing a browser/OS combination.
   */
  useEffect(() => {
    if (!embeddableRef.current) return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (document.querySelector('[aria-modal="true"], [role="dialog"]')) return
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      if (key === ' ' || key === 'k') {
        event.preventDefault()
        togglePlay()
      } else if (key === 'ArrowLeft') {
        event.preventDefault()
        skip(-10)
      } else if (key === 'ArrowRight') {
        event.preventDefault()
        skip(10)
      } else if (key === 'c') {
        event.preventDefault()
        // `c` flips captions; the ref is what the once-installed listener reads.
        captionsRef.current = toggleCaptions(captionsRef.current)
        setCaptions(captionsRef.current)
      } else if (key === 's') {
        event.preventDefault()
        callbacks.current.onStamp(liveRef.current)
      } else if (key === 'n') {
        event.preventDefault()
        callbacks.current.onNextProblem()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const current = snapshot?.currentTime ?? 0
  const duration = snapshot?.duration ?? 0
  const playing = snapshot?.state === 1
  const watched = watchedPercent(current, duration)
  const title = videoTitle(media, problemTitle)
  const embeddable = state === 'ready' || state === 'loading'
  embeddableRef.current = embeddable

  return (
    <section className="theatre-stage" aria-label={`Video for ${problemTitle}`} data-testid="theatre-stage">
      <div
        className={`theatre-frame${embeddable ? '' : ' is-placeholder'}`}
        data-testid="theatre-frame"
        data-state={state}
        ref={holderRef}
      >
        {!embeddable ? (
          <div className="theatre-placeholder" data-testid="theatre-placeholder">
            <Tag tone={state === 'dead' || state === 'error' ? 'caution' : 'neutral'}>
              {state === 'offline'
                ? 'Offline'
                : state === 'dead'
                  ? 'Unavailable'
                  : state === 'error'
                    ? 'Cannot embed'
                    : state === 'api-failed'
                      ? 'Player blocked'
                      : state === 'no-video'
                        ? 'No video'
                        : 'Loading'}
            </Tag>
            <p className="theatre-placeholder-title">{title}</p>
            <p className="quiet-note">
              {state === 'offline'
                ? 'The page still works offline — statement, hint, stamps and code. Watch it on YouTube when you are back online.'
                : state === 'no-video'
                  ? 'This row is reached by reading and solving; its ranked sources are below.'
                  : state === 'api-failed'
                    ? 'The official player script could not be downloaded (a blocker, or no network).'
                    : state === 'error'
                      ? embedFailureMessage(snapshot?.error)
                      : 'The source marks this video as unavailable.'}
            </p>
            {state === 'dead' || state === 'error' || state === 'api-failed' || state === 'offline' ? (
              <a
                className="btn btn-secondary"
                href={videoId ? watchUrl(videoId) : 'https://www.youtube.com/'}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="theatre-watch-fallback"
              >
                <IconExternal size={14} /> Open on YouTube
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {embeddable ? (
        <>
          <div className="theatre-controls" role="toolbar" aria-label="Video controls" data-testid="theatre-controls">
            <button
              type="button"
              className="theatre-btn theatre-btn-play"
              aria-label={playing ? 'Pause the video' : 'Play the video'}
              data-testid="theatre-toggle"
              onClick={() => togglePlay()}
            >
              {playing ? '❚❚' : <IconPlay size={15} />}
            </button>
            <button type="button" className="theatre-btn num" aria-label="−10s, back ten seconds" data-testid="theatre-back" onClick={() => skip(-10)}>
              −10s
            </button>
            <button type="button" className="theatre-btn num" aria-label="+10s, forward ten seconds" data-testid="theatre-forward" onClick={() => skip(10)}>
              +10s
            </button>
            <span className="theatre-clock num" data-testid="theatre-clock">
              {formatClock(current)}
              <span className="theatre-clock-of"> / {duration > 0 ? formatClock(duration) : '—'}</span>
            </span>
            <label className="theatre-speed">
              <span className="visually-hidden">Playback speed, remembered for {topicLabel}</span>
              <select
                className="theatre-select num"
                value={rate}
                data-testid="theatre-speed"
                onChange={(event) => onRate(clampRate(Number(event.currentTarget.value)))}
              >
                {PLAYBACK_RATES.map((value) => (
                  <option key={value} value={value}>
                    {rateLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="theatre-btn"
              aria-label={`Stamp — ${formatClock(current)}, ${stamps.length} of 30 used`}
              data-testid="theatre-stamp"
              onClick={() => onStamp(current)}
            >
              <IconClock size={14} /> Stamp
            </button>
            <button
              type="button"
              className="theatre-btn"
              aria-pressed={captions}
              aria-label={`CC — captions ${captions ? 'on' : 'off'}`}

              data-testid="theatre-captions"
              onClick={() => {
                captionsRef.current = toggleCaptions(captionsRef.current)
                setCaptions(captionsRef.current)
              }}
            >
              CC
            </button>
            <span className="theatre-watched num" data-testid="theatre-watched">
              {watched > 0 ? `${watched}% seen` : '0% seen'}
              {watchFlag ? ' · watched' : ''}
            </span>
          </div>

          <p className="theatre-credit quiet-note" data-testid="theatre-credit">
            {creditLine(media)}
            {media?.fetched ? ` · metadata checked ${media.fetched}` : ''}
            {' · captions on by default · ads are your browser’s business, we never touch the player'}
          </p>
        </>
      ) : null}

      {children}

      <div className="theatre-next-row">
        {nextLine ? (
          <Button data-testid="theatre-next" onClick={onNext}>
            <IconArrowRight size={14} /> {nextLine}
          </Button>
        ) : (
          <span className="quiet-note">No next row queued yet — add one from Today and it appears here.</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          data-testid="theatre-stamp-seek"
          disabled={stamps.length === 0}
          onClick={onSkipStamp}
        >
          Skip to next stamp
        </Button>
      </div>
      <p className="visually-hidden" data-testid="theatre-stamp-count">
        {stamps.length} stamp{stamps.length === 1 ? '' : 's'} on this video
      </p>
    </section>
  )
}

/** `?t=754` deep links start the player at that second. */
function startFromLocation(): number {
  if (typeof window === 'undefined') return 0
  const match = window.location.hash.match(/[?&]t=(\d{1,5})/)
  return match ? Math.min(Number(match[1]), 86_400) : 0
}
