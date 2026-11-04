/**
 * Phase v2-06 — official YouTube IFrame Player API controller.
 *
 * This module is the *only* place that talks to YouTube's player. It follows
 * the documented API (https://developers.google.com/youtube/iframe_api_reference)
 * and nothing else:
 *
 *   · `https://www.youtube.com/iframe_api` is injected **once**, lazily, and only
 *     when a player is actually requested — never from the shell bundle, never
 *     precached by the Service Worker, never fetched on a route without video.
 *   · The player is embedded through `https://www.youtube-nocookie.com/embed/<id>`
 *     with `enablejsapi=1`, `origin`, `rel=0`, `iv_load_policy=3`,
 *     `playsinline=1`, `cc_load_policy=1` and `host` (see `embedUrl`).
 *   · We never modify, overlay or block anything inside the frame (ToS §4.13).
 *     Our controls call the documented API methods; nothing is injected into
 *     the iframe's document.
 *   · Errors `2/5/100/101/150` are surfaced to the caller, which turns them into
 *     the dead-link card with an `Open on YouTube` fallback.
 *
 * **One player, one instance.** The theatre stage and the mini player are two
 * *views* of the same controller: mounting the stage adopts the live player,
 * and leaving the route hands it to the mini player instead of destroying it.
 * `acquirePlayer`/`releaseSlot` keep that invariant under React's mount order.
 */

const API_SRC = 'https://www.youtube.com/iframe_api'
export const PLAYER_ELEMENT_ID = 'dsa-theatre-frame'

export type PlayerSlot = 'stage' | 'mini'

type YTPlayerLike = {
  playVideo?: () => void
  pauseVideo?: () => void
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void
  setPlaybackRate?: (rate: number) => void
  getAvailablePlaybackRates?: () => number[]
  setVolume?: (volume: number) => void
  mute?: () => void
  unMute?: () => void
  setLoop?: (loop: boolean) => void
  getCurrentTime?: () => number
  getDuration?: () => number
  getPlayerState?: () => number
  /** Documented caption module (IFrame API reference, "Setting the caption options"). */
  loadModule?: (module: string) => void
  unloadModule?: (module: string) => void
  setOption?: (module: string, option: string, value: unknown) => void
  /** Documented: returns the iframe node the player owns. */
  getIframe?: () => HTMLElement | null
  destroy?: () => void
}

type YTNamespace = {
  Player: new (element: HTMLElement | string, options: Record<string, unknown>) => YTPlayerLike
}

declare global {
  interface Window {
    YT?: YTNamespace & { loaded?: number; loading?: number }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | null = null

/**
 * Resolve the IFrame API namespace, injecting the script at most once. A
 * previous global `onYouTubeIframeAPIReady` installed by anything else is
 * chained, never replaced.
 */
export function loadIframeApi(doc: Document = document, win: Window = window): Promise<YTNamespace> {
  if (win.YT?.Player) return Promise.resolve(win.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const existing = win.onYouTubeIframeAPIReady
    win.onYouTubeIframeAPIReady = () => {
      existing?.()
      if (win.YT?.Player) resolve(win.YT)
      else reject(new Error('The YouTube player script loaded without exposing a player.'))
    }
    const script = doc.createElement('script')
    script.src = API_SRC
    script.async = true
    script.dataset.dsaTheatre = 'iframe-api'
    script.addEventListener('error', () => {
      apiPromise = null
      script.remove()
      win.onYouTubeIframeAPIReady = existing
      reject(new Error('The YouTube player could not be downloaded.'))
    })
    doc.head.append(script)
    // If the script was already on the page, the global callback above still fires.
  })
  return apiPromise
}

export function resetIframeApiForTests() {
  apiPromise = null
}

export type PlayerSnapshot = {
  /** Which surface currently owns the iframe. */
  slot: PlayerSlot
  videoId: string
  state: number | null
  currentTime: number
  duration: number
  rate: number
  error: number | null
  ready: boolean
}

export type PlayerListener = (snapshot: PlayerSnapshot) => void

type Owned = {
  player: YTPlayerLike
  /** The div the player built its iframe in. Move *this*, never the iframe:
   *  an iframe re-parented directly reloads and playback dies. */
  wrapper: HTMLElement | null
  slot: PlayerSlot
  videoId: string
  rate: number
  state: number | null
  error: number | null
  ready: boolean
  /** Pending start seconds applied on ready, from `?t=` deep links. */
  pendingStart: number
  /** Latest known position, polled from `getCurrentTime()`. */
  currentTime: number
  duration: number
  /** Cleared when the mini player's close button runs. */
  listeners: Set<PlayerListener>
}

let owned: Owned | null = null
let mountToken = 0

/** The IFrame API's `Player` is not a Node; only `getIframe()` is. */
function frameOf(player: YTPlayerLike | null): HTMLElement | null {
  try {
    return player?.getIframe?.() ?? null
  } catch {
    return null
  }
}

function snapshotOf(entry: Owned): PlayerSnapshot {
  return {
    slot: entry.slot,
    videoId: entry.videoId,
    state: entry.state,
    currentTime: entry.currentTime,
    duration: entry.duration,
    rate: entry.rate,
    error: entry.error,
    ready: entry.ready,
  }
}

function emit(entry: Owned, patch: Partial<Omit<PlayerSnapshot, 'slot' | 'videoId'>> = {}) {
  if (patch.state !== undefined) entry.state = patch.state
  if (patch.currentTime !== undefined) entry.currentTime = patch.currentTime
  if (patch.duration !== undefined) entry.duration = patch.duration
  if (patch.error !== undefined) entry.error = patch.error
  if (patch.ready !== undefined) entry.ready = patch.ready
  if (patch.rate !== undefined) entry.rate = patch.rate
  const snapshot = snapshotOf(entry)
  for (const listener of entry.listeners) listener(snapshot)
}

/** Poll the documented getters; the API has no time-update event. */
export function pollPlayer(): PlayerSnapshot | null {
  if (!owned) return null
  const current = owned.player.getCurrentTime?.()
  const duration = owned.player.getDuration?.()
  const state = owned.player.getPlayerState?.()
  emit(owned, {
    ...(typeof current === 'number' ? { currentTime: current } : {}),
    ...(typeof duration === 'number' ? { duration } : {}),
    ...(typeof state === 'number' ? { state } : {}),
  })
  return snapshotOf(owned)
}

export function currentPlayer(): PlayerSnapshot | null {
  return owned ? snapshotOf(owned) : null
}

/**
 * Create or adopt the single player. Called by whichever view mounts with a
 * host element; the existing player is *moved* into the new host (same iframe,
 * same position) so navigation never restarts the video.
 */
export async function acquirePlayer(options: {
  videoId: string
  host: HTMLElement
  slot: PlayerSlot
  rate: number
  start: number
  origin?: string
  onReady?: () => void
}): Promise<PlayerSnapshot | null> {
  const token = ++mountToken
  const YT = await loadIframeApi(undefined, window)
  if (token !== mountToken) return currentPlayer() // a newer mount won

  if (owned) {
    const previous = owned
    if (previous.videoId === options.videoId) {
      previous.slot = options.slot
      if (previous.wrapper) options.host.replaceChildren(previous.wrapper)
      else {
        const frame = frameOf(previous.player)
        if (frame) options.host.replaceChildren(frame)
      }
      applyRate(previous, options.rate)
      emit(previous, { rate: previous.rate, state: previous.state })
      return snapshotOf(previous)
    }
    // A different video: destroy the old frame first (one instance, always).
    previous.listeners.clear()
    previous.player.destroy?.()
    owned = null
  }

  const mountId = `dsa-theatre-frame-${mountToken}`
  const host = document.createElement('div')
  host.id = mountId
  options.host.replaceChildren(host)

  return await new Promise<PlayerSnapshot | null>((resolve) => {
    const entry: Owned = {
      player: null as unknown as YTPlayerLike,
      wrapper: host,
      slot: options.slot,
      videoId: options.videoId,
      rate: options.rate,
      state: null,
      error: null,
      ready: false,
      pendingStart: options.start,
      currentTime: options.start,
      duration: 0,
      listeners: new Set(),
    }

    const player = new YT.Player(host, {
      videoId: options.videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        enablejsapi: 1,
        origin: options.origin ?? window.location.origin,
        rel: 0,
        iv_load_policy: 3,
        playsinline: 1,
        cc_load_policy: 1,
        start: Math.floor(options.start || 0),
        host: 'https://www.youtube-nocookie.com',
      },
      events: {
        onReady: () => {
          entry.ready = true
          if (entry.pendingStart > 0) {
            entry.player.seekTo?.(entry.pendingStart, true)
            entry.pendingStart = 0
          }
          const duration = entry.player.getDuration?.()
          if (typeof duration === 'number') entry.duration = duration
          applyRate(entry, entry.rate)
          emit(entry)
          options.onReady?.()
          resolve(snapshotOf(entry))
        },
        onStateChange: (event: { data: number }) => {
          emit(entry, { state: event.data })
          const duration = entry.player.getDuration?.()
          if (typeof duration === 'number' && duration > 0) emit(entry, { duration })
        },
        onError: (event: { data: number }) => {
          emit(entry, { error: event.data })
          options.onReady?.()
          resolve(snapshotOf(entry))
        },
      },
    })
    entry.player = player
    owned = entry
  })
}

/** Re-parent the live iframe into another holder without touching playback. */
export function adoptPlayer(host: HTMLElement, slot: PlayerSlot): boolean {
  if (!owned) return false
  // Before `onReady` the wrapper exists but is empty; moving it is still safe and
  // the player fills it in place. Only a destroyed player has nothing to move.
  const movable = owned.wrapper ?? frameOf(owned.player)
  if (!movable) return false
  owned.slot = slot
  host.replaceChildren(movable)
  emit(owned, {})
  return true
}

/** Transfer ownership to a view that will poll/read snapshots. */
export function subscribePlayer(listener: PlayerListener): () => void {
  if (!owned) return () => {}
  const entry = owned
  entry.listeners.add(listener)
  listener(snapshotOf(entry))
  return () => {
    entry.listeners.delete(listener)
  }
}

/** Where the live iframe currently lives — the mini player's dock marker. */
export function playerSlot(): PlayerSlot | null {
  return owned?.slot ?? null
}

/**
 * Hand the player to the mini player — or destroy it when the caller closes it.
 * `slot` is cleared so a later stage mount adopts instead of re-creating.
 */
export function releaseSlot(slot: PlayerSlot, destroy = false): boolean {
  if (!owned || owned.slot !== slot) return false
  if (destroy) {
    destroyPlayer()
    return true
  }
  // Keep the listeners: the mini player is already subscribed and must see the
  // slot change without re-subscribing.
  owned.slot = 'mini'
  return true
}

export function destroyPlayer() {
  if (!owned) return
  owned.listeners.clear()
  owned.player.destroy?.()
  owned = null
  const stale = document.getElementById(PLAYER_ELEMENT_ID)
  stale?.remove()
}

export function resetTheatrePlayerForTests() {
  destroyPlayer()
  mountToken = 0
  apiPromise = null
}

/* --- documented control surface ------------------------------------------- */

/** The rate is applied on every adoption, so a mini→stage move keeps the speed. */
function applyRate(entry: Owned, rate: number) {
  entry.rate = rate
  try {
    entry.player.setPlaybackRate?.(rate)
  } catch {
    // Some videos disallow a rate; the player keeps its own value.
  }
  emit(entry, { rate: entry.rate })
}

export function play() {
  if (!owned) return
  owned.player.playVideo?.()
}

export function pause() {
  if (!owned) return
  owned.player.pauseVideo?.()
}

export function togglePlay() {
  if (!owned) return
  const state = owned.player.getPlayerState?.()
  if (typeof state === 'number' && state === 1) pause()
  else play()
}

/** Clamp a seek to the known duration when it exists. */
export function seek(seconds: number) {
  if (!owned) return
  const duration = owned.duration || 0
  const target = Math.max(0, duration > 0 ? Math.min(seconds, duration - 1) : seconds)
  owned.player.seekTo?.(target, true)
  emit(owned, { currentTime: target })
}

export function skip(seconds: number) {
  if (!owned) return
  const base = owned.player.getCurrentTime?.() ?? owned.currentTime
  seek((typeof base === 'number' ? base : 0) + seconds)
}

export function setRate(rate: number) {
  if (!owned) return
  applyRate(owned, rate)
}

/**
 * Captions through the documented `loadModule` + `unloadModule`/`setOption`
 * calls. The module name and option are YouTube's, not ours; if the player puts
 * CC under its own control (`getOption('cc') === undefined`) we quietly skip
 * rather than fight it.
 */
export function setCaptionsEnabled(on: boolean) {
  if (!owned) return
  try {
    if (on) {
      owned.player.loadModule?.('captions')
      owned.player.setOption?.('captions', 'track', {})
    } else {
      owned.player.unloadModule?.('captions')
    }
  } catch {
    // A video without caption tracks keeps playing; nothing to report.
  }
}

/** `c` — flip captions and hand back the new state for the button label. */
export function toggleCaptions(current: boolean): boolean {
  const next = !current
  setCaptionsEnabled(next)
  return next
}

export function muteVideo(muted: boolean) {
  if (!owned) return
  if (muted) owned.player.mute?.()
  else owned.player.unMute?.()
}
