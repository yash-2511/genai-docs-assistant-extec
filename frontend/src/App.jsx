import { useEffect, useMemo, useState } from 'react'

import { ChatWindow } from './components/ChatWindow'
import { ConnectionDrawer } from './components/ConnectionDrawer'
import { ContextRail } from './components/ContextRail'
import { Sidebar } from './components/Sidebar'
import { useChat } from './hooks/useChat'
import { useSessions } from './hooks/useSessions'
import { BASE_URL, STREAM_ENABLED } from './config'
import { uploadDocument } from './api/client'
import { normalizeMessages } from './utils/helpers'

function getUrlSessionId() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('session') || ''
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [booting, setBooting] = useState(true)
  const [connectionState, setConnectionState] = useState('checking')
  const [draftTitle, setDraftTitle] = useState('New chat')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadError, setUploadError] = useState('')

  const sessions = useSessions()
  const chat = useChat()

  const latestSources = useMemo(() => {
    const lastAssistant = [...chat.messages].reverse().find((message) => message.role === 'assistant' && !message.error)
    return Array.isArray(lastAssistant?.sources) ? lastAssistant.sources : []
  }, [chat.messages])

  async function loadSession(sessionId) {
    if (!sessionId || sessionId === 'draft') {
      sessions.startDraftSession()
      chat.clearMessages()
      return
    }

    const result = await sessions.openSession(sessionId)
    chat.replaceMessages(result.messages)

    const matchingSession = sessions.sessions.find((session) => session.id === sessionId)
    setDraftTitle(matchingSession?.title || 'New chat')
  }

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const payload = await sessions.refreshSessions()
        if (cancelled) return

        const urlSessionId = getUrlSessionId()
        const storedActiveSession = payload?.active_session_id || sessions.activeSessionId || ''
        const initialSessionId = urlSessionId || storedActiveSession || ''

        if (initialSessionId) {
          await loadSession(initialSessionId)
          setConnectionState('connected')
        } else {
          sessions.startDraftSession()
          chat.clearMessages()
          setConnectionState('connected')
        }
      } catch (error) {
        if (cancelled) return
        const message = error?.status === 401 ? 'auth-required' : 'offline'
        setConnectionState(message)
      } finally {
        if (!cancelled) {
          setBooting(false)
        }
      }
    }

    boot()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentSessionId = sessions.activeSession?.draft ? '' : sessions.activeSession?.id || ''
    const url = new URL(window.location.href)

    if (currentSessionId) {
      url.searchParams.set('session', currentSessionId)
      window.history.replaceState({}, '', url)
    } else {
      url.searchParams.delete('session')
      window.history.replaceState({}, '', url)
    }
  }, [sessions.activeSession])

  async function handleSend() {
    const currentSessionId = sessions.activeSession?.draft ? '' : sessions.activeSession?.id || ''
    await chat.sendMessage({
      text: chat.input,
      sessionId: currentSessionId,
      onCommitted: async (sessionId, response) => {
        const result = await sessions.openSession(sessionId)
        if (sessions.activeSession?.draft && draftTitle && draftTitle !== 'New chat') {
          sessions.renameSession(sessionId, draftTitle)
        }
        setConnectionState('connected')
        return result.messages.length ? result.messages : normalizeMessages([
          { role: 'user', content: response.question, sources: [], created_at: new Date().toISOString() },
          { role: 'assistant', content: response.answer, sources: response.sources || [], created_at: new Date().toISOString() },
        ])
      },
    })
    const refreshed = await sessions.refreshSessions().catch(() => null)
    if (refreshed?.active_session_id) {
      const active = sessions.sessions.find((session) => session.id === refreshed.active_session_id)
      if (active) {
        setDraftTitle(active.title)
      }
    }
  }

  async function handleOpenSession(sessionId) {
    setMobileSidebarOpen(false)
    await loadSession(sessionId)
  }

  function handleNewChat() {
    sessions.startDraftSession()
    chat.clearMessages()
    setDraftTitle('New chat')
    chat.setInput('')
    setMobileSidebarOpen(false)
  }

  async function handleDeleteSession(sessionId) {
    const outcome = await sessions.removeSession(sessionId)
    if (outcome?.messages?.length) {
      chat.replaceMessages(outcome.messages)
    } else {
      chat.clearMessages()
    }
    setMobileSidebarOpen(false)
  }

  async function handleAttach(file) {
    setUploading(true)
    setUploadError('')
    setUploadStatus('')

    try {
      const currentSessionId = sessions.activeSession?.draft ? '' : sessions.activeSession?.id || ''
      const payload = await uploadDocument({ file, sessionId: currentSessionId || undefined })
      setUploadStatus(`Uploaded ${payload?.filename || file.name}`)

      const refreshed = await sessions.refreshSessions()
      const nextSessionId = payload?.session_id || refreshed?.active_session_id || sessions.activeSessionId || ''

      if (nextSessionId) {
        const result = await sessions.openSession(nextSessionId)
        chat.replaceMessages(result.messages)
      }
    } catch (error) {
      setUploadError(error?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSuggestionPick(value) {
    chat.setInput(value)
  }

  async function handleRetry(text) {
    const currentSessionId = sessions.activeSession?.draft ? '' : sessions.activeSession?.id || ''
    await chat.sendMessage({
      text,
      sessionId: currentSessionId,
      appendUser: false,
      onCommitted: async (sessionId) => {
        const result = await sessions.openSession(sessionId)
        return result.messages
      },
    })
  }

  const backendStatus = connectionState === 'connected'
    ? `Connected${BASE_URL ? ` · ${BASE_URL}` : ''}`
    : connectionState === 'auth-required'
      ? 'Authentication required'
      : 'Unable to reach backend'

  return (
    <div className="flex min-h-screen bg-shell text-white">
      <Sidebar
        sessions={sessions.sessions}
        activeSessionId={sessions.activeSession?.draft ? 'draft' : sessions.activeSessionId}
        draftSessionActive={sessions.draftSessionActive}
        draftTitle={draftTitle}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        loading={booting || sessions.loading}
        error={sessions.error}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onNewChat={handleNewChat}
        onSelectSession={handleOpenSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        <ChatWindow
          session={sessions.activeSession}
          sessionTitle={sessions.activeSession?.draft ? draftTitle : sessions.activeSession?.title}
          messages={chat.messages}
          input={chat.input}
          onInputChange={chat.setInput}
          onSend={handleSend}
          onRetry={handleRetry}
          onAttach={handleAttach}
          isSending={chat.isSending || uploading}
          onToggleSidebar={() => setMobileSidebarOpen(true)}
          onRenameSession={(nextTitle) => {
            if (sessions.activeSession?.draft) {
              setDraftTitle(nextTitle)
            } else if (sessions.activeSessionId) {
              sessions.renameSession(sessions.activeSessionId, nextTitle)
              setDraftTitle(nextTitle)
            }
          }}
          onSuggestionPick={handleSuggestionPick}
          connectionLabel={backendStatus}
          connectionTone={connectionState === 'auth-required' || connectionState === 'offline' ? 'danger' : 'neutral'}
          onRequestFocus={() => setMobileSidebarOpen(false)}
        />
      </main>

      <ContextRail
        session={sessions.activeSession}
        messages={chat.messages}
        latestSources={latestSources}
        onOpenSettings={() => setSettingsOpen(true)}
        backendStatus={backendStatus}
      />

      {uploadError ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 shadow-glow">
          {uploadError}
        </div>
      ) : null}

      {uploadStatus ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 shadow-glow">
          {uploadStatus}
        </div>
      ) : null}

      <ConnectionDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        baseUrl={BASE_URL}
        streamEnabled={STREAM_ENABLED}
        onTokenSaved={async () => {
          setConnectionState('checking')
          try {
            await sessions.refreshSessions()
            setConnectionState('connected')
          } catch (error) {
            setConnectionState(error?.status === 401 ? 'auth-required' : 'offline')
          }
        }}
        backendStatus={connectionState}
      />
    </div>
  )
}