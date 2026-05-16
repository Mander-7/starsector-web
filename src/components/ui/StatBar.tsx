interface StatBarProps {
  label: string
  value: number
  max: number
  color: string
  showText?: boolean
}

export function StatBar({ label, value, max, color, showText = true }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-text-dim)] w-10 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-[var(--color-panel-border)] rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showText && (
        <span className="text-xs text-[var(--color-text)] w-20 text-right">
          {Math.round(value)}/{max}
        </span>
      )}
    </div>
  )
}
