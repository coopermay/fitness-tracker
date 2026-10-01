import { useState, type SubmitEvent } from 'react'
import styles from './AddByName.module.css'

// "Props" are a component's inputs, like function arguments. The parent
// passes them as JSX attributes: <AddByName buttonLabel="+ Add lift" ... />.
// This interface says which props exist and their types.
interface AddByNameProps {
  buttonLabel: string
  placeholder: string
  // Called with the typed name. Returns a Promise so we can wait for the
  // save to finish (or fail) before closing the form.
  onAdd: (name: string) => Promise<unknown>
  // `?` means optional: callers may leave it out.
  subtle?: boolean
}

// A button that turns into a one-field form for adding something by name.
// Used for "add muscle group" and "add lift".
export function AddByName({ buttonLabel, placeholder, onAdd, subtle = false }: AddByNameProps) {
  // Each useState call is one piece of state this component remembers
  // between re-renders. Changing it (via the setter) re-renders the component.
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setIsOpen(false)
    setName('')
    setError(null)
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault() // stop the browser's default full-page form submit
    if (name.trim() === '') {
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onAdd(name)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className={subtle ? styles.subtleButton : styles.button}
        onClick={() => setIsOpen(true)}
      >
        {buttonLabel}
      </button>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* A "controlled input": React state holds the value, and every
          keystroke calls setName, which re-renders with the new value. */}
      <input
        className={styles.input}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={placeholder}
        autoFocus
        maxLength={100}
      />
      <div className={styles.actions}>
        <button type="submit" className={styles.save} disabled={isSaving || name.trim() === ''}>
          {isSaving ? 'Saving…' : 'Add'}
        </button>
        <button type="button" className={styles.cancel} onClick={close} disabled={isSaving}>
          Cancel
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
