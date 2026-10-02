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

// The Monday on or before `date`.
export function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7 // getDay(): Sunday = 0
  return addDays(date, -daysSinceMonday)
}
