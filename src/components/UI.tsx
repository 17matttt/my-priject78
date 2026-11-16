import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { initials } from '../lib/format'

export function Panel({
  title,
  sub,
  action,
  children,
  className = '',
  flush = false,
  accent = false,
  delay,
}: {
  title?: ReactNode
  sub?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean
  accent?: boolean
  delay?: number
}) {
  return (
    <section
      className={`panel ${accent ? 'panel--accent' : ''} ${className}`}
      style={delay !== undefined ? { animationDelay: `${delay}ms` } : undefined}
    >
      {(title || action) && (
        <header className="panel-head">
          <div style={{ minWidth: 0 }}>
            {title && <h3 className="panel-title">{title}</h3>}
            {sub && <p className="panel-sub">{sub}</p>}
          </div>
          {action && <div className="panel-action">{action}</div>}
        </header>
      )}
      <div className={flush ? 'panel-body panel-body--flush' : 'panel-body'}>{children}</div>
    </section>
  )
}

export function PageHead({
  title,
  sub,
  children,
  eyebrow,
}: {
  title: string
  sub?: string
  children?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger'

export function Btn({
  variant = 'ghost',
  size,
  icon,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant
  size?: 'sm'
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${size === 'sm' ? 'btn--sm' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function Badge({
  tone = 'neutral',
  children,
  dot,
}: {
  tone?: 'neutral' | 'accent' | 'violet' | 'good' | 'warn' | 'bad'
  children: ReactNode
  dot?: boolean
}) {
  return (
    <span className={`badge ${tone === 'neutral' ? '' : `badge--${tone}`}`}>
      {dot && <span className="prio prio--low" style={{ background: 'currentColor', boxShadow: 'none' }} />}
      {children}
    </span>
  )
}

export function DemoTag() {
  return <span className="badge badge--demo">Demo</span>
}

export function Chip({
  active,
  children,
  onClick,
  count,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  count?: number
}) {
  return (
    <button type="button" className={`chip ${active ? 'is-on' : ''}`} onClick={onClick}>
      {children}
      {count !== undefined && <span className="chip-count">{count}</span>}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label?: string
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`segmented-item ${option.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Progress({
  value,
  tone = 'accent',
  height,
}: {
  value: number
  tone?: 'accent' | 'good' | 'warn' | 'bad'
  height?: number
}) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <div className="progress" style={height ? { height } : undefined}>
      <div
        className={`progress-fill ${tone === 'accent' ? '' : `progress-fill--${tone}`}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'is-on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  )
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`field ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`select ${props.className || ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`textarea ${props.className || ''}`} />
}

export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  size,
}: {
  open: boolean
  onClose: () => void
  title: string
  sub?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'lg'
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        className={`modal ${size === 'lg' ? 'modal--lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <h2 className="modal-title" id={titleId}>
              {title}
            </h2>
            {sub && <p className="modal-sub">{sub}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
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
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <p className="empty-text">{text}</p>
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  )
}

export function Avatar({ name, size }: { name: string; size?: 'sm' | 'lg' }) {
  return (
    <div className={`avatar ${size === 'sm' ? 'avatar--sm' : size === 'lg' ? 'avatar--lg' : ''}`}>
      {initials(name)}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  badge,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="panel stat">
      <div className="stat-top">
        {label}
        {badge}
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export function Row({
  icon,
  title,
  sub,
  meta,
  onClick,
  right,
  demo,
}: {
  icon?: ReactNode
  title: ReactNode
  sub?: ReactNode
  meta?: ReactNode
  onClick?: () => void
  right?: ReactNode
  demo?: boolean
}) {
  const content = (
    <>
      {icon && <span className="li-icon">{icon}</span>}
      <span className="li-main">
        <span className="li-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {title}
          {demo && <span className="badge badge--demo">Demo</span>}
        </span>
        {sub && <span className="li-sub" style={{ display: 'block' }}>{sub}</span>}
      </span>
      {right}
      {meta && <span className="li-meta">{meta}</span>}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className="list-item list-item--btn" onClick={onClick}>
        {content}
      </button>
    )
  }
  return <div className="list-item">{content}</div>
}
