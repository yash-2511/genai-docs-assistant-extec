import { useMemo, useState } from 'react'

import { cn } from '../utils/helpers'

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="currentColor" d="M11 2.5h2l.7 5.2 4.7 1.5-3 4.1 1 5.2-4.4-2.4-4.4 2.4 1-5.2-3-4.1 4.7-1.5L11 2.5Zm1 5.7-.2 1.5-1.4.4 1 .6-.3 1.5 1.2-.7 1.2.7-.3-1.5 1-.6-1.4-.4-.2-1.5Z" />
    </svg>
  )
}

export function AuthScreen({ mode, onModeChange, onLogin, onSignup, loading, error, baseUrl }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const isSignup = mode === 'signup'

  const title = useMemo(() => (isSignup ? 'Create your account' : 'Welcome back'), [isSignup])
  const subtitle = useMemo(
    () => (isSignup ? 'Create an account to save sessions and continue across devices.' : 'Sign in to resume your RAG chat workspace.'),
    [isSignup],
  )

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSignup) {
      await onSignup?.({
        name: form.name,
        email: form.email,
        password: form.password,
      })
      return
    }

    await onLogin?.({
      email: form.email,
      password: form.password,
    })
  }

  return (
    <div className="flex min-h-screen items-stretch bg-shell text-white">
      <div className="hidden flex-1 flex-col justify-between border-r border-white/6 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_28%),linear-gradient(180deg,#121212_0%,#181818_100%)] px-10 py-10 lg:flex">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-orange-100">
            <SparkIcon />
            RAG Chat
          </div>
          <h1 className="mt-10 max-w-xl text-5xl font-semibold tracking-tight text-white">
            Sign in to your document-aware chat workspace.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/55">
            Keep your sessions, uploads, and citations tied to your account Safely.
          </p>
        </div>

        <div className="max-w-md rounded-[2rem] border border-white/8 bg-white/5 p-5 text-sm leading-6 text-white/55 shadow-glow">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Ask all you want</div>
          
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-4 py-8 sm:px-6 lg:w-[520px] lg:px-8">
        <div className="w-full max-w-md rounded-[2.25rem] border border-white/8 bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Authentication</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">{subtitle}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6 text-lg font-semibold text-white ring-1 ring-white/8">
              R
            </div>
          </div>

          <div className="mb-5 inline-flex rounded-2xl border border-white/8 bg-white/5 p-1 text-sm">
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className={cn(
                'rounded-xl px-4 py-2 transition',
                !isSignup ? 'bg-accent text-white' : 'text-white/65 hover:text-white',
              )}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onModeChange('signup')}
              className={cn(
                'rounded-xl px-4 py-2 transition',
                isSignup ? 'bg-accent text-white' : 'text-white/65 hover:text-white',
              )}
            >
              Sign up
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignup ? (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="mt-2 w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-accent/35 focus:bg-accent/8"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Email</span>
              <input
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-accent/35 focus:bg-accent/8"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Password</span>
              <input
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                type="password"
                placeholder="Enter password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-accent/35 focus:bg-accent/8"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-accentSoft disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
            >
              {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Login'}
            </button>
          </form>

          <p className="mt-5 text-xs leading-5 text-white/35">
          </p>
        </div>
      </div>
    </div>
  )
}