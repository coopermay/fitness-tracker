// Turns calendar data into the rows of the grid: one row per week, newest first.

import { addDays, parseIsoDate, startOfWeek, toIsoDate } from './dates'

// Show at least this many weeks, so a short history doesn't look empty.
const MIN_WEEKS = 12

export interface CalendarWeek {
  // Seven "YYYY-MM-DD" dates, Monday to Sunday; null for days after today.
  days: (string | null)[]
  // Shown at the left of the row where a month first appears (reading down).
  monthLabel: string | null
}

export function buildWeeks(todayIso: string, earliestIso: string | null): CalendarWeek[] {
  const today = parseIsoDate(todayIso)
  const thisWeek = startOfWeek(today)
  const earliestWeek = earliestIso ? startOfWeek(parseIsoDate(earliestIso)) : thisWeek
  const weeksOfHistory = Math.round((thisWeek.getTime() - earliestWeek.getTime()) / (7 * 86_400_000)) + 1
  const weekCount = Math.max(weeksOfHistory, MIN_WEEKS)

  const weeks: CalendarWeek[] = []
  let previousMonth: number | null = null
  for (let i = 0; i < weekCount; i++) {
    const monday = addDays(thisWeek, -7 * i)
    const days = Array.from({ length: 7 }, (_, offset) => {
      const day = addDays(monday, offset)
      return day > today ? null : toIsoDate(day)
    })

    // Label the row with the month of its latest visible day, the first time
    // that month appears going down the page.
    const latestDay = parseIsoDate(days.filter((d) => d !== null).at(-1)!)
    const month = latestDay.getMonth()
    const monthLabel =
      month === previousMonth ? null : latestDay.toLocaleDateString('en-US', { month: 'short' })
    previousMonth = month

    weeks.push({ days, monthLabel })
  }
  return weeks
}

// 0 for no sets; otherwise 1–4 by how the day compares to your busiest day.
export function heatLevel(setCount: number, maxSetCount: number): number {
  if (setCount === 0 || maxSetCount === 0) {
    return 0
  }
  return Math.ceil((setCount / maxSetCount) * 4)
}
