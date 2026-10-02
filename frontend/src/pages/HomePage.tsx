import { Link } from 'react-router'
import { useInsights, useMuscleGroups, useSplit } from '../api/queries'
import { BodyFigure } from '../components/BodyFigure'
import { QueryStatus } from '../components/QueryStatus'
import { regionForMuscleGroup } from '../bodyRegions'
import { currentWeekday } from '../dates'
import { todayIsoDate } from '../format'
import styles from './HomePage.module.css'

export function HomePage() {
  // useMuscleGroups() returns the query's current state. On the first render
  // `data` is undefined and isPending is true; when the fetch finishes,
  // TanStack Query re-renders this component with the data filled in.
  const muscleGroups = useMuscleGroups()
  const split = useSplit()
  // Badges are extras: tiles show without them while they load.
  const insights = useInsights(todayIsoDate())
  const overdue = new Set(insights.data?.overdue_muscle_group_ids)

  // Wait for the split too, so tiles don't jump when today's groups move up.
  if (muscleGroups.isPending || muscleGroups.isError) {
    return <QueryStatus isError={muscleGroups.isError} error={muscleGroups.error} />
  }
  if (split.isPending || split.isError) {
    return <QueryStatus isError={split.isError} error={split.error} />
  }

  // Today's muscle groups from the weekly split.
  const todayWeekday = currentWeekday()
  const todaysIds = new Set(split.data.days.find((day) => day.weekday === todayWeekday)?.muscle_group_ids)
  // Today's groups first, everything else after, each keeping its usual order.
  const ordered = [
    ...muscleGroups.data.filter((group) => todaysIds.has(group.id)),
    ...muscleGroups.data.filter((group) => !todaysIds.has(group.id)),
  ]

  return (
    <>
      <h1 className={styles.title}>Lift Tracker</h1>

      {/* .map() turns each item into a piece of UI. React needs a unique
          `key` on each one to track which item is which between renders. */}
      <ul className={styles.grid}>
        {ordered.map((muscleGroup) => (
          <li key={muscleGroup.id}>
            <Link
              className={todaysIds.has(muscleGroup.id) ? `${styles.tile} ${styles.today}` : styles.tile}
              to={`/muscle-groups/${muscleGroup.id}`}
            >
              {todaysIds.has(muscleGroup.id) && <span className={styles.todayLabel}>Today</span>}
              {overdue.has(muscleGroup.id) && (
                <span className={styles.overdueLabel} title="Scheduled earlier this week, not trained yet">
                  Overdue
                </span>
              )}
              <BodyFigure region={regionForMuscleGroup(muscleGroup.name)} />
              <span>{muscleGroup.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
