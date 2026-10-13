import { useMuscleGroups, useSplit } from '../api/queries'
import { BackLink } from '../components/BackLink'
import { QueryStatus } from '../components/QueryStatus'
import { SplitEditor } from '../components/SplitEditor'
import styles from './SettingsPage.module.css'

// Settings → Weekly split: pick what you train each day.
export function SplitPage() {
  const split = useSplit()
  const muscleGroups = useMuscleGroups()

  return (
    <>
      <BackLink to="/settings" label="Settings" />
      <h1 className={styles.title}>Weekly split</h1>
      <p className={styles.hint}>
        Pick what you train each day. Today's muscle groups are highlighted at the top of Home.
      </p>
      {split.isPending || split.isError || muscleGroups.isPending || muscleGroups.isError ? (
        <QueryStatus
          isError={split.isError || muscleGroups.isError}
          error={split.error ?? muscleGroups.error}
        />
      ) : (
        <SplitEditor split={split.data} muscleGroups={muscleGroups.data} />
      )}
    </>
  )
}
