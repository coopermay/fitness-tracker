import { useId, useState, type SubmitEvent } from 'react'
import styles from './EditItem.module.css'

interface EditItemProps {
  name: string
  archived: boolean
  // Shown in the archive confirmation, e.g. "Its lifts stay in your history."
  archiveNote: string
  onRename: (name: string) => Promise<unknown>
  onSetArchived: (archived: boolean) => Promise<unknown>
}

// A small "Edit" button that opens rename + archive controls for a muscle
// group, lift, or machine.
export function EditItem({ name, archived, archiveNote, onRename, onSetArchived }: EditItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(name)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A page can show several of these (one per machine card), and each <label>
  // needs a unique id to point at. useId() generates one per component instance.
  const inputId = useId()

  function open() {
    setDraft(name) // start from the current name, in case it changed since
    setError(null)
    setIsOpen(true)
  }

  // Runs an API call, showing "Saving…" and any error. Closes on success.
  async function run(action: () => Promise<unknown>) {
    setIsSaving(true)
    setError(null)
    try {
      await action()
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRename(event: SubmitEvent) {
    event.preventDefault()
    if (draft.trim() === '' || draft.trim() === name) {
      setIsOpen(false)
      return
    }
    await run(() => onRename(draft))
  }

  async function handleArchive() {
    if (window.confirm(`Archive “${name}”? ${archiveNote}`)) {
      await run(() => onSetArchived(true))
    }
  }

  if (!isOpen) {
    return (
      <button type="button" className={styles.editButton} onClick={open}>
        Edit
      </button>
    )
  }

  return (
    <form className={styles.panel} onSubmit={handleRename}>
      <label className={styles.label} htmlFor={inputId}>
        Name
      </label>
      <input
        id={inputId}
        className={styles.input}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={100}
        autoFocus
      />
      <div className={styles.actions}>
        <button type="submit" className={styles.save} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className={styles.cancel} onClick={() => setIsOpen(false)} disabled={isSaving}>
          Cancel
        </button>
      </div>
      {archived ? (
        <button type="button" className={styles.restore} onClick={() => run(() => onSetArchived(false))} disabled={isSaving}>
          Unarchive
        </button>
      ) : (
        <button type="button" className={styles.archive} onClick={handleArchive} disabled={isSaving}>
          Archive
        </button>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
