import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useToday } from '../api/queries'
import type { TodayGroup, TodayResponse } from '../api/types'
import { QueryStatus } from '../components/QueryStatus'
import { TodayLiftCard } from '../components/TodayLiftCard'
import type { LiftPageState } from '../flash'
import { formatLongDate, todayIsoDate } from '../format'
import styles from './TodayPage.module.css'

// The gym screen: a tab per muscle group in today's split, with your usual
// lifts for each, your best set and the goal.
export function TodayPage() {
  const today = useToday(todayIsoDate())
  const location = useLocation()
  const navigate = useNavigate()
  // The selected group is in the URL (?group=3), so it's still selected after
  // logging a set and coming back here.
  const [searchParams, setSearchParams] = useSearchParams()

  // "Log set" from here comes back with a message, like on the lift page:
  // keep it in state, then clear it from history so a refresh doesn't repeat it.
  const [flash] = useState(() => (location.state as LiftPageState | null)?.flash)
  useEffect(() => {
    if ((location.state as LiftPageState | null)?.flash) {
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null })
    }
  }, [location.state, location.pathname, location.search, navigate])

  if (today.isPending || today.isError) {
    return <QueryStatus isError={today.isError} error={today.error} />
  }
  const data = today.data
  const selected = selectedGroup(data, Number(searchParams.get('group')))

  return (
    <>
      <h1 className={styles.title}>Today</h1>

      {flash && (
        <p className={flash.isRecord ? styles.flashRecord : styles.flash} role="status">
          {flash.text}
        </p>
      )}

      {selected === null ? (
        <RestDay next={data.next_training} />
      ) : (
        <>
          <div className={styles.tabs} role="group" aria-label="Muscle groups" data-no-swipe>
            {data.groups.map((group) => {
              const { done, total } = progress(group)
              const isSelected = group.id === selected.id
              return (
                <button
                  key={group.id}
                  type="button"
                  className={isSelected ? styles.tabActive : styles.tab}
                  aria-pressed={isSelected}
                  // replace: switching tabs shouldn't pile up history entries
                  onClick={() => setSearchParams({ group: String(group.id) }, { replace: true })}
                >
                  {group.name}
                  {total > 0 && (
                    <span className={styles.tabCount}>{done >= total ? '✓' : `${done}/${total}`}</span>
                  )}
                </button>
              )
            })}
          </div>
          {/* key: each group starts with "Show all" closed */}
          <GroupSection key={selected.id} group={selected} />
        </>
      )}
    </>
  )
}

function progress(group: TodayGroup): { done: number; total: number } {
  const done = group.lifts.filter((lift) => lift.sets_today.length > 0).length
  return { done, total: group.lifts.length }
}

// The group in the URL if it's one of today's; otherwise the first one you
// haven't finished (or the first). Null on a rest day.
function selectedGroup(data: TodayResponse, requestedId: number): TodayGroup | null {
  const requested = data.groups.find((group) => group.id === requestedId)
  if (requested) {
    return requested
  }
  const unfinished = data.groups.find((group) => {
    const { done, total } = progress(group)
    return done < total
  })
  return unfinished ?? data.groups[0] ?? null
}

function GroupSection({ group }: { group: TodayGroup }) {
  const [showAll, setShowAll] = useState(false)

  return (
    <section className={styles.group} aria-label={group.name}>
      {group.lifts.length === 0 && (
        <p className={styles.empty}>Nothing logged here in the last 6 weeks.</p>
      )}
      <div className={styles.cards}>
        {group.lifts.map((lift) => (
          <TodayLiftCard key={lift.id} lift={lift} groupId={group.id} />
        ))}
        {showAll &&
          group.other_lifts.map((lift) => <TodayLiftCard key={lift.id} lift={lift} groupId={group.id} />)}
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
