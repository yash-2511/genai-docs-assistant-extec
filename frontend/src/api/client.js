import { BASE_URL } from '../config'

const TOKEN_STORAGE_KEY = 'genai-doc-assistant-token'

function getToken() {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_API_TOKEN?.trim() || ''
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() || import.meta.env.VITE_API_TOKEN?.trim() || ''
}

function buildUrl(path) {
  return `${BASE_URL}${path}`
}

async function request(path, options = {}) {
  const { body, headers: extraHeaders, signal, method = 'GET' } = options
  const headers = new Headers(extraHeaders || {})

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    signal,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => '')

  if (!response.ok) {
    const detail = typeof payload === 'string' ? payload : payload?.detail || payload?.message || response.statusText
    const error = new Error(detail || 'Request failed')
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export function getStoredToken() {
  return getToken()
}

export function setStoredToken(token) {
  if (typeof window === 'undefined') return
  if (token?.trim()) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token.trim())
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export function clearStoredToken() {
  setStoredToken('')
}

export async function getSessions() {
  return request('/chat/sessions')
}

export async function activateSession(sessionId) {
  return request(`/chat/sessions/${encodeURIComponent(sessionId)}/activate`, { method: 'POST' })
}

export async function getSessionMessages(sessionId) {
  return request(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`)
}

export async function deleteSession(sessionId) {
  return request(`/chat/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
}

export async function sendChatMessage({ question, sessionId }) {
  return request('/chat/ask', {
    method: 'POST',
    body: {
      question,
      session_id: sessionId || null,
    },
  })
}

export async function uploadDocument({ file, sessionId }) {
  const formData = new FormData()
  formData.append('file', file)

  if (sessionId) {
    formData.append('session_id', sessionId)
  }

  return request('/upload', {
    method: 'POST',
    body: formData,
  })
}

export async function listDocuments(sessionId) {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  return request(`/documents${query}`)
}

export async function loginUser(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: {
      email: payload.email,
      password: payload.password,
    },
  })
}

export async function signupUser(payload) {
  return request('/auth/signup', {
    method: 'POST',
    body: {
      name: payload.name,
      email: payload.email,
      password: payload.password,
    },
  })
}

export async function getCurrentUser() {
  return request('/auth/me')
}

export async function logoutUser() {
  return request('/auth/logout', { method: 'POST' })
}