// Display helpers.

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
