import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useToday } from '../api/queries'
import type { TodayGroup } from '../api/types'
import { QueryStatus } from '../components/QueryStatus'
import { TodayLiftCard } from '../components/TodayLiftCard'
import type { LiftPageState } from '../flash'
import { formatLongDate, todayIsoDate } from '../format'
import styles from './TodayPage.module.css'

// The gym screen: today's split groups, your usual lifts for each, what you
// did last time and what to beat.
export function TodayPage() {
  const today = useToday(todayIsoDate())
  const location = useLocation()
  const navigate = useNavigate()

  // "Log set" from here comes back with a message, like on the lift page:
  // keep it in state, then clear it from history so a refresh doesn't repeat it.
  const [flash] = useState(() => (location.state as LiftPageState | null)?.flash)
  useEffect(() => {
    if ((location.state as LiftPageState | null)?.flash) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  if (today.isPending || today.isError) {
    return <QueryStatus isError={today.isError} error={today.error} />
  }
  const data = today.data

  return (
    <>
      <h1 className={styles.title}>Today</h1>
      <p className={styles.date}>
        {formatLongDate(data.date)}
        {data.groups.length > 0 && ` · ${data.groups.map((group) => group.name).join(', ')}`}
      </p>

      {flash && (
        <p className={flash.isRecord ? styles.flashRecord : styles.flash} role="status">
          {flash.text}
        </p>
      )}

      {data.groups.length === 0 ? (
        <RestDay next={data.next_training} />
      ) : (
        <>
          <p className={styles.summary}>
            {data.set_count === 0
              ? `Target ${data.rep_range_min}–${data.rep_range_max} reps; move up after ${data.rep_range_max + 1}.`
              : `${data.lifts_done} ${data.lifts_done === 1 ? 'lift' : 'lifts'} · ${data.set_count} sets · ${data.pr_count} PRs today`}
          </p>
          {data.groups.map((group) => (
            <GroupSection key={group.id} group={group} />
          ))}
        </>
      )}
    </>
  )
}

function GroupSection({ group }: { group: TodayGroup }) {
  const [showAll, setShowAll] = useState(false)
  const done = group.lifts.filter((lift) => lift.sets_today.length > 0).length

  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>
        {group.name}
        {group.lifts.length > 0 && (
          <span className={styles.groupProgress}>
            {done} of {group.lifts.length} done
          </span>
        )}
      </h2>
      {group.lifts.length === 0 && (
        <p className={styles.empty}>Nothing logged here in the last 6 weeks.</p>
      )}
      <div className={styles.cards}>
        {group.lifts.map((lift) => (
          <TodayLiftCard key={lift.id} lift={lift} />
        ))}
        {showAll && group.other_lifts.map((lift) => <TodayLiftCard key={lift.id} lift={lift} />)}
      </div>
      {group.other_lifts.length > 0 && (
        <button type="button" className={styles.showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show fewer' : `Show all (${group.other_lifts.length} more)`}
        </button>
      )}
    </section>
  )
}

function RestDay({ next }: { next: { date: string; muscle_groups: string[] } | null }) {
  return (
    <div className={styles.rest}>
      <p className={styles.restTitle}>Rest day</p>
      {next ? (
        <p className={styles.restNext}>
          Next up: {next.muscle_groups.join(', ')} on {formatLongDate(next.date)}
        </p>
      ) : (
        <p className={styles.restNext}>
          No weekly split set. Pick your days in <Link to="/settings/split">Settings</Link>.
        </p>
      )}
      <Link className={styles.restLink} to="/">
        Train anyway: browse muscle groups
      </Link>
    </div>
  )
}
