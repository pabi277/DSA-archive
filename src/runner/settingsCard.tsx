/**
 * Phase v2-07 — the honest storage card in Settings.
 *
 * A learner who pressed "Download C and C++ compiler · 29.0 MB" deserves to see
 * that 29 MB somewhere, to be told it makes runs work offline, and to have one
 * button that removes exactly it. Nothing else on the device is touched: the
 * clear deletes `dsa-archive-runtime-v1` and no other cache.
 *
 * Lazy chunk: importing the manifests into the shell would have cost the app
 * ~1 kB gzip of a 2 kB budget, for a card most visits never scroll to.
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Tag } from '../design/primitives'
import { PACK_LABELS, PACK_LICENSES, type PackId } from './languages'
import { formatBytes } from './packs'
import {
  clearRuntimeCache,
  installedRuntimeBytes,
  isInstalled,
  loadRuntimeAssets,
  packFileUrls,
  type RuntimeAssets,
} from './runtimeStore'

const PACK_IDS: PackId[] = ['cpp', 'python']

export default function RunnerSettingsCard() {
  const [assets, setAssets] = useState<RuntimeAssets | null>(null)
  const [installed, setInstalled] = useState<Record<string, boolean>>({})
  const [bytes, setBytes] = useState(0)
  const [cleared, setCleared] = useState(false)

  const refresh = useCallback(async () => {
    const loaded = await loadRuntimeAssets()
    setAssets(loaded)
    const state: Record<string, boolean> = {}
    for (const id of PACK_IDS) {
      state[id] = await isInstalled(packFileUrls(loaded.packs, [id], null))
    }
    state.runner = await isInstalled(packFileUrls(loaded.packs, [], loaded.runner))
    setInstalled(state)
    setBytes(await installedRuntimeBytes(loaded))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const clear = async () => {
    const removed = await clearRuntimeCache()
    setCleared(removed)
    await refresh()
    const { forgetRuntimeAssets } = await import('./runPanel')
    forgetRuntimeAssets()
  }

  const runnerInstalled = installed.runner === true
  const anything = bytes > 0 || runnerInstalled

  return (
    <Card title="Local runner" data-testid="runner-settings">
      <p className="quiet-note">
        Code runs in a sandboxed worker in this tab — no server, no judge, nothing uploaded. The
        toolchains are downloaded once, on demand, and kept on this device so runs work offline.
      </p>

      <div className="setting-row">
        <div>
          <strong>C and C++ compiler</strong>
          <p className="quiet-note">
            {PACK_LABELS.cpp} · {formatBytes(assets?.packs.cpp?.bytes ?? 0)} · {PACK_LICENSES.cpp}
          </p>
        </div>
        <Tag tone={installed.cpp ? 'success' : 'neutral'} data-testid="runner-pack-cpp">
          {installed.cpp ? 'Cached' : 'Not downloaded'}
        </Tag>
      </div>

      <div className="setting-row">
        <div>
          <strong>Python runtime</strong>
          <p className="quiet-note">
            {PACK_LABELS.python} · {formatBytes(assets?.packs.python?.bytes ?? 0)} · {PACK_LICENSES.python}
          </p>
        </div>
        <Tag tone={installed.python ? 'success' : 'neutral'} data-testid="runner-pack-python">
          {installed.python ? 'Cached' : 'Not downloaded'}
        </Tag>
      </div>

      <div className="setting-row">
        <div>
          <strong>On this device</strong>
          <p className="quiet-note num" data-testid="runner-cache-size">
            {anything ? `${formatBytes(bytes)} cached · runs work offline` : 'Nothing cached yet'}
          </p>
        </div>
        <Button
          data-testid="runner-clear-cache"
          disabled={!anything}
          onClick={() => {
            void clear()
          }}
        >
          Clear
        </Button>
      </div>

      {cleared ? (
        <p className="quiet-note" role="status" data-testid="runner-cache-cleared">
          Runner cache cleared. The next Run downloads again.
        </p>
      ) : null}

      <p className="fine-print">
        Java, C#, Go, Rust and TypeScript cannot run here; those rows keep their copy-out link.
      </p>
    </Card>
  )
}
