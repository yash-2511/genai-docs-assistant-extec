import { useCallback, useMemo, useState } from 'react'

import {
  activateSession,
  deleteSession as deleteSessionRequest,
  getSessionMessages,
  getSessions,
} from '../api/client'

import { normalizeMessages } from '../utils/helpers'

const TITLE_OVERRIDES_KEY = 'genai-doc-assistant-session-titles'
const LAST_SESSION_KEY = 'genai-doc-assistant-last-session'

function readTitleOverrides() {
  if (typeof window === 'undefined') return {}

  try {
    return JSON.parse(window.localStorage.getItem(TITLE_OVERRIDES_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeTitleOverrides(nextOverrides) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TITLE_OVERRIDES_KEY, JSON.stringify(nextOverrides))
}

function readLastSessionId() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(LAST_SESSION_KEY) || ''
}

function writeLastSessionId(sessionId) {
  if (typeof window === 'undefined') return
  if (sessionId) {
    window.localStorage.setItem(LAST_SESSION_KEY, sessionId)
  } else {
    window.localStorage.removeItem(LAST_SESSION_KEY)
  }
}

export function useSessions() {
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [draftSessionActive, setDraftSessionActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [titleOverrides, setTitleOverrides] = useState(() => readTitleOverrides())

  const refreshSessions = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const payload = await getSessions()
      const nextSessions = Array.isArray(payload?.sessions) ? payload.sessions : []
      setSessions(nextSessions)

      const backendActive = payload?.active_session_id || ''
      if (backendActive) {
        setActiveSessionId(backendActive)
        setDraftSessionActive(false)
        writeLastSessionId(backendActive)
      } else if (!draftSessionActive && !activeSessionId) {
        const storedSessionId = readLastSessionId()
        if (storedSessionId && nextSessions.some((session) => session.id === storedSessionId)) {
          setActiveSessionId(storedSessionId)
        }
      }

      return payload
    } catch (err) {
      setError(err?.message || 'Unable to load sessions')
      throw err
    } finally {
      setLoading(false)
    }
  }, [activeSessionId, draftSessionActive])

  const openSession = useCallback(async (sessionId) => {
    setError('')

    const activation = await activateSession(sessionId)
    const response = await getSessionMessages(sessionId)
    const messages = normalizeMessages(response?.messages)

    setActiveSessionId(sessionId)
    setDraftSessionActive(false)
    writeLastSessionId(sessionId)
    await refreshSessions()

    return {
      session: activation?.session || null,
      messages,
    }
  }, [refreshSessions])

  const startDraftSession = useCallback(() => {
    setDraftSessionActive(true)
    setActiveSessionId('')
    setError('')
  }, [])

  const removeSession = useCallback(async (sessionId) => {
    setError('')

    const response = await deleteSessionRequest(sessionId)
    const nextActiveSessionId = response?.active_session_id || ''

    if (nextActiveSessionId) {
      const opened = await openSession(nextActiveSessionId)
      return {
        nextActiveSessionId,
        messages: opened.messages,
      }
    }

    if (activeSessionId === sessionId) {
      startDraftSession()
    }

    await refreshSessions()
    return { nextActiveSessionId: '', messages: [] }
  }, [activeSessionId, openSession, refreshSessions, startDraftSession])

  const renameSession = useCallback((sessionId, nextTitle) => {
    const trimmed = nextTitle.trim() || 'New chat'
    const nextOverrides = {
      ...titleOverrides,
      [sessionId]: trimmed,
    }

    setTitleOverrides(nextOverrides)
    writeTitleOverrides(nextOverrides)
  }, [titleOverrides])

  const visibleSessions = useMemo(() => {
    return sessions.map((session) => ({
      ...session,
      title: titleOverrides[session.id] || session.title || 'New chat',
    }))
  }, [sessions, titleOverrides])

  const activeSession = useMemo(() => {
    if (draftSessionActive) {
      return {
        id: 'draft',
        title: 'New chat',
        created_at: new Date().toISOString(),
        last_message_at: null,
        draft: true,
      }
    }

    return visibleSessions.find((session) => session.id === activeSessionId) || null
  }, [activeSessionId, draftSessionActive, visibleSessions])

  const resetSessions = useCallback(() => {
    setSessions([])
    setActiveSessionId('')
    setDraftSessionActive(false)
    setLoading(false)
    setError('')
  }, [])

  return {
    sessions: visibleSessions,
    activeSession,
    activeSessionId,
    draftSessionActive,
    loading,
    error,
    refreshSessions,
    openSession,
    startDraftSession,
    removeSession,
    renameSession,
    resetSessions,
    setActiveSessionId,
    setDraftSessionActive,
    setSessions,
    setError,
  }
}