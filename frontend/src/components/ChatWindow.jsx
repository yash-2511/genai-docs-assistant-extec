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

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="m3 17.25 11.19-11.19 3.75 3.75L6.75 21H3v-3.75Zm14.12-12.1 1.81-1.81a1.5 1.5 0 0 1 2.12 2.12l-1.81 1.81-2.12-2.12Z" />
    </svg>
  )
}

export function ChatWindow({
  session,
  sessionTitle,
  user,
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
  onLogout,
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
    <div className="flex min-h-0 flex-1 flex-col bg-shell">
      <header className="border-b border-white/6 bg-[#141414]/95 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex rounded-2xl border border-white/8 bg-white/5 p-2 text-white/75 transition hover:bg-white/10 hover:text-white xl:hidden"
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
              <button
                type="button"
                onClick={commitTitle}
                className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                <EditIcon />
                Rename
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/45">
              <span className="inline-flex items-center rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-white/65">
                Signed in as {user?.name || user?.email || 'Account'}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                Logout
              </button>
              {session?.last_message_at ? (
                <span>Updated {formatRelativeTime(session.last_message_at)}</span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
          {!messages.length ? (
            <div className="flex min-h-[calc(100vh-230px)] flex-col items-center justify-center px-2 text-center">
              <div className="max-w-2xl space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-white/6 text-2xl font-semibold text-white ring-1 ring-white/8">
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
                      className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4 text-left text-sm leading-6 text-white/80 transition hover:border-white/14 hover:bg-white/8"
                    >
                      {truncate(suggestion, 120)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} onRetry={onRetry} />)
          )}

          {isSending ? (
            <div className="flex justify-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/8 text-xs font-semibold text-white ring-1 ring-white/8">A</div>
              <TypingIndicator />
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <InputBar
        value={input}
        onChange={onInputChange}
        onSend={onSend}
        onAttach={onAttach}
        disabled={isSending}
      />
    </div>
  )
}