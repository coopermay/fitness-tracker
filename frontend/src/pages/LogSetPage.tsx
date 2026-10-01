import { useNavigate, useParams } from 'react-router'
import { useCreateSet, useLiftRecords, useSettings } from '../api/queries'
import type { SetFields } from '../api/types'
import { QueryStatus } from '../components/QueryStatus'
import { SetForm, type SetFormValues } from '../components/SetForm'
import type { LiftPageState } from '../flash'
import { formatReps, formatWeight, todayIsoDate } from '../format'
import { lastUnitFor } from '../records'
import styles from './FormPage.module.css'

export function LogSetPage() {
  const liftId = Number(useParams().liftId)
  // useNavigate gives a function for changing pages from code (e.g. after saving).
  const navigate = useNavigate()
  const records = useLiftRecords(liftId)
  const settings = useSettings()
  const createSet = useCreateSet(liftId)

  if (records.isPending || records.isError) {
    return <QueryStatus isError={records.isError} error={records.error} />
  }
  if (settings.isPending || settings.isError) {
    return <QueryStatus isError={settings.isError} error={settings.error} />
  }

  const defaultUnit = settings.data.default_unit
  // Start with the machine used most recently for this lift.
  const machine = records.data.machine_groups[0]?.machine ?? null
  const initialValues: SetFormValues = {
    machine,
    weight: '',
    unit: lastUnitFor(records.data, machine?.id ?? null) ?? defaultUnit,
    reps: '',
    approximate: false,
    performedOn: todayIsoDate(),
    notes: '',
  }

  async function handleSubmit(fields: SetFields) {
    const created = await createSet.mutateAsync({ lift_id: liftId, ...fields })
    const weight = formatWeight(created.weight_value, created.weight_unit)
    const state: LiftPageState = {
      flash: created.is_new_record
        ? { text: `New best at ${weight}!`, isRecord: true }
        : { text: `Logged ${weight} × ${formatReps(created.reps, created.approximate)}`, isRecord: false },
    }
    // replace: true swaps out the form in the browser history, so the phone's
    // back button goes to the muscle group instead of back into the form.
    navigate(`/lifts/${liftId}`, { replace: true, state })
  }

  return (
    <>
      <h1 className={styles.title}>
        Log set <span className={styles.liftName}>· {records.data.lift.name}</span>
      </h1>
      <SetForm
        records={records.data}
        initialValues={initialValues}
        unitFollowsMachine
        defaultUnit={defaultUnit}
        submitLabel="Save set"
        onSubmit={handleSubmit}
      />
    </>
  )
}
