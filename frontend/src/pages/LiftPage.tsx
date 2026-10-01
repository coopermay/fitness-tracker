import { Link, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useLiftRecords, useMuscleGroups } from '../api/queries'
import { MachineCard } from '../components/MachineCard'
import { QueryStatus } from '../components/QueryStatus'
import { NotFoundPage } from './NotFoundPage'
import styles from './LiftPage.module.css'

export function LiftPage() {
  const liftId = Number(useParams().liftId)
  const records = useLiftRecords(liftId)
  const muscleGroups = useMuscleGroups() // cached; used for the back link's label

  if (records.error instanceof ApiError && records.error.status === 404) {
    return <NotFoundPage />
  }
  if (records.isPending || records.isError) {
    return <QueryStatus isError={records.isError} error={records.error} />
  }

  const { lift, machine_groups: machineGroups } = records.data
  const muscleGroup = muscleGroups.data?.find((group) => group.id === lift.muscle_group_id)

  return (
    <>
      <Link className={styles.back} to={`/muscle-groups/${lift.muscle_group_id}`}>
        ‹ {muscleGroup?.name ?? 'Back'}
      </Link>
      <h1 className={styles.title}>{lift.name}</h1>

      {/* Wired up in Phase 5 (log/edit set form). */}
      <button type="button" className={styles.logButton} disabled>
        Log set
      </button>

      {machineGroups.length === 0 ? (
        <p className={styles.empty}>No sets logged yet.</p>
      ) : (
        <div className={styles.cards}>
          {machineGroups.map((group) => (
            <MachineCard key={group.machine?.id ?? 'no-machine'} group={group} />
          ))}
        </div>
      )}
    </>
  )
}
