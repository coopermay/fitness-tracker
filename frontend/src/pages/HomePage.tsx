import { Link } from 'react-router'
import { useCreateMuscleGroup, useMuscleGroups } from '../api/queries'
import { AddByName } from '../components/AddByName'
import { QueryStatus } from '../components/QueryStatus'
import styles from './HomePage.module.css'

export function HomePage() {
  // useMuscleGroups() returns the query's current state. On the first render
  // `data` is undefined and isPending is true; when the fetch finishes,
  // TanStack Query re-renders this component with the data filled in.
  const muscleGroups = useMuscleGroups()
  const createMuscleGroup = useCreateMuscleGroup()

  if (muscleGroups.isPending || muscleGroups.isError) {
    return <QueryStatus isError={muscleGroups.isError} error={muscleGroups.error} />
  }

  return (
    <>
      <h1 className={styles.title}>Muscle groups</h1>

      {/* .map() turns each item into a piece of UI. React needs a unique
          `key` on each one to track which item is which between renders. */}
      <ul className={styles.grid}>
        {muscleGroups.data.map((muscleGroup) => (
          <li key={muscleGroup.id}>
            <Link className={styles.tile} to={`/muscle-groups/${muscleGroup.id}`}>
              {muscleGroup.name}
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.addRow}>
        <AddByName
          subtle
          buttonLabel="+ Add muscle group"
          placeholder="Muscle group name"
          onAdd={(name) => createMuscleGroup.mutateAsync(name)}
        />
      </div>
    </>
  )
}
