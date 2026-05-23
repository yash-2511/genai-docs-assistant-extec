const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || ''

export const BASE_URL = baseUrl.replace(/\/$/, '')
export const MAX_HISTORY_TURNS = Number(import.meta.env.VITE_MAX_HISTORY_TURNS ?? 8)
export const STREAM_ENABLED = String(import.meta.env.VITE_STREAM_ENABLED ?? 'false').toLowerCase() === 'true'