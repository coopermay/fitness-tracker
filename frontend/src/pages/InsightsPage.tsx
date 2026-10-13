import { Link } from 'react-router'
import { useBody, useSettings, useStrengthStandards } from '../api/queries'
import type { BodyUnits, Sex, StandardGuide } from '../api/types'
import { QueryStatus } from '../components/QueryStatus'
import { formatWeight, todayIsoDate } from '../format'
import styles from './InsightsPage.module.css'

const MISSING_LABELS = { sex: 'sex', birth_date: 'date of birth', height_cm: 'height', weight_kg: 'weight' }

// "2.8 L" or "95 fl oz" (rounded to 5 oz)
function formatWater(ml: number, units: BodyUnits): string {
  return units === 'metric' ? `${ml / 1000} L` : `${Math.round(ml / 29.5735 / 5) * 5} fl oz`
}

// The far-left tab: numbers worked out from your body stats (entered in
// Settings → Body stats) and your lifts.
export function InsightsPage() {
  const body = useBody(todayIsoDate())
  const settings = useSettings() // for the water units

  if (body.isPending || body.isError) {
    return <QueryStatus isError={body.isError} error={body.error} />
  }
  const { calories, protein, water, strength_score: score, relative_strength: strength, missing } = body.data
  const units = settings.data?.body_units ?? 'imperial'

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

      {score && (
        <div className={styles.score}>
          <span className={styles.scoreNumber}>{score.score}</span>
          <span className={styles.scoreText}>
            <strong>Strength score · {score.level}</strong>
            <span className={styles.muted}>
              Out of 100, from {score.graded_lifts} graded {score.graded_lifts === 1 ? 'lift' : 'lifts'}
            </span>
          </span>
        </div>
      )}

      {(calories || protein || water) && (
        <>
          <h2 className={styles.sectionLabel}>Your numbers</h2>
          <dl className={styles.stats}>
            {calories && (
              <>
                <Stat label="Maintenance" value={`${calories.maintenance} kcal`} strong />
                <Stat label="Cut (−500)" value={`${calories.cut} kcal`} />
                <Stat label="Lean bulk (+300)" value={`${calories.lean_bulk} kcal`} />
              </>
            )}
            {protein && (
              <Stat label="Protein" value={`${protein.min_g}–${protein.max_g} g a day`} strong />
            )}
            {water && (
              <Stat
                label="Water"
                value={`${formatWater(water.daily_ml, units)} a day`}
                note={`${formatWater(water.training_day_ml, units)} on training days`}
              />
            )}
          </dl>
        </>
      )}

      {strength.length > 0 && (
        <>
          <h2 className={styles.sectionLabel}>Relative strength</h2>
          <p className={styles.hint}>
            Best set's estimated 1RM ÷ bodyweight, on one machine per lift. Tap a lift to choose
            the machine. Barbell and dumbbell lifts are graded against standard ratios
            {missing.includes('sex') && ' (set your sex in Body stats to see grades)'}.
          </p>
          <ul className={styles.strength}>
            {strength.map((row) => (
              <li key={row.lift_id}>
                <Link className={styles.strengthRow} to={`/lifts/${row.lift_id}`}>
                  <span className={styles.strengthName}>
                    {row.lift_name}
                    <span className={styles.strengthDetail}>
                      {row.machine_name ?? 'No machine'}
                      {row.automatic} · {formatWeight(row.weight_value, row.weight_unit)}{' '}
                      × {row.reps}
                    </span>
                  </span>
                  <span className={styles.ratioColumn}>
                    <span className={styles.ratio}>{row.ratio.toFixed(2)}×</span>
                    {row.level && <span className={styles.level}>{row.level}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <StandardsGuide sex={settings.data?.sex ?? null} />

      {(calories || protein || strength.length > 0) && (
        <p className={styles.footnote}>
          Calories use the Mifflin-St Jeor formula times your activity level; protein is 1.6–2.2 g
          and water about 35 ml per kg of bodyweight. Strength standards are approximate and not
          age-adjusted. They're all estimates: adjust by how you actually respond.
        </p>
      )}
    </>
  )
}

interface StatProps {
  label: string
  value: string
  note?: string // a smaller second line under the value
  strong?: boolean
}

function Stat({ label, value, note, strong }: StatProps) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={strong ? styles.statValueStrong : styles.statValue}>
        {value}
        {note && <span className={styles.statNote}>{note}</span>}
      </dd>
    </div>
  )
}

// "Which lifts get a grade?": a collapsible list of every graded lift, how it's
// recognised, and the ratios for each level. <details> is a built-in HTML
// element that opens and closes when you tap its <summary>; no state needed.
function StandardsGuide({ sex }: { sex: Sex | null }) {
  const standards = useStrengthStandards()
  if (!standards.data) {
    return null
  }
  const equipment: StandardGuide['equipment'][] = ['Barbell', 'Dumbbell']

  return (
    <details className={styles.guide}>
      <summary className={styles.guideSummary}>Which lifts get a grade?</summary>
      <p className={styles.hint}>
        A lift is graded when its machine's name contains "Barbell" or "Dumbbell" and the lift's
        name contains one of the words below (but not the excluded ones). Dumbbell weights are per
        dumbbell. Machines aren't graded, since their numbers depend on the machine.
        {sex === null && ' Set your sex in Body stats to see grades.'}
      </p>
      {equipment.map((kind) => (
        <div key={kind}>
          <h3 className={styles.guideHeading}>{kind}</h3>
          <ul className={styles.guideList}>
            {standards.data
              .filter((item) => item.equipment === kind)
              .map((item) => (
                <li key={item.key} className={styles.guideItem}>
                  <strong>{item.label}</strong>
                  <span className={styles.muted}>
                    Name contains {item.name_words.map((word) => `"${word}"`).join(' or ')}
                    {item.excluded_words.length > 0 &&
                      `; not ${item.excluded_words.map((word) => `"${word}"`).join(', ')}`}
                  </span>
                  <Thresholds item={item} sex={sex} />
                </li>
              ))}
          </ul>
        </div>
      ))}
    </details>
  )
}

// "Novice 0.75× · Intermediate 1× · …" for your sex, or both if it isn't set.
function Thresholds({ item, sex }: { item: StandardGuide; sex: Sex | null }) {
  const rows: [string, number[]][] =
    sex === 'female'
      ? [['', item.female]]
      : sex === 'male'
        ? [['', item.male]]
        : [['Men: ', item.male], ['Women: ', item.female]]
  return (
    <>
      {rows.map(([prefix, values]) => (
        <span key={prefix} className={styles.guideThresholds}>
          {prefix}
          {item.levels.map((level, i) => (
            <span key={level}>
              {i > 0 && ' · '}
              <span className={styles.nowrap}>
                {level} {values[i]}×
              </span>
            </span>
          ))}
        </span>
      ))}
    </>
  )
}
