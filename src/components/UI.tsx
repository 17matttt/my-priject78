import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'

/* ------------------------------------------------------------------
   Toasts
   ------------------------------------------------------------------ */

type Tone = 'ok' | 'err' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: Tone
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, tone: Tone = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev.slice(-2), { id, message, tone }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-host" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

/* ------------------------------------------------------------------
   Modal
   ------------------------------------------------------------------ */

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, subtitle, children, footer }: ModalProps) {
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
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle ? <p className="modal-sub">{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Confirmation
   ------------------------------------------------------------------ */

interface ConfirmProps {
  open: boolean
  title: string
  text: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onClose,
}: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={text}
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="settings-desc">
        This action is permanent. Your records are removed immediately and cannot be recovered.
      </p>
    </Modal>
  )
}

/* ------------------------------------------------------------------
   Layout primitives
   ------------------------------------------------------------------ */

export function PageHead({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string
  title: string
  sub?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div>
        {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
        <h1 className="page-title">{title}</h1>
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      {actions ? <div className="head-actions">{actions}</div> : null}
    </header>
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
      <h3 className="empty-title">{title}</h3>
      <p className="empty-text">{text}</p>
      {action ? <div className="row" style={{ marginTop: 4 }}>{action}</div> : null}
    </div>
  )
}

export function Progress({ value, tone }: { value: number; tone?: 'warn' | 'over' }) {
  const width = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100)
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(width)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill ${tone ?? ''}`} style={{ width: `${width}%` }} />
    </div>
  )
}

export function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`field ${className ?? ''}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  )
}

export function MonthNav({
  label,
  onPrev,
  onNext,
  nextDisabled,
  onReset,
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  nextDisabled?: boolean
  onReset?: () => void
}) {
  return (
    <div className="month-nav">
      <button type="button" className="icon-btn" onClick={onPrev} aria-label="Previous month">
        <ChevronLeft />
      </button>
      <button type="button" className="t-label" onClick={onReset} title="Jump to current month">
        {label}
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={onNext}
        aria-label="Next month"
        disabled={nextDisabled}
      >
        <ChevronRight />
      </button>
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: string }) {
  return <div className="skeleton" style={{ height, width }} />
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'lime' | 'red' | 'warn' | 'info'
  children: ReactNode
}) {
  return <span className={`badge ${tone}`}>{children}</span>
}

/** Small pill showing a change versus the previous period. */
export function Delta({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null) {
    return <span className="delta flat">New</span>
  }
  const tone = value > 0.5 ? 'up' : value < -0.5 ? 'down' : 'flat'
  const arrow = value > 0.5 ? '↑' : value < -0.5 ? '↓' : '→'
  return (
    <span className={`delta ${tone}`}>
      {arrow} {Math.abs(value).toFixed(1)}%{suffix ? ` ${suffix}` : ''}
    </span>
  )
}
