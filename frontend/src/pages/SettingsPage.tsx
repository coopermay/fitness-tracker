import { useState } from 'react'
import { Link } from 'react-router'
import { useCreateMuscleGroup, useSettings, useUpdateSettings } from '../api/queries'
import type { WeightUnit } from '../api/types'
import { AddByName } from '../components/AddByName'
import { QueryStatus } from '../components/QueryStatus'
import { THEME_ACCENTS, THEME_BASES } from '../theme'
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

  // useUpdateSettings changes the cache before the server answers, so these
  // already show what was just tapped.
  const { default_unit: selected, theme_base: base, theme_accent: accent } = settings.data

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

      <h2 className={styles.sectionLabel}>Theme</h2>
      <h3 className={styles.subLabel}>Background</h3>
      <div className={styles.bases} role="group" aria-label="Background">
        {THEME_BASES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={value === base ? styles.baseActive : styles.base}
            aria-pressed={value === base}
            onClick={() => updateSettings.mutate({ theme_base: value })}
          >
            {/* data-base gives the preview that base's colours (see index.css).
                System shows light and dark side by side. */}
            <span className={styles.basePreview} aria-hidden="true">
              {(value === 'system' ? ['light', 'dark'] : [value]).map((half) => (
                <span key={half} className={styles.basePreviewHalf} data-base={half}>
                  <span className={styles.basePreviewDot} />
                </span>
              ))}
            </span>
            {label}
          </button>
        ))}
      </div>

      <h3 className={styles.subLabel}>Accent</h3>
      <div className={styles.accents} role="group" aria-label="Accent colour">
        {THEME_ACCENTS.map((value) => (
          <button
            key={value}
            type="button"
            className={value === accent ? styles.accentActive : styles.accent}
            aria-pressed={value === accent}
            onClick={() => updateSettings.mutate({ theme_accent: value })}
          >
            <span className={styles.accentSwatch} data-accent={value} aria-hidden="true" />
            {value}
          </button>
        ))}
      </div>
      {updateSettings.isError && (
        <p className={styles.error}>Couldn't save: {updateSettings.error.message}</p>
      )}

      <h2 className={styles.sectionLabel}>Weekly split</h2>
      <p className={styles.hint}>
        Pick what you train each day. Today's muscle groups are highlighted at the top of Home.
      </p>
      <Link className={styles.linkRow} to="/settings/split">
        Edit weekly split
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      <h2 className={styles.sectionLabel}>Muscle groups</h2>
      <p className={styles.hint}>New muscle groups appear on the Home screen.</p>
      <AddByName
        buttonLabel="+ Add muscle group"
        placeholder="Muscle group name"
        onAdd={addMuscleGroup}
      />
      {addedMessage && <p className={styles.added}>{addedMessage}</p>}
    </>
  )
}
