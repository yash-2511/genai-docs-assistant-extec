import { useEffect, useRef, useState } from 'react'

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="m3.5 20.5 17-8.5-17-8.5v6.5l10 2-10 2v6.5Z" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="currentColor" d="M8.5 18.5 5 15a5 5 0 0 1 0-7.07l6.36-6.36a4 4 0 0 1 5.66 5.66l-7.07 7.07a2 2 0 0 1-2.83-2.83l5.66-5.66 1.41 1.41-5.66 5.66a.5.5 0 1 0 .71.71l7.07-7.07a2 2 0 1 0-2.83-2.83L7.83 10.5a3 3 0 0 0 4.24 4.24l7.07-7.07 1.41 1.41-7.07 7.07a5 5 0 0 1-7.07 0Z" />
    </svg>
  )
}

export function InputBar({
  value,
  onChange,
  onSend,
  onAttach,
  disabled,
  placeholder = 'Ask a question about your documents…',
}) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    setCharCount(value.length)
    const element = textareaRef.current
    if (!element) return

    element.style.height = '0px'
    const nextHeight = Math.min(element.scrollHeight, 180)
    element.style.height = `${nextHeight}px`
  }, [value])

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend?.()
    }
  }

  function handleAttachClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (file) {
      onAttach?.(file)
      event.target.value = ''
    }
  }

  return (
    <div className="border-t border-white/8 bg-[#171717]/96 px-4 py-4 backdrop-blur-xl sm:px-5">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[28px] border border-white/8 bg-[#1c1c1c] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={placeholder}
            className="min-h-[58px] w-full resize-none border-0 bg-transparent px-2 py-3 text-[15px] leading-7 text-white placeholder:text-white/35 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/6 px-1 pt-3">
            <div className="flex items-center gap-2 text-white/45">
              <button
                type="button"
                onClick={handleAttachClick}
                className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
              >
                <PaperclipIcon />
                Attach
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              <span className="hidden text-xs sm:inline">Shift+Enter for newline</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-white/35">{charCount.toLocaleString()} chars</div>
              <button
                type="button"
                onClick={onSend}
                disabled={disabled || !value.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-white/92 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/35"
              >
                <SendIcon />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}