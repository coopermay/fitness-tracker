import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useLiftRecords, useMuscleGroups, useUpdateLift } from '../api/queries'
import { BackLink } from '../components/BackLink'
import { EditItem } from '../components/EditItem'
import { MachineCard } from '../components/MachineCard'
import { QueryStatus } from '../components/QueryStatus'
import type { LiftPageState } from '../flash'
import { NotFoundPage } from './NotFoundPage'
import styles from './LiftPage.module.css'

export function LiftPage() {
  const liftId = Number(useParams().liftId)
  const records = useLiftRecords(liftId)
  const muscleGroups = useMuscleGroups() // cached; used for the back link's label
  const updateLift = useUpdateLift()
  const location = useLocation()
  const navigate = useNavigate()

  // The log/edit pages pass a message in router state when they send us back
  // here. Copy it into component state once (the function passed to useState
  // runs only on the first render)...
  const [flash] = useState(() => (location.state as LiftPageState | null)?.flash)

  // ...then clear it from the browser history, so refreshing the page
  // doesn't show "New best!" again.
  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  if (records.error instanceof ApiError && records.error.status === 404) {
    return <NotFoundPage />
  }
  if (records.isPending || records.isError) {
    return <QueryStatus isError={records.isError} error={records.error} />
  }

  const { lift, machine_groups: machineGroups } = records.data
  const muscleGroup = muscleGroups.data?.find((group) => group.id === lift.muscle_group_id)
  // Machines with lbs/kg sets can count for relative strength on Insights.
  const weightedMachines = machineGroups
    .filter((group) => group.units.some((unit) => unit.weight_unit !== 'plates'))
    .flatMap((group) => (group.machine ? [group.machine] : []))
  // While saving, show the machine being saved (like the default unit in Settings).
  const strengthMachineId =
    updateLift.isPending && updateLift.variables.changes.strength_machine_id !== undefined
      ? updateLift.variables.changes.strength_machine_id
      : lift.strength_machine_id

  return (
    <>
      <BackLink to={`/muscle-groups/${lift.muscle_group_id}`} label={muscleGroup?.name ?? 'Back'} />
      <div className={styles.titleRow}>
        <h1 className={styles.title}>
          {lift.name}
          {lift.archived && <span className={styles.archived}> (archived)</span>}
        </h1>
        <EditItem
          name={lift.name}
          archived={lift.archived}
          archiveNote="It disappears from the muscle group; its sets stay in history."
          onRename={(name) => updateLift.mutateAsync({ id: lift.id, changes: { name } })}
          onSetArchived={async (archived) => {
            await updateLift.mutateAsync({ id: lift.id, changes: { archived } })
            if (archived) {
              navigate(`/muscle-groups/${lift.muscle_group_id}`)
            }
          }}
        />
      </div>

      {flash && (
        <p className={flash.isRecord ? styles.flashRecord : styles.flash} role="status">
          {flash.text}
        </p>
      )}

      <Link className={styles.logButton} to={`/lifts/${lift.id}/log`}>
        Log set
      </Link>

      {machineGroups.length === 0 ? (
        <p className={styles.empty}>No sets logged yet.</p>
      ) : (
        <div className={styles.cards}>
          {machineGroups.map((group) => (
            <MachineCard key={group.machine?.id ?? 'no-machine'} group={group} />
          ))}
        </div>
      )}

      {weightedMachines.length >= 2 && (
        <label className={styles.strengthPick}>
          <span>
            Relative strength uses
            <span className={styles.strengthHint}>
              Machines differ, so Insights compares you on one of them.
            </span>
          </span>
          <select
            className={styles.select}
            value={strengthMachineId ?? ''}
            onChange={(event) =>
              updateLift.mutate({
                id: lift.id,
                changes: { strength_machine_id: event.target.value === '' ? null : Number(event.target.value) },
              })
            }
          >
            <option value="">Automatic (most used)</option>
            {weightedMachines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}
