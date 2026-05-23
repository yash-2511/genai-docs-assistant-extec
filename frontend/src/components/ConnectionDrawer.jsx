import { getStoredToken, setStoredToken } from '../api/client'

import { cn } from '../utils/helpers'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6 5.6-5.6-1.4-1.4-5.6 5.6L6.4 5Z" />
    </svg>
  )
}

export function ConnectionDrawer({ open, onClose, baseUrl, streamEnabled, onTokenSaved, backendStatus }) {
  const initialToken = getStoredToken()

  if (!open) return null

  function handleSubmit(event) {
    event.preventDefault()
    const token = new FormData(event.currentTarget).get('token')
    setStoredToken(String(token || ''))
    onTokenSaved?.()
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#181818] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Connection Settings</div>
            <div className="mt-1 text-sm text-white/45">Store a bearer token locally so the UI can talk to your authenticated backend.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex rounded-xl border border-white/8 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close connection settings"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Bearer token</span>
            <input
              name="token"
              type="password"
              defaultValue={initialToken}
              placeholder="Paste token here"
              className="mt-2 w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/14 focus:bg-white/8"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">API base URL</div>
              <div className="mt-2 break-all text-sm text-white/78">{baseUrl || 'Relative origin'}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Streaming</div>
              <div className="mt-2 text-sm text-white/78">{streamEnabled ? 'Enabled in config' : 'Disabled in config'}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/70">
            Backend status: <span className={cn('font-medium', backendStatus === 'connected' ? 'text-emerald-300' : backendStatus === 'auth-required' ? 'text-amber-300' : 'text-rose-300')}>{backendStatus}</span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setStoredToken('')
                onTokenSaved?.()
                onClose?.()
              }}
              className="rounded-2xl border border-white/8 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/72 transition hover:bg-white/10 hover:text-white"
            >
              Clear token
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-white/92"
            >
              Save token
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}