export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function createId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function basename(value) {
  if (!value) return ''
  const normalized = String(value).replace(/\\/g, '/')
  const lastSegment = normalized.split('/').filter(Boolean).pop() || normalized
  return lastSegment
}

export function truncate(value, maxLength = 140) {
  if (!value) return ''
  const text = String(value).trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export function toFileUrl(value) {
  if (!value) return ''
  const text = String(value).trim()
  if (/^[a-zA-Z]+:\/\//.test(text)) {
    return text
  }

  const normalized = text.replace(/\\/g, '/')
  return `file:///${encodeURI(normalized).replace(/^([a-zA-Z]):/, '$1:')}`
}

export function formatRelativeTime(value) {
  if (!value) return 'just now'

  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return 'just now'

  const deltaSeconds = Math.round((target.getTime() - Date.now()) / 1000)
  const absolute = Math.abs(deltaSeconds)

  const units = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]

  const [unit, secondsPerUnit] = units.find(([, seconds]) => absolute >= seconds) || ['second', 1]
  const valueCount = Math.max(1, Math.round(absolute / secondsPerUnit))
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  return formatter.format(deltaSeconds < 0 ? -valueCount : valueCount, unit)
}

export function formatTimestamp(value) {
  if (!value) return ''
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(target)
}

export function normalizeSource(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const sourcePath = raw.url || raw.source || ''
  const title = raw.title || basename(sourcePath) || 'Source'
  const snippet = raw.snippet || (raw.page ? `Page ${raw.page}` : '')

  return {
    title,
    snippet,
    page: raw.page ?? null,
    source: sourcePath,
    url: raw.url || toFileUrl(sourcePath),
  }
}

export function normalizeMessage(raw, index = 0) {
  return {
    id: raw?.id || createId(`message-${index}`),
    role: raw?.role || 'assistant',
    content: raw?.content || '',
    sources: Array.isArray(raw?.sources) ? raw.sources.map(normalizeSource).filter(Boolean) : [],
    createdAt: raw?.created_at || raw?.createdAt || null,
    error: Boolean(raw?.error),
    retryText: raw?.retryText || '',
  }
}

export function normalizeMessages(rawMessages) {
  return Array.isArray(rawMessages) ? rawMessages.map((message, index) => normalizeMessage(message, index)) : []
}