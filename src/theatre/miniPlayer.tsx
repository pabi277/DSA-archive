/**
 * Phase v2-06 — the mini player.
 *
 * One instance, mounted by the shell (`app.tsx`), so it survives every route
 * change: leaving `#/problem/<id>` does not stop the video. It is a **region**,
 * not a dialog — no focus trap, and its buttons come after the main content in
 * the tab order. Close is the only thing that destroys the player.
 *
 * On desktop it docks bottom-right; on a phone it sits above the bottom bar
 * (`--bottom-bar-height`). It never covers the player's own controls: the frame
 * is 16:9 at the top of the card and our buttons are beneath it.
 */
import { useEffect, useRef, useState } from 'react'
import { catalogue } from '../catalogue'
import { IconClose, IconExternal } from '../design/icons'
import { formatClock, parseVideoId, watchUrl } from './video'
import {
  adoptPlayer,
  currentPlayer,
  destroyPlayer,
  pause,
  pollPlayer,
  subscribePlayer,
  togglePlay,
  type PlayerSnapshot,
} from './player'
import { clampRate, rateLabel } from './speedMemory'

export function MiniPlayer({
  onOpen,
}: {
  /** `↗` expands back to the stage for this problem. */
  onOpen: (problemId: string) => void
}) {
  const holderRef = useRef<HTMLDivElement>(null)
  const [snapshot, setSnapshot] = useState<PlayerSnapshot | null>(null)
  /** Render the dock as soon as a player exists off-stage; the frame move
   *  happens a tick later, once the holder div exists. */
  const [claimed, setClaimed] = useState(false)
  const [closed, setClosed] = useState(false)

  // The mini player only claims the frame when the stage is not showing it.
  useEffect(() => {
    if (closed) {
      setClaimed(false)
      return
    }
    const sync = () => {
      const current = currentPlayer()
      const shouldShow = Boolean(current && current.slot !== 'stage')
      setClaimed(shouldShow)
      if (!shouldShow) return
      if (holderRef.current) adoptPlayer(holderRef.current, 'mini')
      const next = pollPlayer()
      if (next) setSnapshot(next)
    }
    sync()
    const unsubscribe = subscribePlayer(setSnapshot)
    const timer = window.setInterval(sync, 500)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [closed])

  useEffect(() => {
    if (!claimed || !holderRef.current) return
    adoptPlayer(holderRef.current, 'mini')
  }, [claimed])

  if (!claimed || !snapshot || closed) return null
  const problemId = videoProblemId(snapshot.videoId) ?? ''
  const problemTitle = problemTitleOf(problemId)
  const playing = snapshot.state === 1

  return (
    <aside className="mini-player" aria-label="Mini video player" data-testid="mini-player" aria-live="off">
      <div className="mini-holder" ref={holderRef} data-testid="mini-holder" />
      <div className="mini-bar">
        <span className="mini-copy">
          <strong className="mini-title" data-testid="mini-title">
            {problemTitle}
          </strong>
          <span className="mini-meta num">
            {formatClock(snapshot.currentTime)}
            {snapshot.duration > 0 ? ` / ${formatClock(snapshot.duration)}` : ''} · {rateLabel(clampRate(snapshot.rate))}
          </span>
        </span>
        <button
          type="button"
          className="theatre-btn"
          aria-label={playing ? 'Pause the mini player' : 'Play in the mini player'}
          data-testid="mini-toggle"
          onClick={() => togglePlay()}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        {problemId ? (
          <button
            type="button"
            className="theatre-btn"
            aria-label="Open this video on its problem page"
            data-testid="mini-expand"
            onClick={() => onOpen(problemId)}
          >
            ↗
          </button>
        ) : null}
        <a
          className="theatre-btn"
          href={watchUrl(snapshot.videoId)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open this video on YouTube in a new tab"
          data-testid="mini-youtube"
        >
          <IconExternal size={13} />
        </a>
        <button
          type="button"
          className="theatre-btn theatre-btn-close"
          aria-label="Close the mini player and stop the video"
          data-testid="mini-close"
          onClick={() => {
            pause()
            destroyPlayer()
            setClosed(true)
          }}
        >
          <IconClose size={14} />
        </button>
      </div>
    </aside>
  )
}

/**
 * The catalogue id whose `links.video` produced this video id (369 links, 298
 * unique ids). Built once and cached; a video can back several rows, so the
 * first row wins — the mini player only needs a title and an expand target.
 */
let index: Map<string, { problemId: string; title: string }> | null = null

function videoIndex(): Map<string, { problemId: string; title: string }> {
  if (index) return index
  index = new Map()
  for (const topic of catalogue.topics) {
    for (const subtopic of topic.subtopics) {
      for (const problem of subtopic.problems) {
        const id = parseVideoId(problem.links.video)
        if (id && !index.has(id)) index.set(id, { problemId: problem.id, title: problem.title })
      }
    }
  }
  return index
}

function videoProblemId(videoId: string): string | null {
  return videoIndex().get(videoId)?.problemId ?? null
}

function problemTitleOf(problemId: string): string {
  if (!problemId) return 'Video'
  for (const topic of catalogue.topics) {
    for (const subtopic of topic.subtopics) {
      for (const problem of subtopic.problems) {
        if (problem.id === problemId) return problem.title
      }
    }
  }
  return 'Video'
}
