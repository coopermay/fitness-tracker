import { Link } from 'react-router'
import { useBody } from '../api/queries'
import { QueryStatus } from '../components/QueryStatus'
import { formatWeight, todayIsoDate } from '../format'
import styles from './InsightsPage.module.css'

const MISSING_LABELS = { sex: 'sex', birth_date: 'date of birth', height_cm: 'height', weight_kg: 'weight' }

// The far-left tab: numbers worked out from your body stats (entered in
// Settings → Body stats) and your lifts.
export function InsightsPage() {
  const body = useBody(todayIsoDate())

  if (body.isPending || body.isError) {
    return <QueryStatus isError={body.isError} error={body.error} />
  }
  const { age, calories, protein, relative_strength: strength, missing } = body.data

  return (
    <>
      <h1 className={styles.title}>Insights</h1>

      {missing.length > 0 && (
        <p className={styles.setup}>
          Add your {missing.map((field) => MISSING_LABELS[field]).join(', ')} in{' '}
          <Link to="/settings/body">Settings → Body stats</Link> to see{' '}
          {missing.includes('weight_kg') ? 'everything here' : 'your calories'}.
        </p>
      )}

      {(age !== null || calories || protein) && (
        <>
          <h2 className={styles.sectionLabel}>Your numbers</h2>
          <dl className={styles.stats}>
            {age !== null && <Stat label="Age" value={`${age}`} />}
            {calories && (
              <>
                <Stat label="Resting (BMR)" value={`${calories.bmr} kcal`} />
                <Stat label="Maintenance" value={`${calories.maintenance} kcal`} strong />
                <Stat label="Cut (−500)" value={`${calories.cut} kcal`} />
                <Stat label="Lean bulk (+300)" value={`${calories.lean_bulk} kcal`} />
              </>
            )}
            {protein && (
              <Stat label="Protein" value={`${protein.min_g}–${protein.max_g} g a day`} strong />
            )}
          </dl>
        </>
      )}

      {strength.length > 0 && (
        <>
          <h2 className={styles.sectionLabel}>Relative strength</h2>
          <p className={styles.hint}>Best estimated 1RM ÷ bodyweight.</p>
          <ul className={styles.strength}>
            {strength.map((row) => (
              <li key={row.lift_id}>
                <Link className={styles.strengthRow} to={`/lifts/${row.lift_id}`}>
                  <span className={styles.strengthName}>
                    {row.lift_name}
                    <span className={styles.strengthDetail}>
                      {row.machine_name ? `${row.machine_name} · ` : ''}
                      1RM {formatWeight(row.one_rep_max, row.weight_unit)}
                    </span>
                  </span>
                  <span className={styles.ratio}>{row.ratio.toFixed(2)}×</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {(calories || protein) && (
        <p className={styles.footnote}>
          Calories use the Mifflin-St Jeor formula times your activity level; protein is 1.6–2.2 g
          per kg of bodyweight. They're estimates: adjust by how your weight actually changes.
        </p>
      )}
    </>
  )
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={strong ? styles.statValueStrong : styles.statValue}>{value}</dd>
    </div>
  )
}
