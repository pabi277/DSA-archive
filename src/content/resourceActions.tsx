/**
 * Ranked resource actions for one problem. Publisher names are always visible;
 * the top-ranked resource is the only primary outward action. `More sources`
 * opens a bundled list (no network, no modal dependency), and every outbound
 * link keeps `rel="noopener noreferrer"`.
 */
import { useState, type MouseEvent } from 'react'
import type { Problem, Resource } from '../catalogue'
import { Button, Empty, Tag } from '../design/primitives'
import { contentCoverage } from './load'
import {
  allSources,
  primaryResource,
  publisherName,
  rankedResources,
  resourceActionLabel,
  resourceFor,
  TYPE_LABELS,
} from './resources'

const AS_OF = contentCoverage().asOf

function freshVerified(verified: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(verified) || !/^\d{4}-\d{2}-\d{2}$/.test(AS_OF)) return false
  const checked = Date.parse(`${verified}T00:00:00Z`)
  const asOf = Date.parse(`${AS_OF}T00:00:00Z`)
  return Number.isFinite(checked) && Number.isFinite(asOf) && checked + 180 * 86_400_000 >= asOf
}

function outbound(event: MouseEvent<HTMLAnchorElement>, onOffline: () => void) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    event.preventDefault()
    onOffline()
  }
}

function ResourceLink({
  resource,
  primary = false,
  testId,
  onOffline,
}: {
  resource: Resource
  primary?: boolean
  testId?: string
  onOffline: () => void
}) {
  const className = primary ? 'btn btn-primary resource-action' : 'btn btn-secondary resource-action'
  return (
    <a
      className={className}
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${publisherName(resource.source)} — opens an external site; needs a network connection`}
      data-testid={testId}
      onClick={(event) => outbound(event, onOffline)}
    >
      {resourceActionLabel(resource)}
    </a>
  )
}

export function ResourceActions({ problem, testId = 'resource-actions' }: { problem: Problem; testId?: string }) {
  const [open, setOpen] = useState(false)
  const [offline, setOffline] = useState(false)
  const primary = primaryResource(problem)
  const practice = resourceFor(problem, 'practice')
  const read = resourceFor(problem, 'read')
  const watch = resourceFor(problem, 'watch')
  const sources = allSources(problem)
  const rankByUrl = new Map(rankedResources(problem).map((resource) => [resource.url, resource.rank]))

  if (!primary) {
    return (
      <Empty
        title="No sources yet"
        mark="↗"
        testId="resource-actions-empty"
      >
        This row has no ranked outbound links. The sheet links remain the fallback until an owner-approved batch lands.
      </Empty>
    )
  }

  return (
    <section className="resource-actions" aria-label={`Ranked sources for ${problem.title}`} data-testid={testId}>
      <div className="resource-action-row">
        <ResourceLink resource={primary} primary testId="primary-resource" onOffline={() => setOffline(true)} />
        {practice && practice.url !== primary.url ? (
          <ResourceLink resource={practice} testId="practice-resource" onOffline={() => setOffline(true)} />
        ) : null}
        {read && read.url !== primary.url ? (
          <ResourceLink resource={read} testId="read-resource" onOffline={() => setOffline(true)} />
        ) : null}
        {watch && watch.url !== primary.url ? (
          <ResourceLink resource={watch} testId="watch-resource" onOffline={() => setOffline(true)} />
        ) : null}
        <Button
          aria-expanded={open}
          aria-controls={open ? `more-sources-${problem.id}` : undefined}
          data-testid="more-sources"
          onClick={() => setOpen((value) => !value)}
        >
          ⋯ More sources ({sources.length})
        </Button>
      </div>
      {offline ? (
        <p className="quiet-note" role="status" data-testid="resource-offline">
          This link opens an external site and needs a network connection. Everything on this page is bundled offline.
        </p>
      ) : null}
      {open ? (
        <div id={`more-sources-${problem.id}`} className="resource-sheet" data-testid="resource-sheet">
          <p className="quiet-note">Ranked by editorial quality · publisher names are always shown · links open in a new tab.</p>
          <ul>
            {sources.map((resource, index) => (
              <li key={`${resource.url}-${index}`} className="resource-row">
                <Tag tone="neutral">{TYPE_LABELS[resource.type]}</Tag>
                <div className="resource-row-main">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => outbound(event, () => setOffline(true))}
                  >
                    {resource.label}
                  </a>
                  <span className="quiet-note">
                    {publisherName(resource.source)}
                    {freshVerified(resource.verified) ? ` · verified ${resource.verified}` : ''}
                    {resource.match ? ` · ${resource.match}` : ''}
                  </span>
                </div>
                <span className="num quiet-note">#{rankByUrl.get(resource.url) ?? resource.rank}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
