// Display helpers.

import type { WeightUnit } from './api/types'

// "2026-09-25" -> "Friday, Sep 25" (adds the year if it isn't the current year)
export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: year === new Date().getFullYear() ? undefined : 'numeric',
  })
}

// 185, "lbs" -> "185 lbs";  72.5 -> "72.5 lbs";  8, "plates" -> "8 plates";  1 -> "1 plate"
export function formatWeight(value: number, unit: WeightUnit): string {
  const unitLabel = unit === 'plates' && value === 1 ? 'plate' : unit
  return `${value} ${unitLabel}`
}

// 7, approximate -> "7~"
export function formatReps(reps: number, approximate: boolean): string {
  return approximate ? `${reps}~` : `${reps}`
}

// Today in the browser's timezone as "YYYY-MM-DD" (the format <input type="date"> uses).
export function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// "2026-09-25" -> "Sep 25" (adds the year if it isn't the current year).
// Built from the parts rather than `new Date("2026-09-25")`, which would treat
// the string as UTC midnight and can show the previous day in US timezones.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const sameYear = year === new Date().getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}
