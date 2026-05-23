import { useEffect, useMemo, useRef, useState } from 'react'

import { InputBar } from './InputBar'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

import { cn, formatRelativeTime, truncate } from '../utils/helpers'

function SidebarToggleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="M4 5h16v2H4V5Zm0 6h10v2H4v-2Zm0 6h16v2H4v-2Z" />
    </svg>
  )
}

export function ChatWindow({
  session,
  sessionTitle,
  messages,
  input,
  onInputChange,
  onSend,
  onRetry,
  onAttach,
  isSending,
  onToggleSidebar,
  onRenameSession,
  onSuggestionPick,
  onRequestFocus,
}) {
  const threadRef = useRef(null)
  const bottomRef = useRef(null)
  const [titleValue, setTitleValue] = useState(sessionTitle || session?.title || 'New chat')

  useEffect(() => {
    setTitleValue(sessionTitle || session?.title || 'New chat')
  }, [session?.id, session?.title, sessionTitle])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: messages.length > 1 ? 'smooth' : 'auto' })
  }, [messages, isSending])

  const suggestions = useMemo(() => ([
    'Summarize the uploaded documents and cite the most relevant pages.',
    'What are the key architectural decisions mentioned in the files?',
    'Compare the documents and point out conflicts or missing information.',
    'Give me a concise answer with source citations only.',
  ]), [])

  function commitTitle() {
    const trimmed = titleValue.trim() || 'New chat'
    onRenameSession?.(trimmed)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-shell">
      <header className="border-b border-white/6 bg-panel/95 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex rounded-2xl border border-white/8 bg-panelSoft/80 p-2 text-white/75 transition hover:bg-accent/15 hover:text-white xl:hidden"
            aria-label="Open sidebar"
          >
            <SidebarToggleIcon />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <input
                value={titleValue}
                onChange={(event) => setTitleValue(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                }}
                className="min-w-0 max-w-full flex-1 border-0 bg-transparent text-lg font-medium tracking-tight text-white outline-none placeholder:text-white/30"
                aria-label="Session title"
                placeholder="New chat"
                onFocus={onRequestFocus}
              />
            </div>
            {session?.last_message_at ? (
              <div className="mt-1 text-xs text-white/45">Updated {formatRelativeTime(session.last_message_at)}</div>
            ) : null}
          </div>
        </div>
      </header>

      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
          {!messages.length ? (
            <div className="flex min-h-full flex-1 flex-col justify-center px-2 text-center">
              <div className="max-w-2xl space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-accent/15 text-2xl font-semibold text-accent ring-1 ring-accent/20">
                  R
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Start a grounded document conversation</h2>
                  <p className="mx-auto max-w-xl text-base leading-7 text-white/55">
                    Ask about your uploaded files, get direct answers, and inspect citations inline without leaving the chat.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => onSuggestionPick?.(suggestion)}
                      className="rounded-3xl border border-white/8 bg-panelSoft/70 px-4 py-4 text-left text-sm leading-6 text-white/80 transition hover:border-accent/30 hover:bg-accent/10"
                    >
                      {truncate(suggestion, 120)}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <InputBar
                    value={input}
                    onChange={onInputChange}
                    onSend={onSend}
                    onAttach={onAttach}
                    disabled={isSending}
                  />
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} onRetry={onRetry} />)
          )}

          {isSending ? (
            <div className="flex justify-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-xs font-semibold text-accent ring-1 ring-accent/20">A</div>
              <TypingIndicator />
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      {messages.length ? (
        <InputBar
          value={input}
          onChange={onInputChange}
          onSend={onSend}
          onAttach={onAttach}
          disabled={isSending}
        />
      ) : null}
    </div>
  )
}