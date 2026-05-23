import { useMemo, useState } from 'react'

import { cn, truncate } from '../utils/helpers'

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="M10.59 13.41a1.98 1.98 0 0 0 2.82 0l2.9-2.9a2 2 0 0 0-2.83-2.83l-1.41 1.41-1.41-1.41 1.41-1.41a4 4 0 0 1 5.66 5.66l-2.9 2.9a4 4 0 0 1-5.66 0l-1.06-1.06 1.41-1.41 1.07 1.05Zm2.82-2.82a1.98 1.98 0 0 0-2.82 0l-2.9 2.9a2 2 0 0 0 2.83 2.83l1.41-1.41 1.41 1.41-1.41 1.41a4 4 0 0 1-5.66-5.66l2.9-2.9a4 4 0 0 1 5.66 0l1.06 1.06-1.41 1.41-1.07-1.05Z" />
    </svg>
  )
}

export function SourceCard({ source }) {
  const [open, setOpen] = useState(false)

  const title = useMemo(() => source?.title || 'Source', [source])
  const snippet = useMemo(() => source?.snippet || '', [source])

  return (
    <div className="rounded-2xl border border-white/8 bg-panel px-3 py-3 shadow-[0_8px_25px_rgba(0,0,0,0.16)] transition hover:border-accent/20 hover:bg-panelSoft">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 text-left"
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/8 text-[11px] font-semibold text-white/70 ring-1 ring-white/8">
          {title.slice(0, 2).toUpperCase() || 'SR'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">{title}</div>
          <div className="mt-1 text-xs leading-5 text-white/45">{truncate(snippet, 140) || 'Document citation'}</div>
        </div>
        <div className="text-xs font-medium text-white/45">{open ? 'Hide' : 'Details'}</div>
      </button>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-white/6 pt-3 text-sm text-white/70">
          {snippet ? <p className="leading-6 text-white/72">{snippet}</p> : null}
          {source?.source ? (
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/45">
              {source.source}
            </div>
          ) : null}
          {source?.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className={cn('inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-white/90')}
            >
              <LinkIcon />
              View Source
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}