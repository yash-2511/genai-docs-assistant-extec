import { useEffect, useState } from 'react'

import { AuthScreen } from './components/AuthScreen'
import { ChatWindow } from './components/ChatWindow'
import { Sidebar } from './components/Sidebar'
import { useChat } from './hooks/useChat'
import { useSessions } from './hooks/useSessions'
import { BASE_URL } from './config'
import {
  clearStoredToken,
  getCurrentUser,
  getStoredToken,
  loginUser,
  logoutUser,
  setStoredToken,
  signupUser,
  uploadDocument,
} from './api/client'
import { normalizeMessages } from './utils/helpers'

function getUrlSessionId() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('session') || ''
}

export default function App() {
  const [authStatus, setAuthStatus] = useState('checking')
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [booting, setBooting] = useState(true)
  const [draftTitle, setDraftTitle] = useState('New chat')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (!uploadStatus) return undefined

    const timeoutId = window.setTimeout(() => {
      setUploadStatus('')
    }, 2500)

    return () => window.clearTimeout(timeoutId)
  }, [uploadStatus])

  const sessions = useSessions()
  const chat = useChat()

  const {
    sessions: sessionList,
    activeSession,
    activeSessionId,
    draftSessionActive,
    loading: sessionsLoading,
    error: sessionsError,
    refreshSessions,
    openSession,
    startDraftSession,
    removeSession,
    renameSession,
    resetSessions,
  } = sessions

  async function loadSession(sessionId) {
    if (!sessionId || sessionId === 'draft') {
      startDraftSession()
      chat.clearMessages()
      return
    }

    const result = await openSession(sessionId)
    chat.replaceMessages(result.messages)

    const matchingSession = sessionList.find((session) => session.id === sessionId)
    setDraftTitle(matchingSession?.title || 'New chat')
  }

  async function initializeWorkspace(preferredSessionId = '') {
    const payload = await refreshSessions()
    const urlSessionId = getUrlSessionId()
    const storedActiveSession = payload?.active_session_id || activeSessionId || ''
    const initialSessionId = preferredSessionId || urlSessionId || storedActiveSession || ''

    if (initialSessionId) {
      await loadSession(initialSessionId)
    } else {
      startDraftSession()
      chat.clearMessages()
      setDraftTitle('New chat')
    }
  }

  async function handleAuthSuccess(response) {
    setStoredToken(response.access_token)
    setAuthUser(response.user)
    setAuthStatus('authenticated')
    setAuthError('')
    await initializeWorkspace(response.active_session?.id || '')
  }

  async function handleLogin(payload) {
    setAuthLoading(true)
    setAuthError('')
    try {
      const response = await loginUser(payload)
      await handleAuthSuccess(response)
    } catch (error) {
      setAuthError(error?.message || 'Login failed')
      throw error
    } finally {
      setAuthLoading(false)
      setBooting(false)
    }
  }

  async function handleSignup(payload) {
    setAuthLoading(true)
    setAuthError('')
    try {
      const response = await signupUser(payload)
      await handleAuthSuccess(response)
    } catch (error) {
      setAuthError(error?.message || 'Signup failed')
      throw error
    } finally {
      setAuthLoading(false)
      setBooting(false)
    }
  }

  async function handleLogout() {
    try {
      await logoutUser()
    } catch {
      // Ignore logout errors and still clear local auth state.
    }

    clearStoredToken()
    resetSessions()
    chat.clearMessages()
    setAuthUser(null)
    setAuthStatus('unauthenticated')
    setAuthMode('login')
    setDraftTitle('New chat')
    setUploadError('')
    setUploadStatus('')
    setSidebarOpen(true)
  }

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const storedToken = getStoredToken()

      if (!storedToken) {
        if (!cancelled) {
          resetSessions()
          chat.clearMessages()
          setAuthUser(null)
          setAuthStatus('unauthenticated')
          setAuthMode('login')
          setBooting(false)
        }
        return
      }

      try {
        const response = await getCurrentUser()
        if (cancelled) return

        setStoredToken(response.access_token || storedToken)
        setAuthStatus('authenticated')
        await initializeWorkspace(response.active_session?.id || '')
      } catch (error) {
        if (cancelled) return
        clearStoredToken()
        resetSessions()
        chat.clearMessages()
        setAuthUser(null)
        setAuthStatus('unauthenticated')
        setAuthMode('login')
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
    const currentSessionId = activeSession?.draft ? '' : activeSession?.id || ''
    await chat.sendMessage({
      text: chat.input,
      sessionId: currentSessionId,
      onCommitted: async (sessionId, response) => {
        const result = await openSession(sessionId)
        if (activeSession?.draft && draftTitle && draftTitle !== 'New chat') {
          renameSession(sessionId, draftTitle)
        }
        return result.messages.length ? result.messages : normalizeMessages([
          { role: 'user', content: response.question, sources: [], created_at: new Date().toISOString() },
          { role: 'assistant', content: response.answer, sources: response.sources || [], created_at: new Date().toISOString() },
        ])
      },
    })
    const refreshed = await refreshSessions().catch(() => null)
    if (refreshed?.active_session_id) {
      const active = sessionList.find((session) => session.id === refreshed.active_session_id)
      if (active) {
        setDraftTitle(active.title)
      }
    }
  }

  async function handleOpenSession(sessionId) {
    setSidebarOpen(true)
    await loadSession(sessionId)
  }

  function handleNewChat() {
    startDraftSession()
    chat.clearMessages()
    setDraftTitle('New chat')
    chat.setInput('')
    setSidebarOpen(true)
  }

  async function handleDeleteSession(sessionId) {
    const outcome = await removeSession(sessionId)
    if (outcome?.messages?.length) {
      chat.replaceMessages(outcome.messages)
    } else {
      chat.clearMessages()
    }
    setSidebarOpen(true)
  }

  async function handleAttach(file) {
    setUploading(true)
    setUploadError('')
    setUploadStatus('')

    try {
      const currentSessionId = activeSession?.draft ? '' : activeSession?.id || ''
      const payload = await uploadDocument({ file, sessionId: currentSessionId || undefined })
      setUploadStatus(`Uploaded ${payload?.filename || file.name}`)

      const refreshed = await refreshSessions()
      const nextSessionId = payload?.session_id || refreshed?.active_session_id || activeSessionId || ''

      if (nextSessionId) {
        const result = await openSession(nextSessionId)
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
    const currentSessionId = activeSession?.draft ? '' : activeSession?.id || ''
    await chat.sendMessage({
      text,
      sessionId: currentSessionId,
      appendUser: false,
      onCommitted: async (sessionId) => {
        const result = await openSession(sessionId)
        return result.messages
      },
    })
  }

  if (authStatus !== 'authenticated') {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onLogin={handleLogin}
        onSignup={handleSignup}
        loading={booting || authLoading}
        error={authError}
        baseUrl={BASE_URL}
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-shell text-white">
      <Sidebar
        open={sidebarOpen}
        sessions={sessionList}
        activeSessionId={activeSession?.draft ? 'draft' : activeSessionId}
        draftSessionActive={draftSessionActive}
        draftTitle={draftTitle}
        loading={booting || sessionsLoading}
        error={sessionsError}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCloseSidebar={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectSession={handleOpenSession}
        onDeleteSession={handleDeleteSession}
        onLogout={handleLogout}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatWindow
          session={activeSession}
          sessionTitle={activeSession?.draft ? draftTitle : activeSession?.title}
          messages={chat.messages}
          input={chat.input}
          onInputChange={chat.setInput}
          onSend={handleSend}
          onRetry={handleRetry}
          onAttach={handleAttach}
          isSending={chat.isSending || uploading}
          onRenameSession={(nextTitle) => {
            if (activeSession?.draft) {
              setDraftTitle(nextTitle)
            } else if (activeSessionId) {
              renameSession(activeSessionId, nextTitle)
              setDraftTitle(nextTitle)
            }
          }}
          onSuggestionPick={handleSuggestionPick}
          onRequestFocus={() => setSidebarOpen(true)}
        />
      </main>

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

    </div>
  )
}