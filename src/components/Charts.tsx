import { useId } from 'react'

export interface Point {
  label: string
  value: number
}

function buildPath(points: Point[], width: number, height: number, pad = 6) {
  if (points.length === 0) return { line: '', area: '', coords: [] as { x: number; y: number }[] }
  const max = Math.max(...points.map((p) => p.value), 1)
  const min = Math.min(...points.map((p) => p.value), 0)
  const span = max - min || 1
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0
  const coords = points.map((p, index) => ({
    x: pad + index * stepX,
    y: pad + (height - pad * 2) * (1 - (p.value - min) / span),
  }))

  let line = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]
    const curr = coords[i]
    const midX = (prev.x + curr.x) / 2
    line += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`
  }
  const area = `${line} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`
  return { line, area, coords }
}

export function AreaChart({
  data,
  height = 170,
  format = (n: number) => String(Math.round(n)),
  color = '#69d9ff',
}: {
  data: Point[]
  height?: number
  format?: (value: number) => string
  color?: string
}) {
  const id = useId().replace(/:/g, '')
  const width = 640
  const { line, area, coords } = buildPath(data, width, height)
  const last = coords[coords.length - 1]

  if (data.length === 0) {
    return <div className="empty-text" style={{ padding: 24 }}>No data yet.</div>
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend chart"
      >
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.34" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`stroke-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="55%" stopColor={color} />
            <stop offset="100%" stopColor="#8b8cff" />
          </linearGradient>
          <filter id={`glow-${id}`} x="-20%" y="-40%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 6"
          />
        ))}
        <path d={area} fill={`url(#fill-${id})`} />
        <path
          d={line}
          fill="none"
          stroke={`url(#stroke-${id})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          filter={`url(#glow-${id})`}
        />
        {last && <circle cx={last.x} cy={last.y} r="4" fill="#eafaff" stroke={color} strokeWidth="2" />}
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'var(--muted-2)',
          marginTop: 6,
          gap: 4,
        }}
      >
        {data.map((point, index) => (
          <span key={`${point.label}-${index}`} title={format(point.value)}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function BarPairs({
  data,
  aLabel,
  bLabel,
  aColor = '#69d9ff',
  bColor = '#8b8cff',
  format = (n: number) => String(Math.round(n)),
}: {
  data: { label: string; a: number; b: number }[]
  aLabel: string
  bLabel: string
  aColor?: string
  bColor?: string
  format?: (value: number) => string
}) {
  const max = Math.max(...data.flatMap((d) => [d.a, d.b]), 1)

  if (data.length === 0) {
    return <div className="empty-text" style={{ padding: 24 }}>No data yet.</div>
  }

  return (
    <div>
      <div className="legend" style={{ marginBottom: 12 }}>
        <span>
          <span className="legend-dot" style={{ background: aColor }} />
          {aLabel}
        </span>
        <span>
          <span className="legend-dot" style={{ background: bColor }} />
          {bLabel}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 150 }}>
        {data.map((item) => (
          <div
            key={item.label}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 118, width: '100%' }}>
              <div
                title={`${aLabel}: ${format(item.a)}`}
                style={{
                  flex: 1,
                  height: `${Math.max(2, (item.a / max) * 100)}%`,
                  borderRadius: '5px 5px 2px 2px',
                  background: `linear-gradient(180deg, ${aColor}, ${aColor}55)`,
                  boxShadow: `0 0 14px ${aColor}40`,
                  transition: 'height .4s ease',
                }}
              />
              <div
                title={`${bLabel}: ${format(item.b)}`}
                style={{
                  flex: 1,
                  height: `${Math.max(2, (item.b / max) * 100)}%`,
                  borderRadius: '5px 5px 2px 2px',
                  background: `linear-gradient(180deg, ${bColor}, ${bColor}44)`,
                  transition: 'height .4s ease',
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: 'var(--muted-2)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Donut({
  slices,
  size = 168,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; value: number; color: string }[]
  size?: number
  centerLabel?: string
  centerValue?: string
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const radius = size / 2 - 12
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} role="img" aria-label="Distribution">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="13"
          />
          {total > 0 &&
            slices.map((slice) => {
              const length = (slice.value / total) * circumference
              const dash = `${Math.max(0, length - 2)} ${circumference - length + 2}`
              const el = (
                <circle
                  key={slice.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="13"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  opacity={0.92}
                />
              )
              offset += length
              return el
            })}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeContent: 'center',
            textAlign: 'center',
            gap: 2,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.03em' }}>{centerValue}</div>
          <div style={{ fontSize: 10, color: 'var(--muted-2)' }}>{centerLabel}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 7, flex: 1, minWidth: 130 }}>
        {slices.map((slice) => (
          <div key={slice.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5 }}>
            <span className="legend-dot" style={{ background: slice.color }} />
            <span style={{ color: 'var(--muted)', flex: 1 }}>{slice.label}</span>
            <span className="mono" style={{ color: '#cfd8e8' }}>
              {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
        {slices.length === 0 && <span className="empty-text">No data yet.</span>}
      </div>
    </div>
  )
}

export function Ring({
  value,
  size = 240,
  stroke = 10,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  children?: React.ReactNode
}) {
  const id = useId().replace(/:/g, '')
  const radius = size / 2 - stroke
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const dash = (clamped / 100) * circumference

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#69d9ff" />
            <stop offset="100%" stopColor="#8b8cff" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ring-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: 'stroke-dasharray .5s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center' }}>{children}</div>
    </div>
  )
}

export function Sparkline({ values, color = '#69d9ff' }: { values: number[]; color?: string }) {
  const width = 120
  const height = 32
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const points = values
    .map((value, index) => {
      const x = values.length > 1 ? (index / (values.length - 1)) * width : width / 2
      const y = height - ((value - min) / span) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}
