import { useState } from 'react'
import { useUpdateSplit } from '../api/queries'
import type { MuscleGroup, Split } from '../api/types'
import styles from './SplitEditor.module.css'

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface SplitEditorProps {
  split: Split // as saved on the server
  muscleGroups: MuscleGroup[] // the ones you can pick (not archived)
}

// Muscle group ids per weekday, Monday first, each list sorted so two drafts
// can be compared.
type Draft = number[][]

function toDraft(split: Split): Draft {
  return WEEKDAY_NAMES.map((_, weekday) => {
    const day = split.days.find((d) => d.weekday === weekday)
    return [...(day?.muscle_group_ids ?? [])].sort((a, b) => a - b)
  })
}

// The week as a list of days: tap one to pick its muscle groups, then save.
export function SplitEditor({ split, muscleGroups }: SplitEditorProps) {
  const updateSplit = useUpdateSplit()
  // Changes are kept in this draft until you press Save.
  const [draft, setDraft] = useState<Draft>(() => toDraft(split))
  const [openDay, setOpenDay] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(toDraft(split))

  function toggle(weekday: number, muscleGroupId: number) {
    setDraft((previous) =>
      previous.map((ids, day) => {
        if (day !== weekday) {
          return ids
        }
        const next = ids.includes(muscleGroupId)
          ? ids.filter((id) => id !== muscleGroupId)
          : [...ids, muscleGroupId]
        return next.sort((a, b) => a - b)
      }),
    )
    setMessage(null)
  }

  async function save() {
    setMessage(null)
    try {
      await updateSplit.mutateAsync({
        days: draft.map((ids, weekday) => ({ weekday, muscle_group_ids: ids })),
      })
      setOpenDay(null)
      setMessage('Split saved.')
    } catch (err) {
      setMessage(err instanceof Error ? `Couldn't save: ${err.message}` : "Couldn't save")
    }
  }

  // "Chest, Triceps" in the same order as the Home screen, or "Rest".
  function summary(ids: number[]): string {
    const names = muscleGroups.filter((group) => ids.includes(group.id)).map((group) => group.name)
    return names.length > 0 ? names.join(', ') : 'Rest'
  }

  return (
    <div>
      <ul className={styles.days}>
        {WEEKDAY_NAMES.map((name, weekday) => {
          const isOpen = openDay === weekday
          return (
            <li key={name} className={styles.day}>
              <button
                type="button"
                className={styles.dayButton}
                aria-expanded={isOpen}
                onClick={() => setOpenDay(isOpen ? null : weekday)}
              >
                <span className={styles.dayName}>{name}</span>
                <span className={styles.summary}>{summary(draft[weekday])}</span>
                <span className={styles.chevron} aria-hidden="true">
                  {isOpen ? '⌃' : '⌄'}
                </span>
              </button>

              {isOpen && (
                <div className={styles.chips} role="group" aria-label={`Muscle groups for ${name}`}>
                  {muscleGroups.map((group) => {
                    const selected = draft[weekday].includes(group.id)
                    return (
                      <button
                        key={group.id}
                        type="button"
                        className={selected ? styles.chipSelected : styles.chip}
                        aria-pressed={selected}
                        onClick={() => toggle(weekday, group.id)}
                      >
                        {group.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        className={styles.save}
        disabled={!hasChanges || updateSplit.isPending}
        onClick={save}
      >
        {updateSplit.isPending ? 'Saving…' : 'Save split'}
      </button>
      {message && <p className={styles.message}>{message}</p>}
    </div>
  )
}
