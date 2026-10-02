import { Fragment, useState } from 'react'
import { useCalendar } from '../api/queries'
import type { CalendarDay } from '../api/types'
import { buildWeeks, heatLevel } from '../calendar'
import { DayDetails } from '../components/DayDetails'
import { QueryStatus } from '../components/QueryStatus'
import { formatDate, todayIsoDate } from '../format'
import styles from './CalendarPage.module.css'

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Like GitHub's contribution graph, turned sideways for a phone: one row per
// week (newest at the top), Monday to Sunday across. Brighter = more sets.
export function CalendarPage() {
  const calendar = useCalendar()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  if (calendar.isPending || calendar.isError) {
    return <QueryStatus isError={calendar.isError} error={calendar.error} />
  }

  // A Map is a dictionary with any kind of key, like Python's dict.
  const daysByDate = new Map<string, CalendarDay>(calendar.data.map((day) => [day.date, day]))
  const maxSetCount = Math.max(0, ...calendar.data.map((day) => day.set_count))
  const today = todayIsoDate()
  const earliest = calendar.data.at(-1)?.date ?? null // data is newest first
  const weeks = buildWeeks(today, earliest)

  const totalSets = calendar.data.reduce((sum, day) => sum + day.set_count, 0)
  const totalPrs = calendar.data.reduce((sum, day) => sum + day.pr_count, 0)

  function toggle(date: string) {
    setSelectedDate(date === selectedDate ? null : date)
  }

  return (
    <>
      <h1 className={styles.title}>Calendar</h1>
      <p className={styles.totals}>
        {totalSets} sets · {totalPrs} PRs on {calendar.data.length} days
      </p>

      <div className={styles.grid}>
        {/* Header row: blank corner, then the weekday letters */}
        <span />
        {WEEKDAY_LETTERS.map((letter, i) => (
          <span key={i} className={styles.weekday}>
            {letter}
          </span>
        ))}

        {weeks.map((week) => (
          // A Fragment (<>...</>) groups elements without adding a wrapper
          // to the page; the long form is needed here to give it a key.
          <Fragment key={week.days[0]}>
            <span className={styles.month}>{week.monthLabel}</span>
            {week.days.map((date, i) =>
              date === null ? (
                <span key={i} />
              ) : (
                <DaySquare
                  key={date}
                  date={date}
                  day={daysByDate.get(date)}
                  level={heatLevel(daysByDate.get(date)?.set_count ?? 0, maxSetCount)}
                  isToday={date === today}
                  isSelected={date === selectedDate}
                  onClick={() => toggle(date)}
                />
              ),
            )}
          </Fragment>
        ))}
      </div>

      <div className={styles.legend} aria-hidden="true">
        Less
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={`${styles.legendSquare} ${styles[`level${level}`]}`} />
        ))}
        More
      </div>

      {selectedDate && (
        <>
          {/* Extra space so every week can still be scrolled above the panel */}
          <div className={styles.sheetSpacer} />
          <DayDetails
            date={selectedDate}
            day={daysByDate.get(selectedDate)}
            onClose={() => setSelectedDate(null)}
          />
        </>
      )}
    </>
  )
}

interface DaySquareProps {
  date: string
  day: CalendarDay | undefined
  level: number
  isToday: boolean
  isSelected: boolean
  onClick: () => void
}

function DaySquare({ date, day, level, isToday, isSelected, onClick }: DaySquareProps) {
  const classes = [styles.square, styles[`level${level}`]]
  if (isToday) classes.push(styles.today)
  if (isSelected) classes.push(styles.selected)

  const description = day ? `${day.set_count} sets, ${day.pr_count} PRs` : 'no sets'
  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-label={`${formatDate(date)}: ${description}`}
      aria-pressed={isSelected}
      onClick={onClick}
    />
  )
}
