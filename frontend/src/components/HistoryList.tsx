import type { WorkoutSet } from '../api/types'
import { formatDate, formatReps, formatWeight } from '../format'
import styles from './HistoryList.module.css'

interface HistoryListProps {
  sets: WorkoutSet[]
}

// Every set logged on one machine, newest first. Edit/delete arrive in Phase 5.
export function HistoryList({ sets }: HistoryListProps) {
  return (
    <ul className={styles.list}>
      {sets.map((set) => (
        <li key={set.id} className={styles.row}>
          <span className={styles.date}>
            {set.performed_on ? formatDate(set.performed_on) : 'No date'}
          </span>
          <span className={styles.main}>
            {formatWeight(set.weight_value, set.weight_unit)} ×{' '}
            {formatReps(set.reps, set.approximate)}
          </span>
          {/* `&&` renders the right side only when the left is truthy:
              notes show only if there are any. */}
          {set.notes && <span className={styles.notes}>{set.notes}</span>}
        </li>
      ))}
    </ul>
  )
}
