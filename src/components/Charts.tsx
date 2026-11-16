import { useId, useRef, useState } from 'react'

interface Point {
  label: string
  value: number
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (!pts.length) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i]
    const p1 = pts[i + 1]
    const cx = (p0.x + p1.x) / 2
    d += ` C${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`
  }
  return d
}

export function AreaChart({
  data,
  height = 220,
  format,
  color = '#17C3B2',
}: {
  data: Point[]
  height?: number
  format: (value: number) => string
  color?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const gradientId = useId().replace(/:/g, '')

  const W = 720
  const PAD = { t: 18, r: 10, b: 24, l: 10 }
  const innerW = W - PAD.l - PAD.r
  const innerH = height - PAD.t - PAD.b
  const max = Math.max(...data.map((d) => d.value), 1) * 1.15

  const xFor = (i: number) =>
    PAD.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const yFor = (v: number) => PAD.t + innerH - (v / max) * innerH

  const pts = data.map((d, i) => ({ x: xFor(i), y: yFor(d.value) }))
  const line = smoothPath(pts)
  const area = pts.length
    ? `${line} L${pts[pts.length - 1].x},${PAD.t + innerH} L${pts[0].x},${PAD.t + innerH} Z`
    : ''

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect || data.length === 0) return
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
    setHover(Math.round(ratio * (data.length - 1)))
  }

  const active = hover !== null ? data[hover] : null

  return (
    <div
      className="chart-wrap"
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
      style={{ height }}
    >
      <svg viewBox={`0 0 ${W} ${height}`} className="chart-svg" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.34" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <line
            key={tick}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={PAD.t + innerH * tick}
            y2={PAD.t + innerH * tick}
            className="chart-grid"
          />
        ))}
        {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
        {line ? <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" /> : null}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hover === i ? 6 : 3.5}
            fill="#fff"
            stroke={color}
            strokeWidth={hover === i ? 3 : 2}
            className="chart-dot"
          />
        ))}
        {hover !== null && pts[hover] ? (
          <line
            x1={pts[hover].x}
            x2={pts[hover].x}
            y1={PAD.t}
            y2={PAD.t + innerH}
            className="chart-guide"
          />
        ) : null}
      </svg>

      {active ? (
        <div
          className="chart-tip"
          style={{ left: `${((hover ?? 0) / Math.max(data.length - 1, 1)) * 100}%` }}
        >
          <span className="chart-tip-label">{active.label}</span>
          <strong className="chart-tip-value">{format(active.value)}</strong>
        </div>
      ) : null}

      <div className="chart-xaxis">
        {data.map((d, i) => (
          <span key={`${d.label}-${i}`} className={hover === i ? 'is-active' : ''}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function BarChart({
  data,
  height = 230,
  format,
  colors = ['#17C3B2', '#123B57'],
  labels = ['Income', 'Expenses'],
}: {
  data: { label: string; a: number; b: number }[]
  height?: number
  format: (value: number) => string
  colors?: [string, string] | string[]
  labels?: [string, string] | string[]
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const PAD = { t: 18, r: 10, b: 26, l: 10 }
  const innerW = W - PAD.l - PAD.r
  const innerH = height - PAD.t - PAD.b
  const max = Math.max(...data.flatMap((d) => [d.a, d.b]), 1) * 1.12
  const groupW = innerW / Math.max(data.length, 1)
  const barW = Math.min(16, groupW * 0.26)

  const active = hover !== null ? data[hover] : null

  return (
    <div className="chart-wrap" style={{ height }} onMouseLeave={() => setHover(null)}>
      <div className="chart-legend">
        <span className="legend-item">
          <i style={{ background: colors[0] }} />
          {labels[0]}
        </span>
        <span className="legend-item">
          <i style={{ background: colors[1] }} />
          {labels[1]}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} className="chart-svg" preserveAspectRatio="none" aria-hidden="true">
        {[0, 0.5, 1].map((tick) => (
          <line
            key={tick}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={PAD.t + innerH * tick}
            y2={PAD.t + innerH * tick}
            className="chart-grid"
          />
        ))}
        {data.map((d, i) => {
          const cx = PAD.l + groupW * i + groupW / 2
          const ah = (d.a / max) * innerH
          const bh = (d.b / max) * innerH
          const isActive = hover === i
          return (
            <g
              key={`${d.label}-${i}`}
              onMouseEnter={() => setHover(i)}
              className={isActive ? 'bar-group is-active' : 'bar-group'}
            >
              <rect x={cx - groupW / 2} y={PAD.t} width={groupW} height={innerH} fill="transparent" />
              <rect
                x={cx - barW - 2}
                y={PAD.t + innerH - ah}
                width={barW}
                height={Math.max(ah, 2)}
                rx={barW / 2}
                fill={colors[0]}
                opacity={hover === null || isActive ? 1 : 0.55}
              />
              <rect
                x={cx + 2}
                y={PAD.t + innerH - bh}
                width={barW}
                height={Math.max(bh, 2)}
                rx={barW / 2}
                fill={colors[1]}
                opacity={hover === null || isActive ? 1 : 0.55}
              />
            </g>
          )
        })}
      </svg>
      {active ? (
        <div className="chart-tip chart-tip-static" style={{ left: `${((hover ?? 0) / Math.max(data.length - 1, 1)) * 100}%` }}>
          <span className="chart-tip-label">{active.label}</span>
          <strong className="chart-tip-value">{format(active.a)}</strong>
          <span className="chart-tip-sub">{format(active.b)}</span>
        </div>
      ) : null}
      <div className="chart-xaxis">
        {data.map((d, i) => (
          <span key={`${d.label}-lbl-${i}`} className={hover === i ? 'is-active' : ''}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Donut({
  slices,
  size = 190,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="donut-wrap">
      <div className="donut-chart" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(10,40,66,0.08)"
            strokeWidth={thickness}
          />
          {slices.map((slice) => {
            const fraction = total ? slice.value / total : 0
            const dash = fraction * circumference
            const el = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={hover === slice.label ? thickness + 4 : thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                opacity={hover && hover !== slice.label ? 0.45 : 1}
                className="donut-slice"
                onMouseEnter={() => setHover(slice.label)}
                onMouseLeave={() => setHover(null)}
              />
            )
            offset += dash
            return el
          })}
        </svg>
        <div className="donut-center">
          <strong>{centerValue ?? total}</strong>
          <span>{centerLabel ?? 'Total'}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {slices.map((slice) => (
          <li
            key={slice.label}
            className={hover === slice.label ? 'is-active' : ''}
            onMouseEnter={() => setHover(slice.label)}
            onMouseLeave={() => setHover(null)}
          >
            <i style={{ background: slice.color }} />
            <span className="donut-legend-label">{slice.label}</span>
            <span className="donut-legend-value">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Sparkline({ values, color = '#17C3B2' }: { values: number[]; color?: string }) {
  const W = 74
  const H = 28
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = values.length <= 1 ? W / 2 : (i / (values.length - 1)) * W
    const y = H - ((v - min) / span) * (H - 4) - 2
    return { x, y }
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const gid = useId().replace(/:/g, '')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Gauge({
  value,
  label,
  sub,
  size = 132,
}: {
  value: number
  label: string
  sub?: string
  size?: number
}) {
  const pct = Math.max(0, Math.min(100, value))
  const thickness = 12
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (pct / 100) * circumference
  return (
    <div className="gauge">
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(10,40,66,0.09)" strokeWidth={thickness} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#17C3B2"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="gauge-center">
          <strong>{Math.round(pct)}%</strong>
        </div>
      </div>
      <div className="gauge-text">
        <span className="gauge-label">{label}</span>
        {sub ? <span className="gauge-sub">{sub}</span> : null}
      </div>
    </div>
  )
}
