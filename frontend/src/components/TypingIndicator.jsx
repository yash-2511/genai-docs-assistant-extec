export function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-3 py-2 text-white/65">
      <span className="h-2 w-2 rounded-full bg-white/70 animate-pulseDots" style={{ animationDelay: '0ms' }} />
      <span className="h-2 w-2 rounded-full bg-white/70 animate-pulseDots" style={{ animationDelay: '140ms' }} />
      <span className="h-2 w-2 rounded-full bg-white/70 animate-pulseDots" style={{ animationDelay: '280ms' }} />
    </div>
  )
}