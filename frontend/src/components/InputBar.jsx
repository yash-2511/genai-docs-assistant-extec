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
    <div className="border-t border-white/8 bg-panel/96 px-4 py-3 backdrop-blur-xl sm:px-5">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[24px] border border-white/8 bg-panelSoft px-3 py-3">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleAttachClick}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-3 text-sm text-white/75 transition hover:bg-accent/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
            >
              <PaperclipIcon />
              Attach
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => onChange?.(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={1}
              placeholder={placeholder}
              className="min-h-11 max-h-28 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-[15px] leading-6 text-white placeholder:text-white/35 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              onClick={onSend}
              disabled={disabled || !value.trim()}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 text-sm font-medium text-white transition hover:bg-accentSoft disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/35"
            >
              <SendIcon />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}