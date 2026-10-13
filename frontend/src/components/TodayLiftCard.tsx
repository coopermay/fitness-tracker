import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { TodayLift, TodaySet } from '../api/types'
import { formatDate, formatReps, formatWeight } from '../format'
import styles from './TodayLiftCard.module.css'

interface TodayLiftCardProps {
  lift: TodayLift
  groupId: number // so logging a set returns to this group's tab
}

// One lift on the Today page: your best set, the goal, and anything you've
// already logged today. All of it is for the machine shown under the name.
export function TodayLiftCard({ lift, groupId }: TodayLiftCardProps) {
  const done = lift.sets_today.length > 0
  const { best, target } = lift

  return (
    <article className={done ? `${styles.card} ${styles.done}` : styles.card}>
      <div className={styles.header}>
        <Link className={styles.name} to={`/lifts/${lift.id}`}>
          {lift.name}
        </Link>
        {lift.plateaued && (
          <span className={styles.plateau} title="No PR in the last 3 weeks">
            Plateau
          </span>
        )}
        {done && <span className={styles.doneMark}>✓ Done</span>}
      </div>
      {lift.machine_name && <p className={styles.machine}>{lift.machine_name}</p>}

      <dl className={styles.rows}>
        {done && (
          <Row label="Today">
            <SetList sets={lift.sets_today} />
          </Row>
        )}
        {best && (
          <Row label="Best">
            {formatWeight(best.weight_value, best.weight_unit)} ×{' '}
            {formatReps(best.reps, best.approximate)}
            {lift.best_date && <span className={styles.muted}> · {formatDate(lift.best_date)}</span>}
          </Row>
        )}
        {target && (
          <Row label="Goal">
            <strong className={styles.target}>
              {formatWeight(target.weight_value, target.weight_unit)} × {target.reps}
            </strong>
            {target.move_up && <span className={styles.muted}> · new weight</span>}
          </Row>
        )}
      </dl>
      {!best && (
        <p className={styles.muted}>{done ? 'First time on this machine.' : 'Not logged yet.'}</p>
      )}

      <Link className={styles.logButton} to={`/lifts/${lift.id}/log?from=today&group=${groupId}`}>
        Log set
      </Link>
    </article>
  )
}

// <dl> is a "description list": pairs of a term (<dt>) and its details (<dd>).
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  )
}

// "185 × 6 PR · 185 × 5 · 175 × 7  lbs": the unit once at the end, since a
// session's sets share it.
function SetList({ sets }: { sets: TodaySet[] }) {
  const unit = formatWeight(sets[0].weight_value, sets[0].weight_unit).split(' ')[1]
  return (
    <>
      {sets.map((set, i) => (
        <span key={set.id}>
          {i > 0 && ' · '}
          <span className={styles.set}>
            {set.weight_value} × {formatReps(set.reps, set.approximate)}
            {set.is_pr && <span className={styles.pr}>PR</span>}
          </span>
        </span>
      ))}{' '}
      <span className={styles.muted}>{unit}</span>
    </>
  )
}
