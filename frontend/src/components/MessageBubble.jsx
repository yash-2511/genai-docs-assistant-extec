import { SourceCard } from './SourceCard'

import { cn, formatTimestamp } from '../utils/helpers'

function AssistantAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-xs font-semibold text-white ring-1 ring-white/8">
      A
    </div>
  )
}

function RetryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="M12 5a7 7 0 1 1-6.32 9.96l1.83-.78A5 5 0 1 0 12 7v2l-4-3 4-3v2Z" />
    </svg>
  )
}

export function MessageBubble({ message, onRetry }) {
  const isUser = message.role === 'user'
  const isError = Boolean(message.error)

  if (isError) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[min(720px,100%)] rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-rose-50 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
          <div className="text-sm font-medium">Message failed</div>
          <div className="mt-2 text-sm leading-6 text-rose-50/80">{message.content}</div>
          {message.retryText ? (
            <button
              type="button"
              onClick={() => onRetry?.(message.retryText)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-white/90"
            >
              <RetryIcon />
              Retry
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(760px,100%)] rounded-3xl border border-white/8 bg-panelSoft px-4 py-3 text-white ring-1 ring-white/8">
          <div className="whitespace-pre-wrap text-[15px] leading-7 tracking-[0.01em]">{message.content}</div>
          {message.createdAt ? (
            <div className="mt-2 text-right text-[11px] uppercase tracking-[0.2em] text-white/55" title={formatTimestamp(message.createdAt)}>
              You
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-3">
      <AssistantAvatar />
      <div className="max-w-[min(760px,100%)] space-y-3">
        <div className={cn('rounded-3xl border border-white/8 bg-panel px-4 py-3 text-white/88')}>
          <div className="whitespace-pre-wrap text-[15px] leading-7 tracking-[0.01em]">{message.content}</div>
          {message.createdAt ? (
            <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/35" title={formatTimestamp(message.createdAt)}>
              Assistant
            </div>
          ) : null}
        </div>

        {Array.isArray(message.sources) && message.sources.length ? (
          <div className="space-y-2 pl-1">
            {message.sources.map((source, index) => (
              <SourceCard key={`${source?.title || 'source'}-${index}`} source={source} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}