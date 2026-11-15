import { useId, useMemo, useState } from 'react'
import { formatCompact, formatMoney } from '../lib/format'

/* ------------------------------------------------------------------
   Shared helpers
   ------------------------------------------------------------------ */

interface XY {
  x: number
  y: number
}

function smoothPath(points: XY[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }
  return d
}

/* ------------------------------------------------------------------
   Income vs expense trend
   ------------------------------------------------------------------ */

export interface TrendPoint {
  label: string
  income: number
  expense: number
}

export function TrendChart({
  points,
  currency,
  masked,
  height = 240,
}: {
  points: TrendPoint[]
  currency: string
  masked: boolean
  height?: number
}) {
  const uid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)

  const width = 720
  const padTop = 18
  const padBottom = 30
  const padX = 14
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom

  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]))
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0

  const coords = (key: 'income' | 'expense'): XY[] =>
    points.map((p, i) => ({
      x: padX + stepX * i,
      y: padTop + innerH - (p[key] / max) * innerH,
    }))

  const incomePts = coords('income')
  const expensePts = coords('expense')

  const incomeLine = smoothPath(incomePts)
  const expenseLine = smoothPath(expensePts)
  const baseY = padTop + innerH

  const areaOf = (pts: XY[]) =>
    pts.length === 0
      ? ''
      : `${smoothPath(pts)} L${pts[pts.length - 1].x},${baseY} L${pts[0].x},${baseY} Z`

  const gridValues = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="chart-wrap" style={{ position: 'relative' }}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        role="img"
        aria-label="Income versus expenses over time"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const ratio = (event.clientX - rect.left) / rect.width
          const x = ratio * width
          const index = Math.round((x - padX) / (stepX || 1))
          setHover(Math.max(0, Math.min(points.length - 1, index)))
        }}
      >
        <defs>
          <linearGradient id={`inc-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C5F36B" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#C5F36B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`exp-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF7D6B" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FF7D6B" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridValues.map((g) => {
          const y = padTop + innerH - g * innerH
          return (
            <line
              key={g}
              className="chart-grid-line"
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray={g === 0 ? '0' : '3 5'}
            />
          )
        })}

        {points.map((p, i) => (
          <text
            key={`${p.label}-${i}`}
            className="chart-axis-label"
            x={padX + stepX * i}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            fill="rgba(255,255,255,0.34)"
            fontSize="10.5"
            letterSpacing="0.04em"
          >
            {p.label}
          </text>
        ))}

        <path d={areaOf(expensePts)} fill={`url(#exp-${uid})`} />
        <path d={areaOf(incomePts)} fill={`url(#inc-${uid})`} />
        <path
          d={expenseLine}
          fill="none"
          stroke="#FF7D6B"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d={incomeLine}
          fill="none"
          stroke="#C5F36B"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {hover !== null && points[hover] ? (
          <g>
            <line
              className="chart-cursor"
              x1={incomePts[hover].x}
              x2={incomePts[hover].x}
              y1={padTop - 4}
              y2={baseY}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1"
            />
            <circle cx={incomePts[hover].x} cy={incomePts[hover].y} r="4" fill="#C5F36B" stroke="#101114" strokeWidth="2" />
            <circle cx={expensePts[hover].x} cy={expensePts[hover].y} r="3.5" fill="#FF7D6B" stroke="#101114" strokeWidth="2" />
          </g>
        ) : null}
      </svg>

      {hover !== null && points[hover] ? (
        <div
          className="chart-tip"
          style={{
            left: `${(incomePts[hover].x / width) * 100}%`,
            top: 4,
            transform:
              hover > points.length / 2 ? 'translateX(-105%)' : 'translateX(5%)',
          }}
        >
          <div className="t-label">{points[hover].label}</div>
          <div className="row-between">
            <span className="row" style={{ gap: 6 }}>
              <span className="dot" style={{ background: '#C5F36B' }} />
              <span className="t-label">In</span>
            </span>
            <span className="t-value">{formatMoney(points[hover].income, currency, { masked, decimals: false })}</span>
          </div>
          <div className="row-between">
            <span className="row" style={{ gap: 6 }}>
              <span className="dot" style={{ background: '#FF7D6B' }} />
              <span className="t-label">Out</span>
            </span>
            <span className="t-value">{formatMoney(points[hover].expense, currency, { masked, decimals: false })}</span>
          </div>
        </div>
      ) : null}

      <div className="legend" style={{ marginTop: 10 }}>
        <span className="legend-row" style={{ border: 0, padding: 0 }}>
          <span className="dot" style={{ background: '#C5F36B' }} />
          <span className="legend-name">Income</span>
        </span>
        <span className="legend-row" style={{ border: 0, padding: 0 }}>
          <span className="dot" style={{ background: '#FF7D6B' }} />
          <span className="legend-name">Expenses</span>
        </span>
        <span className="legend-row" style={{ border: 0, padding: 0, marginLeft: 'auto' }}>
          <span className="legend-name">Peak {formatCompact(max, currency, masked)}</span>
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Donut — spending breakdown
   ------------------------------------------------------------------ */

export interface DonutSlice {
  label: string
  value: number
  color: string
}

export function Donut({
  slices,
  total,
  currency,
  masked,
  caption = 'Spent this month',
}: {
  slices: DonutSlice[]
  total: number
  currency: string
  masked: boolean
  caption?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const size = 190
  const stroke = 16
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  const sum = slices.reduce((acc, s) => acc + s.value, 0)
  let offset = 0

  return (
    <div className="row" style={{ gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Spending by category">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.055)"
            strokeWidth={stroke}
          />
          {sum > 0 &&
            slices.map((slice, i) => {
              const fraction = slice.value / sum
              const dash = fraction * circumference
              const el = (
                <circle
                  key={slice.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={active === i ? stroke + 4 : stroke}
                  strokeDasharray={`${Math.max(dash - 2, 0)} ${circumference}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{
                    transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                    opacity: active === null || active === i ? 1 : 0.45,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                />
              )
              offset += dash
              return el
            })}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div>
            <div className="stat-label" style={{ letterSpacing: '0.14em' }}>
              {active !== null && slices[active] ? slices[active].label.toUpperCase() : caption.toUpperCase()}
            </div>
            <div className="stat-value" style={{ fontSize: 22, marginTop: 4 }}>
              {formatMoney(
                active !== null && slices[active] ? slices[active].value : total,
                currency,
                { masked, decimals: false },
              )}
            </div>
            {active !== null && slices[active] && sum > 0 ? (
              <div className="tx-meta" style={{ justifyContent: 'center' }}>
                {((slices[active].value / sum) * 100).toFixed(1)}% of spend
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="legend" style={{ flex: 1, minWidth: 180 }}>
        {slices.length === 0 ? (
          <span className="empty-text">No expenses recorded yet.</span>
        ) : (
          slices.slice(0, 6).map((slice, i) => (
            <div
              key={slice.label}
              className="legend-row"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="dot" style={{ background: slice.color }} />
              <span className="legend-name">{slice.label}</span>
              <span className="legend-pct">{sum > 0 ? Math.round((slice.value / sum) * 100) : 0}%</span>
              <span className="legend-val">{formatMoney(slice.value, currency, { masked, decimals: false })}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Monthly bars
   ------------------------------------------------------------------ */

export function MonthlyBars({
  points,
  currency,
  masked,
  height = 220,
}: {
  points: TrendPoint[]
  currency: string
  masked: boolean
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 720
  const padTop = 16
  const padBottom = 30
  const padX = 12
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]))
  const slot = points.length > 0 ? innerW / points.length : innerW
  const barW = Math.min(20, slot / 3.4)

  return (
    <div style={{ position: 'relative' }}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Monthly income and expenses"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((g) => (
          <line
            key={g}
            x1={padX}
            x2={width - padX}
            y1={padTop + innerH - g * innerH}
            y2={padTop + innerH - g * innerH}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray={g === 0 ? '0' : '3 5'}
          />
        ))}
        {points.map((p, i) => {
          const cx = padX + slot * i + slot / 2
          const incH = (p.income / max) * innerH
          const expH = (p.expense / max) * innerH
          const dim = hover !== null && hover !== i
          return (
            <g key={p.label} onMouseEnter={() => setHover(i)} style={{ opacity: dim ? 0.5 : 1, transition: 'opacity .15s' }}>
              <rect x={padX + slot * i} y={padTop} width={slot} height={innerH} fill="transparent" />
              <rect
                x={cx - barW - 2}
                y={padTop + innerH - incH}
                width={barW}
                height={Math.max(incH, p.income > 0 ? 3 : 0)}
                rx={4}
                fill="#C5F36B"
              />
              <rect
                x={cx + 2}
                y={padTop + innerH - expH}
                width={barW}
                height={Math.max(expH, p.expense > 0 ? 3 : 0)}
                rx={4}
                fill="#FF7D6B"
                opacity="0.85"
              />
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.34)"
                fontSize="10.5"
                letterSpacing="0.04em"
              >
                {p.label}
              </text>
            </g>
          )
        })}
      </svg>
      {hover !== null && points[hover] ? (
        <div className="chart-tip" style={{ right: 0, top: 0 }}>
          <div className="t-label">{points[hover].label}</div>
          <div className="row-between">
            <span className="t-label">Income</span>
            <span className="t-value">{formatMoney(points[hover].income, currency, { masked, decimals: false })}</span>
          </div>
          <div className="row-between">
            <span className="t-label">Expenses</span>
            <span className="t-value">{formatMoney(points[hover].expense, currency, { masked, decimals: false })}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------
   Single-series line (savings rate)
   ------------------------------------------------------------------ */

export function RateLine({
  values,
  labels,
  height = 170,
}: {
  values: number[]
  labels: string[]
  height?: number
}) {
  const width = 720
  const padTop = 14
  const padBottom = 26
  const padX = 10
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const min = Math.min(0, ...values)
  const max = Math.max(20, ...values)
  const span = max - min || 1
  const step = values.length > 1 ? innerW / (values.length - 1) : 0

  const pts = values.map((v, i) => ({
    x: padX + step * i,
    y: padTop + innerH - ((v - min) / span) * innerH,
  }))

  const zeroY = padTop + innerH - ((0 - min) / span) * innerH

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Savings rate trend"
    >
      <defs>
        <linearGradient id="rate-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C5F36B" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#C5F36B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padX} x2={width - padX} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 5" />
      {pts.length > 0 ? (
        <>
          <path d={`${smoothPath(pts)} L${pts[pts.length - 1].x},${zeroY} L${pts[0].x},${zeroY} Z`} fill="url(#rate-grad)" />
          <path d={smoothPath(pts)} fill="none" stroke="#C5F36B" strokeWidth="2.2" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={labels[i] ?? i} cx={p.x} cy={p.y} r="3" fill="#101114" stroke="#C5F36B" strokeWidth="1.8" />
          ))}
          {labels.map((label, i) => (
            <text
              key={label}
              x={padX + step * i}
              y={height - 6}
              textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
              fill="rgba(255,255,255,0.34)"
              fontSize="10.5"
            >
              {label}
            </text>
          ))}
        </>
      ) : null}
    </svg>
  )
}

/* ------------------------------------------------------------------
   Sparkline
   ------------------------------------------------------------------ */

export function Sparkline({ values, tone = '#C5F36B' }: { values: number[]; tone?: string }) {
  const pts = useMemo(() => {
    if (values.length === 0) return []
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    return values.map((v, i) => ({
      x: (i / Math.max(values.length - 1, 1)) * 100,
      y: 28 - ((v - min) / span) * 24,
    }))
  }, [values])

  if (pts.length < 2) return null
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" style={{ width: '100%', height: 30 }} aria-hidden="true">
      <path d={smoothPath(pts)} fill="none" stroke={tone} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
