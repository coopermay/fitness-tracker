import { useSettings, useUpdateSettings } from '../api/queries'
import { BackLink } from '../components/BackLink'
import { QueryStatus } from '../components/QueryStatus'
import { THEME_ACCENTS, THEME_BASES } from '../theme'
import styles from './SettingsPage.module.css'

// Settings → Theme: background and accent color. Tapping saves right away,
// and App's useTheme re-colors the whole app.
export function ThemePage() {
  const settings = useSettings()
  const updateSettings = useUpdateSettings()

  if (settings.isPending || settings.isError) {
    return <QueryStatus isError={settings.isError} error={settings.error} />
  }

  // useUpdateSettings changes the cache before the server answers, so these
  // already show what was just tapped.
  const { theme_base: base, theme_accent: accent } = settings.data

  return (
    <>
      <BackLink to="/settings" label="Settings" />
      <h1 className={styles.title}>Theme</h1>

      <h2 className={styles.label}>Background</h2>
      <p className={styles.hint}>System follows your phone's light or dark mode.</p>
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

      <h2 className={styles.sectionLabel}>Accent</h2>
      <p className={styles.hint}>Buttons, highlights, body figures and the calendar.</p>
      <div className={styles.accents} role="group" aria-label="Accent color">
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
    </>
  )
}
