import { Link } from 'react-router'
import type { CalendarDay } from '../api/types'
import { formatLongDate, formatReps, formatWeight } from '../format'
import styles from './DayDetails.module.css'

interface DayDetailsProps {
  date: string
  day: CalendarDay | undefined // undefined = nothing logged that day
  onClose: () => void
}

// The panel that slides up above the tab bar when you tap a calendar square.
export function DayDetails({ date, day, onClose }: DayDetailsProps) {
  return (
    <section className={styles.sheet} aria-label={`Details for ${formatLongDate(date)}`}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.date}>{formatLongDate(date)}</h2>
          <p className={styles.summary}>
            {day ? summary(day) : 'Nothing logged'}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      {day && (
        <ul className={styles.lifts}>
          {day.lifts.map((lift) => (
            <li key={lift.lift_id}>
              <Link className={styles.liftName} to={`/lifts/${lift.lift_id}`}>
                {lift.lift_name} ›
              </Link>
              <ul className={styles.sets}>
                {lift.sets.map((set) => (
                  <li key={set.id} className={styles.set}>
                    <span>
                      {formatWeight(set.weight_value, set.weight_unit)} ×{' '}
                      {formatReps(set.reps, set.approximate)}
                      {set.machine_name && (
                        <span className={styles.machine}> · {set.machine_name}</span>
                      )}
                    </span>
                    {set.is_pr && <span className={styles.prBadge}>PR</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function summary(day: CalendarDay): string {
  const sets = `${day.set_count} ${day.set_count === 1 ? 'set' : 'sets'}`
  if (day.pr_count === 0) {
    return sets
  }
  return `${sets} · ${day.pr_count} ${day.pr_count === 1 ? 'PR' : 'PRs'}`
}
