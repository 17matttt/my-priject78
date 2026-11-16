import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { initials } from '../lib/format'
import { Sparkline } from './Charts'

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent'

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Btn({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'dark' | 'ghost' | 'soft' | 'danger' | 'outline'
  size?: 'sm' | 'md'
  icon?: ReactNode
}) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...rest}>
      {icon ? <span className="btn-icon">{icon}</span> : null}
      {children ? <span>{children}</span> : null}
    </button>
  )
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  tone = 'light',
  className = '',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  tone?: 'light' | 'glass'
  className?: string
}) {
  return (
    <section className={`panel panel-${tone} ${className}`}>
      {title || action ? (
        <header className="panel-head">
          <div className="panel-head-text">
            {title ? <h3 className="panel-title">{title}</h3> : null}
            {subtitle ? <p className="panel-sub">{subtitle}</p> : null}
          </div>
          {action ? <div className="panel-action">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {eyebrow ? <span className="page-eyebrow">{eyebrow}</span> : null}
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  )
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  spark,
  accent = '#17C3B2',
  onLight = true,
}: {
  label: string
  value: string
  hint?: string
  delta?: number
  icon: ReactNode
  spark?: number[]
  accent?: string
  onLight?: boolean
}) {
  const positive = (delta ?? 0) >= 0
  return (
    <article className={`stat-card ${onLight ? 'stat-light' : 'stat-glass'}`}>
      <div className="stat-top">
        <span className="stat-icon" style={{ background: `${accent}1f`, color: accent }}>
          {icon}
        </span>
        {typeof delta === 'number' ? (
          <span className={`stat-delta ${positive ? 'up' : 'down'}`}>
            {positive ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </div>
      <p className="stat-label">{label}</p>
      <div className="stat-value-row">
        <strong className="stat-value">{value}</strong>
        {spark && spark.length > 1 ? (
          <span className="stat-spark">
            <Sparkline values={spark} color={accent} />
          </span>
        ) : null}
      </div>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  )
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle ? <p className="modal-sub">{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string
  hint?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={`segmented ${className}`} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={`segmented-item ${value === opt.value ? 'is-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          {typeof opt.count === 'number' ? <span className="segmented-count">{opt.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'warning' | 'danger' | 'success' }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span className={`progress-fill progress-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Avatar({ name, hue = 174, size = 38 }: { name: string; hue?: number; size?: number }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.34),
        background: `linear-gradient(135deg, hsl(${hue} 62% 46%), hsl(${(hue + 42) % 360} 70% 34%))`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
}) {
  const id = useId()
  return (
    <div className="toggle-row">
      <div className="toggle-text">
        <label htmlFor={id} className="toggle-label">
          {label}
        </label>
        {description ? <p className="toggle-desc">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`toggle ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <input
      type="search"
      className={`input search-input ${className}`}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
