import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { TodayLift, TodaySet } from '../api/types'
import { formatDate, formatReps, formatWeight } from '../format'
import styles from './TodayLiftCard.module.css'

interface TodayLiftCardProps {
  lift: TodayLift
}

// One lift on the Today page: what you did last time, what to beat, and
// anything you've already logged today.
export function TodayLiftCard({ lift }: TodayLiftCardProps) {
  const done = lift.sets_today.length > 0
  const { last_session: last, target } = lift

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
        {last && (
          <Row label="Last">
            <span className={styles.muted}>{formatDate(last.date)} · </span>
            <SetList sets={last.sets} />
          </Row>
        )}
        {target && (
          <Row label={target.move_up ? 'Move up' : 'Beat'}>
            <strong className={styles.target}>
              {formatWeight(target.weight_value, target.weight_unit)} × {target.reps}
              {target.move_up && '+'}
            </strong>
          </Row>
        )}
      </dl>
      {!last && !target && !done && <p className={styles.muted}>Not logged yet.</p>}

      <Link className={styles.logButton} to={`/lifts/${lift.id}/log?from=today`}>
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
