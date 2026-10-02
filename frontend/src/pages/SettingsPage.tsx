import { useSettings, useUpdateSettings } from '../api/queries'
import type { WeightUnit } from '../api/types'
import { QueryStatus } from '../components/QueryStatus'
import styles from './SettingsPage.module.css'

const UNITS: WeightUnit[] = ['lbs', 'kg', 'plates']

export function SettingsPage() {
  const settings = useSettings()
  const updateSettings = useUpdateSettings()

  if (settings.isPending || settings.isError) {
    return <QueryStatus isError={settings.isError} error={settings.error} />
  }

  // While a change is saving, show the unit being saved as selected.
  const selected = updateSettings.isPending
    ? updateSettings.variables.default_unit
    : settings.data.default_unit

  return (
    <>
      <h1 className={styles.title}>Settings</h1>

      <h2 className={styles.label}>Default unit</h2>
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
