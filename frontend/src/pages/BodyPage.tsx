import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useBody, useSettings, useUpdateSettings } from '../api/queries'
import type { ActivityLevel, BodyUnits, Settings, Sex } from '../api/types'
import { BackLink } from '../components/BackLink'
import { QueryStatus } from '../components/QueryStatus'
import { cmToFeetInches, feetInchesToCm, kgToLbs, lbsToKg } from '../body'
import { formatWeight, todayIsoDate } from '../format'
import styles from './BodyPage.module.css'

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary (desk job, little exercise)' },
  { value: 'light', label: 'Light (exercise 1–3 days a week)' },
  { value: 'moderate', label: 'Moderate (3–5 days)' },
  { value: 'active', label: 'Active (6–7 days)' },
  { value: 'very_active', label: 'Very active (hard training + physical job)' },
]

const MISSING_LABELS = { sex: 'sex', birth_date: 'date of birth', height_cm: 'height', weight_kg: 'weight' }

// Settings → Body stats: enter sex, date of birth, height, weight and activity;
// below, the numbers worked out from them.
export function BodyPage() {
  const settings = useSettings()
  const updateSettings = useUpdateSettings()
  const body = useBody(todayIsoDate())

  if (settings.isPending || settings.isError) {
    return <QueryStatus isError={settings.isError} error={settings.error} />
  }
  const units = settings.data.body_units

  return (
    <>
      <BackLink to="/settings" label="Settings" />
      <h1 className={styles.title}>Body stats</h1>

      <div className={styles.segmented} role="group" aria-label="Units">
        {(['imperial', 'metric'] as BodyUnits[]).map((value) => (
          <button
            key={value}
            type="button"
            className={value === units ? styles.segmentActive : styles.segment}
            aria-pressed={value === units}
            onClick={() => updateSettings.mutate({ body_units: value })}
          >
            {value === 'imperial' ? 'ft / lbs' : 'cm / kg'}
          </button>
        ))}
      </div>

      {/* key={units}: switching units remounts the form, so its fields start
          again from the saved values, converted to the new units. */}
      <BodyForm key={units} settings={settings.data} />

      <h2 className={styles.sectionLabel}>Your numbers</h2>
      {body.isPending || body.isError ? (
        <QueryStatus isError={body.isError} error={body.error} />
      ) : (
        <>
          {body.data.missing.length > 0 && (
            <p className={styles.hint}>
              Add your {body.data.missing.map((field) => MISSING_LABELS[field]).join(', ')} to
              see {body.data.missing.includes('weight_kg') ? 'everything' : 'your calories'}.
            </p>
          )}

          <dl className={styles.stats}>
            {body.data.age !== null && <Stat label="Age" value={`${body.data.age}`} />}
            {body.data.calories && (
              <>
                <Stat label="Resting (BMR)" value={`${body.data.calories.bmr} kcal`} />
                <Stat label="Maintenance" value={`${body.data.calories.maintenance} kcal`} strong />
                <Stat label="Cut (−500)" value={`${body.data.calories.cut} kcal`} />
                <Stat label="Lean bulk (+300)" value={`${body.data.calories.lean_bulk} kcal`} />
              </>
            )}
            {body.data.protein && (
              <Stat
                label="Protein"
                value={`${body.data.protein.min_g}–${body.data.protein.max_g} g a day`}
                strong
              />
            )}
          </dl>

          {body.data.relative_strength.length > 0 && (
            <>
              <h2 className={styles.sectionLabel}>Relative strength</h2>
              <p className={styles.hint}>Best estimated 1RM ÷ bodyweight.</p>
              <ul className={styles.strength}>
                {body.data.relative_strength.map((row) => (
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
          <p className={styles.footnote}>
            Calories use the Mifflin-St Jeor formula times your activity level; protein is
            1.6–2.2 g per kg of bodyweight. They're estimates: adjust by how your weight actually
            changes.
          </p>
        </>
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

// The inputs, as strings while typing (like SetForm). Saved together.
interface BodyFormValues {
  sex: Sex | null
  birthDate: string
  heightCm: string
  heightFeet: string
  heightInches: string
  weight: string // lbs or kg, depending on units
  activity: ActivityLevel
}

function initialValues(settings: Settings): BodyFormValues {
  const height = settings.height_cm
  const feetInches = height !== null ? cmToFeetInches(height) : null
  const weight = settings.weight_kg
  return {
    sex: settings.sex,
    birthDate: settings.birth_date ?? '',
    heightCm: height !== null ? String(height) : '',
    heightFeet: feetInches ? String(feetInches.feet) : '',
    heightInches: feetInches ? String(feetInches.inches) : '',
    weight:
      weight === null ? '' : String(settings.body_units === 'metric' ? weight : kgToLbs(weight)),
    activity: settings.activity_level,
  }
}

function BodyForm({ settings }: { settings: Settings }) {
  const updateSettings = useUpdateSettings()
  const metric = settings.body_units === 'metric'
  const [values, setValues] = useState(() => initialValues(settings))
  const [message, setMessage] = useState<string | null>(null)

  function update(changes: Partial<BodyFormValues>) {
    setValues((previous) => ({ ...previous, ...changes }))
    setMessage(null)
  }

  // Empty fields are saved as "not entered" (null).
  function heightCm(): number | null {
    if (metric) {
      return values.heightCm.trim() === '' ? null : Number(values.heightCm)
    }
    if (values.heightFeet.trim() === '' && values.heightInches.trim() === '') {
      return null
    }
    return feetInchesToCm(Number(values.heightFeet || 0), Number(values.heightInches || 0))
  }

  function weightKg(): number | null {
    if (values.weight.trim() === '') {
      return null
    }
    return metric ? Math.round(Number(values.weight) * 100) / 100 : lbsToKg(Number(values.weight))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const height = heightCm()
    const weight = weightKg()
    if (height !== null && (Number.isNaN(height) || height < 50 || height > 275)) {
      setMessage('Height looks off. Check the numbers.')
      return
    }
    if (weight !== null && (Number.isNaN(weight) || weight < 20 || weight > 400)) {
      setMessage('Weight looks off. Check the number.')
      return
    }
    try {
      await updateSettings.mutateAsync({
        sex: values.sex,
        birth_date: values.birthDate || null,
        height_cm: height,
        weight_kg: weight,
        activity_level: values.activity,
      })
      setMessage('Saved.')
    } catch (err) {
      setMessage(err instanceof Error ? `Couldn't save: ${err.message}` : "Couldn't save")
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <span className={styles.label}>Sex</span>
        <div className={styles.segmented} role="group" aria-label="Sex">
          {(['male', 'female'] as Sex[]).map((value) => (
            <button
              key={value}
              type="button"
              className={value === values.sex ? styles.segmentActive : styles.segment}
              aria-pressed={value === values.sex}
              onClick={() => update({ sex: value })}
            >
              {value === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Date of birth</span>
        <input
          className={styles.input}
          type="date"
          max={todayIsoDate()}
          value={values.birthDate}
          onChange={(event) => update({ birthDate: event.target.value })}
        />
      </label>

      <div className={styles.field}>
        <span className={styles.label}>Height</span>
        {metric ? (
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              inputMode="decimal"
              aria-label="Height in cm"
              value={values.heightCm}
              onChange={(event) => update({ heightCm: event.target.value })}
            />
            <span className={styles.suffix}>cm</span>
          </div>
        ) : (
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              inputMode="numeric"
              aria-label="Height, feet"
              value={values.heightFeet}
              onChange={(event) => update({ heightFeet: event.target.value })}
            />
            <span className={styles.suffix}>ft</span>
            <input
              className={styles.input}
              inputMode="numeric"
              aria-label="Height, inches"
              value={values.heightInches}
              onChange={(event) => update({ heightInches: event.target.value })}
            />
            <span className={styles.suffix}>in</span>
          </div>
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Bodyweight</span>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            inputMode="decimal"
            aria-label={`Bodyweight in ${metric ? 'kg' : 'lbs'}`}
            value={values.weight}
            onChange={(event) => update({ weight: event.target.value })}
          />
          <span className={styles.suffix}>{metric ? 'kg' : 'lbs'}</span>
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Activity level</span>
        <select
          className={styles.input}
          value={values.activity}
          onChange={(event) => update({ activity: event.target.value as ActivityLevel })}
        >
          {ACTIVITY_LEVELS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className={styles.save} disabled={updateSettings.isPending}>
        {updateSettings.isPending ? 'Saving…' : 'Save'}
      </button>
      {message && <p className={styles.message}>{message}</p>}
    </form>
  )
}
