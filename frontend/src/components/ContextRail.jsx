import { formatRelativeTime, truncate } from '../utils/helpers'

function SourceLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="M10.59 13.41a1.98 1.98 0 0 0 2.82 0l2.9-2.9a2 2 0 0 0-2.83-2.83l-1.41 1.41-1.41-1.41 1.41-1.41a4 4 0 0 1 5.66 5.66l-2.9 2.9a4 4 0 0 1-5.66 0l-1.06-1.06 1.41-1.41 1.07 1.05Zm2.82-2.82a1.98 1.98 0 0 0-2.82 0l-2.9 2.9a2 2 0 0 0 2.83 2.83l1.41-1.41 1.41 1.41-1.41 1.41a4 4 0 0 1-5.66-5.66l2.9-2.9a4 4 0 0 1 5.66 0l1.06 1.06-1.41 1.41-1.07-1.05Z" />
    </svg>
  )
}

export function ContextRail({ session, messages, latestSources, onOpenSettings, backendStatus }) {
  const assistantMessageCount = messages.filter((message) => message.role === 'assistant' && !message.error).length

  return (
    <aside className="hidden w-[320px] shrink-0 border-l border-white/6 bg-[#151515]/95 px-4 py-4 backdrop-blur-xl xl:flex xl:flex-col xl:gap-4">
      <div className="rounded-[1.75rem] border border-white/8 bg-white/5 p-4 shadow-[0_14px_35px_rgba(0,0,0,0.14)]">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Session</div>
        <div className="mt-2 text-lg font-medium text-white">{session?.title || 'New chat'}</div>
        <div className="mt-2 text-sm leading-6 text-white/50">
          {session?.last_message_at ? `Updated ${formatRelativeTime(session.last_message_at)}` : 'No messages yet'}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/70">
          <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Messages</div>
            <div className="mt-2 text-xl font-semibold text-white">{messages.length}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Replies</div>
            <div className="mt-2 text-xl font-semibold text-white">{assistantMessageCount}</div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/8 bg-white/5 p-4 shadow-[0_14px_35px_rgba(0,0,0,0.14)]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Sources</div>
          <button type="button" onClick={onOpenSettings} className="text-xs font-medium text-white/55 transition hover:text-white">
            Configure
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {latestSources.length ? (
            latestSources.map((source, index) => (
              <div key={`${source.title}-${index}`} className="rounded-2xl border border-white/8 bg-[#1c1c1c] px-3 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white/70 ring-1 ring-white/8">
                    <SourceLinkIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{source.title}</div>
                    <div className="mt-1 text-xs leading-5 text-white/45">{truncate(source.snippet || '', 110)}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 px-4 py-5 text-sm text-white/45">
              Cited sources from assistant replies will appear here.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/8 bg-white/5 p-4 shadow-[0_14px_35px_rgba(0,0,0,0.14)]">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Connection</div>
        <div className="mt-2 text-sm text-white/72">{backendStatus}</div>
        <div className="mt-4 rounded-2xl border border-white/8 bg-[#1b1b1b] px-3 py-3 text-sm leading-6 text-white/55">
          Upload documents with the paperclip button, then ask questions that cite the uploaded pages.
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="rounded-[1.75rem] border border-white/8 bg-white/5 px-4 py-4 text-left text-sm text-white/72 transition hover:bg-white/10 hover:text-white"
      >
        Open settings to connect or upload documents
      </button>
    </aside>
  )
}