import { cn, formatRelativeTime } from '../utils/helpers'

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="M11 5h2v14h-2z" />
      <path fill="currentColor" d="M5 11h14v2H5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="M9 3.5h6l1 1.5H21v2h-2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H3v-2h5l1-1.5Zm-1 5v10h8v-10H8Zm2 2h2v6h-2v-6Zm4 0h2v6h-2v-6Z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="currentColor" d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" />
    </svg>
  )
}

export function Sidebar({
  sessions,
  activeSessionId,
  draftSessionActive,
  draftTitle,
  collapsed,
  mobileOpen,
  loading,
  error,
  onCloseMobile,
  onToggleCollapsed,
  onOpenMobile,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}) {
  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[280px] border-r border-white/6 bg-panel/95 backdrop-blur-xl transition-transform duration-200 ease-out xl:static xl:z-auto xl:translate-x-0',
          collapsed ? 'xl:w-[84px]' : 'xl:w-[280px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn('border-b border-white/6 px-4 py-4', collapsed && 'xl:px-3')}>
            <div className={cn('flex items-center gap-3', collapsed && 'xl:justify-center')}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-sm font-semibold text-white shadow-glow ring-1 ring-white/8">
                R
              </div>
              <div className={cn('min-w-0 flex-1', collapsed && 'xl:hidden')}>
                <div className="truncate text-sm font-semibold tracking-wide text-white">Doc RAG Chat</div>
                <div className="truncate text-xs text-white/45">Claude-style RAG workspace</div>
              </div>
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="hidden rounded-xl border border-white/8 bg-white/5 p-2 text-white/75 transition hover:bg-white/10 hover:text-white xl:inline-flex"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span className="text-sm">{collapsed ? '›' : '‹'}</span>
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                className="ml-auto inline-flex rounded-xl border border-white/8 bg-white/5 p-2 text-white/75 transition hover:bg-white/10 hover:text-white xl:hidden"
                aria-label="Close sidebar"
              >
                <span className="text-sm">×</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onNewChat}
              className={cn(
                'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-medium text-slate-950 transition hover:bg-white/92',
                collapsed && 'xl:justify-center',
              )}
            >
              <PlusIcon />
              <span className={collapsed ? 'xl:hidden' : ''}>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className={cn('mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/30', collapsed && 'xl:hidden')}>
              Conversations
            </div>

            {draftSessionActive ? (
              <button
                type="button"
                onClick={() => onSelectSession('draft')}
                className={cn(
                  'mb-2 flex w-full items-center rounded-2xl border border-white/8 bg-white/6 px-3 py-3 text-left transition hover:bg-white/10',
                  activeSessionId === 'draft' && 'border-white/18 bg-white/12',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate text-sm font-medium text-white', collapsed && 'xl:hidden')}>
                    {draftTitle || 'New chat'}
                  </div>
                  <div className={cn('mt-1 text-xs text-white/45', collapsed && 'xl:hidden')}>
                    Draft session
                  </div>
                </div>
              </button>
            ) : null}

            {loading ? (
              <div className={cn('space-y-2', collapsed && 'xl:hidden')}>
                <div className="h-14 rounded-2xl bg-white/5" />
                <div className="h-14 rounded-2xl bg-white/5" />
                <div className="h-14 rounded-2xl bg-white/5" />
              </div>
            ) : sessions.length ? (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId
                  return (
                    <div
                      key={session.id}
                      className={cn(
                        'group flex items-center gap-2 rounded-2xl border px-3 py-3 transition',
                        isActive
                          ? 'border-white/16 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.18)]'
                          : 'border-transparent bg-transparent hover:border-white/8 hover:bg-white/6',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectSession(session.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className={cn('truncate text-sm font-medium text-white', collapsed && 'xl:hidden')}>
                          {session.title || 'New chat'}
                        </div>
                        <div className={cn('mt-1 text-xs text-white/45', collapsed && 'xl:hidden')}>
                          {session.last_message_at ? formatRelativeTime(session.last_message_at) : formatRelativeTime(session.created_at)}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        className={cn(
                          'inline-flex rounded-xl p-2 text-white/30 transition hover:bg-white/8 hover:text-white/80',
                          collapsed && 'xl:hidden',
                        )}
                        aria-label={`Delete ${session.title}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={cn('rounded-2xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-white/45', collapsed && 'xl:hidden')}>
                No chat sessions yet.
              </div>
            )}

            {error ? (
              <div className={cn('mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100', collapsed && 'xl:hidden')}>
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/6 p-3" />
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/55 backdrop-blur-[1px] xl:hidden"
          onClick={onCloseMobile}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      {!mobileOpen ? (
        <button
          type="button"
          onClick={onOpenMobile}
          className="fixed left-3 top-3 z-50 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-[#1a1a1a]/95 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition hover:bg-white/10 xl:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon />
        </button>
      ) : null}
    </>
  )
}