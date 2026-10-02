import { Link, useNavigate, useParams } from 'react-router'
import { useCreateLift, useLifts, useMuscleGroups, useUpdateMuscleGroup } from '../api/queries'
import { AddByName } from '../components/AddByName'
import { BackLink } from '../components/BackLink'
import { EditItem } from '../components/EditItem'
import { QueryStatus } from '../components/QueryStatus'
import { formatDate } from '../format'
import { NotFoundPage } from './NotFoundPage'
import styles from './MuscleGroupPage.module.css'

export function MuscleGroupPage() {
  // useParams reads the `:muscleGroupId` part of the URL /muscle-groups/:muscleGroupId.
  // URL params are always strings, so convert to a number.
  const muscleGroupId = Number(useParams().muscleGroupId)

  // Hooks must be called on every render, in the same order, and never inside
  // an `if`. That's why both queries run before any early return below.
  const muscleGroups = useMuscleGroups() // already cached from the home page
  const lifts = useLifts(muscleGroupId)
  const createLift = useCreateLift(muscleGroupId)
  const updateMuscleGroup = useUpdateMuscleGroup()
  const navigate = useNavigate()

  if (muscleGroups.isPending || muscleGroups.isError) {
    return <QueryStatus isError={muscleGroups.isError} error={muscleGroups.error} />
  }
  const muscleGroup = muscleGroups.data.find((group) => group.id === muscleGroupId)
  if (muscleGroup === undefined) {
    return <NotFoundPage />
  }

  return (
    <>
      <BackLink to="/" label="Muscle groups" />
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{muscleGroup.name}</h1>
        <EditItem
          name={muscleGroup.name}
          archived={muscleGroup.archived}
          archiveNote="It disappears from the home screen; its sets stay in history."
          onRename={(name) =>
            updateMuscleGroup.mutateAsync({ id: muscleGroupId, changes: { name } })
          }
          onSetArchived={async (archived) => {
            await updateMuscleGroup.mutateAsync({ id: muscleGroupId, changes: { archived } })
            navigate('/')
          }}
        />
      </div>

      {lifts.isPending || lifts.isError ? (
        <QueryStatus isError={lifts.isError} error={lifts.error} />
      ) : (
        <ul className={styles.list}>
          {lifts.data.map((lift) => (
            <li key={lift.id}>
              <Link className={styles.row} to={`/lifts/${lift.id}`}>
                <span className={styles.liftName}>{lift.name}</span>
                <span className={styles.lastDate}>
                  {lift.last_performed_on ? formatDate(lift.last_performed_on) : '—'}
                </span>
              </Link>
            </li>
          ))}
          {lifts.data.length === 0 && <p className={styles.empty}>No lifts yet.</p>}
        </ul>
      )}

      <AddByName
        buttonLabel="+ Add lift"
        placeholder="Lift name, e.g. Hammer curl"
        onAdd={(name) => createLift.mutateAsync(name)}
      />
    </>
  )
}
