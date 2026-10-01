import { useNavigate, useParams } from 'react-router'
import { useDeleteSet, useLiftRecords, useSettings, useUpdateSet } from '../api/queries'
import type { SetFields } from '../api/types'
import { QueryStatus } from '../components/QueryStatus'
import { SetForm, type SetFormValues } from '../components/SetForm'
import type { LiftPageState } from '../flash'
import { NotFoundPage } from './NotFoundPage'
import styles from './FormPage.module.css'

export function EditSetPage() {
  const params = useParams()
  const liftId = Number(params.liftId)
  const setId = Number(params.setId)
  const navigate = useNavigate()
  const records = useLiftRecords(liftId)
  const settings = useSettings()
  const updateSet = useUpdateSet(liftId)
  const deleteSet = useDeleteSet(liftId)

  if (records.isPending || records.isError) {
    return <QueryStatus isError={records.isError} error={records.error} />
  }
  if (settings.isPending || settings.isError) {
    return <QueryStatus isError={settings.isError} error={settings.error} />
  }

  // The set lives in its machine group's history, which we already have.
  const group = records.data.machine_groups.find((g) => g.history.some((s) => s.id === setId))
  const set = group?.history.find((s) => s.id === setId)
  if (group === undefined || set === undefined) {
    // Right after a delete, the refreshed records no longer contain this set
    // but we haven't navigated away yet. Show nothing rather than "Not found".
    return deleteSet.isPending || deleteSet.isSuccess ? null : <NotFoundPage />
  }

  const initialValues: SetFormValues = {
    machine: group.machine,
    weight: String(set.weight_value),
    unit: set.weight_unit,
    reps: String(set.reps),
    approximate: set.approximate,
    performedOn: set.performed_on ?? '',
    notes: set.notes ?? '',
  }

  function goBack(text: string) {
    const state: LiftPageState = { flash: { text, isRecord: false } }
    navigate(`/lifts/${liftId}`, { replace: true, state })
  }

  async function handleSubmit(fields: SetFields) {
    await updateSet.mutateAsync({ setId, fields })
    goBack('Set updated')
  }

  async function handleDelete() {
    await deleteSet.mutateAsync(setId)
    goBack('Set deleted')
  }

  return (
    <>
      <h1 className={styles.title}>
        Edit set <span className={styles.liftName}>· {records.data.lift.name}</span>
      </h1>
      <SetForm
        records={records.data}
        initialValues={initialValues}
        unitFollowsMachine={false}
        defaultUnit={settings.data.default_unit}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </>
  )
}
