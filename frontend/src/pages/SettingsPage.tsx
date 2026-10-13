import { useState } from 'react'
import { Link } from 'react-router'
import { useCreateMuscleGroup, useSettings, useUpdateSettings } from '../api/queries'
import type { WeightUnit } from '../api/types'
import { AddByName } from '../components/AddByName'
import { QueryStatus } from '../components/QueryStatus'
import styles from './SettingsPage.module.css'

const UNITS: WeightUnit[] = ['lbs', 'kg', 'plates']

export function SettingsPage() {
  const settings = useSettings()
  const updateSettings = useUpdateSettings()
  const createMuscleGroup = useCreateMuscleGroup()
  // Confirms the add, since the new group appears on Home, not on this page.
  const [addedMessage, setAddedMessage] = useState<string | null>(null)

  async function addMuscleGroup(name: string) {
    const muscleGroup = await createMuscleGroup.mutateAsync(name)
    setAddedMessage(`“${muscleGroup.name}” is on the Home screen.`)
  }

  if (settings.isPending || settings.isError) {
    return <QueryStatus isError={settings.isError} error={settings.error} />
  }

  // useUpdateSettings changes the cache before the server answers, so this
  // already shows what was just tapped.
  const selected = settings.data.default_unit

  return (
    <>
      <h1 className={styles.title}>Settings</h1>

      <h2 className={styles.label}>Muscle groups</h2>
      <p className={styles.hint}>New muscle groups appear on the Home screen.</p>
      <AddByName
        buttonLabel="+ Add muscle group"
        placeholder="Muscle group name"
        onAdd={addMuscleGroup}
      />
      {addedMessage && <p className={styles.added}>{addedMessage}</p>}

      <h2 className={styles.sectionLabel}>Weekly split</h2>
      <p className={styles.hint}>
        Pick what you train each day. Today's muscle groups are highlighted at the top of Home.
      </p>
      <SettingsLink to="/settings/split" label="Edit weekly split" />

      <h2 className={styles.sectionLabel}>Theme</h2>
      <p className={styles.hint}>Background and accent colours.</p>
      <SettingsLink to="/settings/theme" label="Change theme" />

      <h2 className={styles.sectionLabel}>Default unit</h2>
      <p className={styles.hint}>
        Used when logging a lift + machine for the first time. After that, the unit you last used
        there is remembered.
      </p>
      <div className={styles.segmented} role="group" aria-label="Default unit">
        {UNITS.map((unit) => (
          <button
            key={unit}
            type="button"
            className={unit === selected ? styles.segmentActive : styles.segment}
            aria-pressed={unit === selected}
            onClick={() => updateSettings.mutate({ default_unit: unit })}
          >
            {unit}
          </button>
        ))}
      </div>
      {updateSettings.isError && (
        <p className={styles.error}>Couldn't save: {updateSettings.error.message}</p>
      )}
    </>
  )
}

// A full-width row that opens a sub-page, with a chevron on the right.
function SettingsLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className={styles.linkRow} to={to}>
      {label}
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
