import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { useCreateMachine, useGyms, useMachines } from '../api/queries'
import type { LiftRecords, Machine, SetFields, WeightUnit } from '../api/types'
import { lastUnitFor } from '../records'
import { MachineCombobox } from './MachineCombobox'
import styles from './SetForm.module.css'

const UNITS: WeightUnit[] = ['lbs', 'kg', 'plates']

// What the form holds while you edit. Number fields stay as text so that
// half-typed values like "72." don't get mangled.
export interface SetFormValues {
  machine: Machine | null
  weight: string
  unit: WeightUnit
  reps: string
  approximate: boolean
  performedOn: string // "" = unknown date
  notes: string
}

interface SetFormProps {
  records: LiftRecords
  initialValues: SetFormValues
  // When logging a new set, picking a machine also switches the unit to the
  // one last used on that machine. When editing, the unit is left alone.
  unitFollowsMachine: boolean
  defaultUnit: WeightUnit
  submitLabel: string
  onSubmit: (fields: SetFields) => Promise<void>
  onDelete?: () => Promise<void>
}

// Shared by the "log set" and "edit set" pages.
export function SetForm({
  records,
  initialValues,
  unitFollowsMachine,
  defaultUnit,
  submitLabel,
  onSubmit,
  onDelete,
}: SetFormProps) {
  // One state object for the whole form. `update` changes one field and keeps
  // the rest (`...values` copies the old fields; the new one overrides).
  const [values, setValues] = useState(initialValues)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // `Partial<SetFormValues>` = the same fields, all optional.
  // Passing a function to setValues ("updater form") gives us the latest
  // state, even if this runs after an `await` (e.g. after creating a machine).
  function update(changes: Partial<SetFormValues>) {
    setValues((previous) => ({ ...previous, ...changes }))
  }

  const machines = useMachines()
  const gyms = useGyms()
  const createMachine = useCreateMachine()

  const orderedMachines = orderByRecentUse(machines.data ?? [], records)

  // Single-gym for now: new machines go into the first gym.
  async function handleCreateMachine(name: string): Promise<Machine> {
    const gym = gyms.data?.[0]
    if (gym === undefined) {
      throw new Error('No gym exists yet')
    }
    return createMachine.mutateAsync({ name, gymId: gym.id })
  }

  function handleMachineChange(machine: Machine | null) {
    if (unitFollowsMachine) {
      const unit = lastUnitFor(records, machine?.id ?? null) ?? defaultUnit
      update({ machine, unit })
    } else {
      update({ machine })
    }
  }

  const weight = parseWeight(values.weight)
  const reps = parseReps(values.reps)
  const isValid = weight !== null && reps !== null

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (weight === null || reps === null) {
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSubmit({
        machine_id: values.machine?.id ?? null,
        weight_value: weight,
        weight_unit: values.unit,
        reps,
        approximate: values.approximate,
        performed_on: values.performedOn === '' ? null : values.performedOn,
        notes: values.notes.trim() === '' ? null : values.notes.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete || !window.confirm("Delete this set? This can't be undone.")) {
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
      setIsSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="machine" className={styles.label}>
          Machine
        </label>
        <MachineCombobox
          machines={orderedMachines}
          value={values.machine}
          onChange={handleMachineChange}
          onCreate={handleCreateMachine}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="weight" className={styles.label}>
          Weight
        </label>
        <div className={styles.row}>
          <input
            id="weight"
            className={styles.numberInput}
            inputMode="decimal"
            autoComplete="off"
            value={values.weight}
            onChange={(event) => update({ weight: event.target.value })}
          />
          <div className={styles.segmented} role="group" aria-label="Unit">
            {UNITS.map((unit) => (
              <button
                key={unit}
                type="button"
                className={unit === values.unit ? styles.segmentActive : styles.segment}
                aria-pressed={unit === values.unit}
                onClick={() => update({ unit })}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="reps" className={styles.label}>
          Reps
        </label>
        <div className={styles.row}>
          <input
            id="reps"
            className={styles.numberInput}
            inputMode="numeric"
            autoComplete="off"
            value={values.reps}
            onChange={(event) => update({ reps: event.target.value })}
          />
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={values.approximate}
              onChange={(event) => update({ approximate: event.target.checked })}
            />
            Approximate (~)
          </label>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="performed-on" className={styles.label}>
          Date <span className={styles.hint}>(clear if unknown)</span>
        </label>
        <input
          id="performed-on"
          type="date"
          className={styles.textInput}
          value={values.performedOn}
          onChange={(event) => update({ performedOn: event.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="notes" className={styles.label}>
          Notes
        </label>
        <textarea
          id="notes"
          className={styles.textInput}
          rows={2}
          value={values.notes}
          onChange={(event) => update({ notes: event.target.value })}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={styles.submit} disabled={!isValid || isSaving}>
        {isSaving ? 'Saving…' : submitLabel}
      </button>
      <Link className={styles.cancel} to={`/lifts/${records.lift.id}`}>
        Cancel
      </Link>
      {onDelete && (
        <button type="button" className={styles.delete} onClick={handleDelete} disabled={isSaving}>
          Delete set
        </button>
      )}
    </form>
  )
}

// Machines used for this lift come first (most recent first); the rest keep
// their usual order.
function orderByRecentUse(machines: Machine[], records: LiftRecords): Machine[] {
  const recentIds = records.machine_groups.flatMap((group) => (group.machine ? [group.machine.id] : []))
  const rank = (machine: Machine) => {
    const index = recentIds.indexOf(machine.id)
    return index === -1 ? recentIds.length : index
  }
  return [...machines].sort((a, b) => rank(a) - rank(b))
}

// "185" or "72.5" -> number; anything else -> null (invalid).
function parseWeight(text: string): number | null {
  return /^\d{1,5}(\.\d{1,2})?$/.test(text.trim()) ? Number(text) : null
}

// Whole number above zero, or null.
function parseReps(text: string): number | null {
  const reps = Number(text.trim())
  return /^\d+$/.test(text.trim()) && reps > 0 ? reps : null
}
