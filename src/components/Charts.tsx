import { useMemo, useRef, useState } from 'react'

export interface SeriesPoint {
  label: string
  value: number
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const midX = (p0.x + p1.x) / 2
    d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`
  }
  return d
}

/* -------------------------------- area chart ------------------------------- */

export function AreaChart({
  points,
  height = 220,
  formatValue,
  tone = 'accent',
}: {
  points: SeriesPoint[]
  height?: number
  formatValue: (v: number) => string
  tone?: 'accent' | 'blue'
}) {
  const [active, setActive] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const geometry = useMemo(() => {
    if (!points.length) return null
    const values = points.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || Math.abs(max) || 1
    const padded = points.map((p, i) => ({
      x: points.length === 1 ? 50 : (i / (points.length - 1)) * 100,
      y: 88 - ((p.value - min) / span) * 72,
      value: p.value,
      label: p.label,
    }))
    return { padded, min, max }
  }, [points])

  if (!geometry) return <div className="chart-empty">Aucune donnée sur cette période</div>

  const { padded } = geometry
  const line = buildSmoothPath(padded)
  const area = `${line} L 100 100 L 0 100 Z`
  const activePoint = active !== null ? padded[active] : null

  const handleMove = (clientX: number) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setActive(Math.round(ratio * (padded.length - 1)))
  }

  return (
    <div className="chart-wrap" ref={wrapRef} style={{ height }}>
      <svg
        className="chart-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setActive(null)}
        role="img"
        aria-label="Évolution du solde"
      >
        <defs>
          <linearGradient id={`grad-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone === 'accent' ? '#C5F36B' : '#8FB8FF'} stopOpacity="0.28" />
            <stop offset="100%" stopColor={tone === 'accent' ? '#C5F36B' : '#8FB8FF'} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[22, 48, 74].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} className="grid-line" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#grad-${tone})`} />
        <path
          d={line}
          fill="none"
          className={`chart-line ${tone === 'accent' ? 'line-accent' : 'line-blue'}`}
          vectorEffect="non-scaling-stroke"
        />
        {activePoint ? (
          <line
            x1={activePoint.x}
            y1="0"
            x2={activePoint.x}
            y2="100"
            className="crosshair"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      {activePoint ? (
        <>
          <span className="chart-dot" style={{ left: `${activePoint.x}%`, top: `${activePoint.y}%` }} />
          <div
            className="chart-tip"
            style={{ left: `${Math.min(88, Math.max(12, activePoint.x))}%` }}
          >
            <span className="tip-label">{points[active ?? 0].label}</span>
            <span className="tip-value tnum">{formatValue(activePoint.value)}</span>
          </div>
        </>
      ) : null}

      <div className="chart-axis">
        {points.map((p, i) =>
          i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2) ? (
            <span key={`${p.label}-${i}`}>{p.label}</span>
          ) : null,
        )}
      </div>
    </div>
  )
}

/* -------------------------------- bar chart -------------------------------- */

export interface FlowBar {
  label: string
  income: number
  expense: number
}

export function BarsChart({
  points,
  formatValue,
  height = 200,
}: {
  points: FlowBar[]
  formatValue: (v: number) => string
  height?: number
}) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]))

  if (!points.length) return <div className="chart-empty">Aucune donnée</div>

  return (
    <div className="bars" style={{ height }}>
      <div className="bars-plot">
        {points.map((p, i) => (
          <div
            key={`${p.label}-${i}`}
            className={`bars-group ${active === i ? 'is-active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            tabIndex={0}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${p.label} : revenus ${formatValue(p.income)}, dépenses ${formatValue(p.expense)}`}
          >
            <div className="bar-pair">
              <span className="bar bar-income" style={{ height: `${(p.income / max) * 100}%` }} />
              <span className="bar bar-expense" style={{ height: `${(p.expense / max) * 100}%` }} />
            </div>
            <span className="bar-label">{p.label}</span>
            {active === i ? (
              <div className="chart-tip bar-tip">
                <span className="tip-label">{p.label}</span>
                <span className="tip-value tnum">+{formatValue(p.income)}</span>
                <span className="tip-value tnum muted">−{formatValue(p.expense)}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------- donut ---------------------------------- */

export interface DonutSlice {
  id: string
  label: string
  value: number
  color: string
}

export function DonutChart({
  slices,
  size = 190,
  centerLabel,
  formatValue,
}: {
  slices: DonutSlice[]
  size?: number
  centerLabel: string
  formatValue: (v: number) => string
}) {
  const [active, setActive] = useState<string | null>(null)
  const total = slices.reduce((s, x) => s + x.value, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius

  let offset = 0
  const arcs = slices.map((slice) => {
    const fraction = total > 0 ? slice.value / total : 0
    const arc = {
      ...slice,
      dash: fraction * circumference,
      offset,
      fraction,
    }
    offset += fraction * circumference
    return arc
  })

  const focused = active ? slices.find((s) => s.id === active) : null

  if (!total) return <div className="chart-empty">Aucune dépense sur cette période</div>

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="donut-svg">
          <circle cx="50" cy="50" r={radius} className="donut-track" />
          {arcs.map((arc) => (
            <circle
              key={arc.id}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={active === arc.id ? 13 : 10}
              strokeDasharray={`${Math.max(0, arc.dash - 1.2)} ${circumference}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="round"
              className="donut-arc"
              onMouseEnter={() => setActive(arc.id)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="donut-center">
          <span className="donut-label">{focused ? focused.label : centerLabel}</span>
          <span className="donut-value tnum">
            {formatValue(focused ? focused.value : total)}
          </span>
          {focused ? (
            <span className="donut-share">{Math.round((focused.value / total) * 100)} %</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ horizontal bars ----------------------------- */

export function CategoryBars({
  slices,
  formatValue,
}: {
  slices: { id: string; label: string; value: number; percent: number; color: string; icon?: string }[]
  formatValue: (v: number) => string
}) {
  if (!slices.length) return <div className="chart-empty">Aucune donnée</div>
  return (
    <ul className="cat-bars">
      {slices.map((s) => (
        <li key={s.id} className="cat-bar-row">
          <div className="cat-bar-head">
            <span className="cat-bar-label">{s.label}</span>
            <span className="cat-bar-value tnum">{formatValue(s.value)}</span>
          </div>
          <div className="cat-bar-track">
            <span
              className="cat-bar-fill"
              style={{ width: `${Math.max(2, s.percent)}%`, background: s.color }}
            />
          </div>
          <span className="cat-bar-percent tnum">{Math.round(s.percent)} %</span>
        </li>
      ))}
    </ul>
  )
}

/* --------------------------------- sparkline -------------------------------- */

export function Sparkline({
  values,
  tone = 'accent',
  width = 96,
  height = 28,
}: {
  values: number[]
  tone?: 'accent' | 'danger' | 'muted'
  width?: number
  height?: number
}) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - 3 - ((v - min) / span) * (height - 6),
  }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} className={`sparkline spark-${tone}`} aria-hidden="true">
      <path d={d} fill="none" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/* -------------------------------- line chart ------------------------------- */

export function LineChart({
  points,
  height = 200,
  formatValue,
  suffix = '',
}: {
  points: SeriesPoint[]
  height?: number
  formatValue: (v: number) => string
  suffix?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  if (points.length < 2) return <div className="chart-empty">Pas encore assez de données</div>

  const values = points.map((p) => p.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const span = max - min || 1
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * 100,
    y: 88 - ((p.value - min) / span) * 76,
    ...p,
  }))
  const d = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const point = active !== null ? coords[active] : null

  return (
    <div
      className="chart-wrap"
      ref={wrapRef}
      style={{ height }}
      onMouseMove={(e) => {
        const el = wrapRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
        setActive(Math.round(ratio * (coords.length - 1)))
      }}
      onMouseLeave={() => setActive(null)}
    >
      <svg className="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[22, 48, 74].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} className="grid-line" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={d} fill="none" className="chart-line line-accent" vectorEffect="non-scaling-stroke" />
        {point ? (
          <line x1={point.x} y1="0" x2={point.x} y2="100" className="crosshair" vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      {point ? (
        <>
          <span className="chart-dot" style={{ left: `${point.x}%`, top: `${point.y}%` }} />
          <div className="chart-tip" style={{ left: `${Math.min(88, Math.max(12, point.x))}%` }}>
            <span className="tip-label">{point.label}</span>
            <span className="tip-value tnum">
              {formatValue(point.value)}
              {suffix}
            </span>
          </div>
        </>
      ) : null}
      <div className="chart-axis">
        {points.map((p, i) =>
          i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2) ? (
            <span key={`${p.label}-${i}`}>{p.label}</span>
          ) : null,
        )}
      </div>
    </div>
  )
}
