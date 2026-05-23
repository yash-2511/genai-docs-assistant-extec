import { useCallback, useState } from 'react'

import { sendChatMessage } from '../api/client'

import { createId, normalizeMessages } from '../utils/helpers'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const replaceMessages = useCallback((nextMessages) => {
    setMessages(normalizeMessages(nextMessages))
    setError('')
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError('')
  }, [])

  const sendMessage = useCallback(async ({ text, sessionId, onCommitted, appendUser = true }) => {
    const trimmed = text.trim()
    if (!trimmed || isSending) {
      return null
    }

    const userMessage = {
      id: createId('user'),
      role: 'user',
      content: trimmed,
      sources: [],
      createdAt: new Date().toISOString(),
    }

    const pendingErrorId = `error-${trimmed}`

    setError('')
    setIsSending(true)
    if (appendUser) {
      setMessages((current) => [...current, userMessage])
    } else {
      setMessages((current) => current.filter((message) => message.id !== pendingErrorId))
    }
    setInput('')

    try {
      const response = await sendChatMessage({ question: trimmed, sessionId })
      const committedMessages = await onCommitted?.(response.session_id, response)

      if (Array.isArray(committedMessages) && committedMessages.length) {
        setMessages(normalizeMessages(committedMessages))
      } else {
        setMessages((current) => [
          ...current.filter((message) => message.id !== pendingErrorId),
          userMessage,
          {
            id: createId('assistant'),
            role: 'assistant',
            content: response?.answer || '',
            sources: Array.isArray(response?.sources) ? response.sources : [],
            createdAt: new Date().toISOString(),
          },
        ])
      }

      setIsSending(false)
      setError('')
      return response
    } catch (err) {
      const message = err?.message || 'Unable to send message'

      setError(message)
      setMessages((current) => [
        ...current,
        {
          id: pendingErrorId,
          role: 'assistant',
          content: message,
          sources: [],
          createdAt: new Date().toISOString(),
          error: true,
          retryText: trimmed,
        },
      ])
      setIsSending(false)
      throw err
    }
  }, [isSending])

  return {
    messages,
    input,
    isSending,
    error,
    setInput,
    setMessages,
    replaceMessages,
    clearMessages,
    sendMessage,
    setError,
  }
}