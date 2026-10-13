// Date arithmetic in the browser's local time.
// Dates from the API are plain "YYYY-MM-DD" strings; these helpers convert
// without going through UTC, which could shift a date by a day.

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// The Sunday on or before `date` (the calendar's weeks start on Sunday).
export function startOfWeek(date: Date): Date {
  const daysSinceSunday = date.getDay() // getDay(): Sunday = 0
  return addDays(date, -daysSinceSunday)
}

// Today's weekday with Monday = 0 ... Sunday = 6, matching the weekly split.
// (JavaScript's getDay() counts from Sunday = 0.) Like todayIsoDate(), this
// reads the clock, so a page open past midnight updates on its next re-render.
export function currentWeekday(): number {
  return (new Date().getDay() + 6) % 7
}
