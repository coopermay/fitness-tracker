import { useState } from 'react'
import type { ProgressPoint, WeightUnit } from '../api/types'
import { parseIsoDate } from '../dates'
import { formatDate, formatReps, formatWeight } from '../format'
import styles from './ProgressChart.module.css'

interface ProgressChartProps {
  points: ProgressPoint[] // at least 2, oldest first
  unit: WeightUnit
}

// The drawing area, in SVG units. The viewBox scales it to the card's width.
const WIDTH = 320
const HEIGHT = 140
const PAD = { top: 12, right: 14, bottom: 22, left: 36 }

// A line chart drawn by hand: each session is a point, placed by date
// (x) and value (y). Tap a point to see that session's set above the chart.
export function ProgressChart({ points, unit }: ProgressChartProps) {
  const [selected, setSelected] = useState(points.length - 1) // latest session

  // Data → pixel conversions. Dates are spaced by real time, so a long gap
  // between sessions shows as a long gap on the chart.
  const times = points.map((point) => parseIsoDate(point.date).getTime())
  const firstTime = times[0]
  const timeSpan = times[times.length - 1] - firstTime || 1

  const values = points.map((point) => point.value)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  // Leave some room above and below; a perfectly flat line sits in the middle.
  const margin = dataMax === dataMin ? 5 : (dataMax - dataMin) * 0.15
  const low = dataMin - margin
  const high = dataMax + margin

  const x = (time: number) => PAD.left + ((time - firstTime) / timeSpan) * (WIDTH - PAD.left - PAD.right)
  const y = (value: number) => PAD.top + (1 - (value - low) / (high - low)) * (HEIGHT - PAD.top - PAD.bottom)

  // An SVG path: "M" moves to the first point, each "L" draws a line to the next.
  const linePath = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'}${x(times[i]).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join(' ')

  const isPlates = unit === 'plates'
  const current = points[selected]

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.caption}>
        <span className={styles.metric}>{isPlates ? 'Heaviest' : 'Est. 1RM'}</span>
        <span>
          {formatDate(current.date)} · {formatWeight(current.weight_value, unit)} ×{' '}
          {formatReps(current.reps, current.approximate)}
          {!isPlates && <strong> → {current.value}</strong>}
        </span>
      </figcaption>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.svg} aria-hidden="true">
        {/* Guide lines and labels at the highest and lowest values */}
        {/* new Set(...) drops the duplicate when every point has the same value */}
        {[...new Set([dataMax, dataMin])].map((value) => (
          <g key={value}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} className={styles.guide} />
            <text x={PAD.left - 6} y={y(value)} className={styles.yLabel}>
              {Math.round(value)}
            </text>
          </g>
        ))}

        {/* First and last session dates along the bottom */}
        <text x={PAD.left} y={HEIGHT - 4} className={styles.xLabelStart}>
          {formatDate(points[0].date)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 4} className={styles.xLabelEnd}>
          {formatDate(points[points.length - 1].date)}
        </text>

        <path d={linePath} className={styles.line} />

        {points.map((point, i) => (
          <g key={point.date} onClick={() => setSelected(i)} className={styles.pointGroup}>
            {/* A big invisible circle makes small points easy to tap */}
            <circle cx={x(times[i])} cy={y(point.value)} r="14" className={styles.hitArea} />
            <circle
              cx={x(times[i])}
              cy={y(point.value)}
              r={i === selected ? 5.5 : 3.5}
              className={i === selected ? styles.pointSelected : styles.point}
            />
          </g>
        ))}
      </svg>
    </figure>
  )
}
