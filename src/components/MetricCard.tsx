import type { ReactNode } from 'react'

type MetricCardProps = {
  label: string
  value: string
  change?: string
  tone?: 'positive' | 'negative' | 'neutral' | 'violet'
  icon?: ReactNode
  hint?: string
}

export function MetricCard({ label, value, change, tone = 'neutral', icon, hint }: MetricCardProps) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-topline">
        <span className="metric-label">{label}</span>
        {icon && <span className="metric-icon">{icon}</span>}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-footer">
        {change && <span className={`metric-change ${tone === 'negative' ? 'change-negative' : 'change-positive'}`}>{change}</span>}
        {hint && <span className="metric-hint">{hint}</span>}
      </div>
    </article>
  )
}
