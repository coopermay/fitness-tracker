import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Machine } from '../api/types'
import styles from './MachineCombobox.module.css'

interface MachineComboboxProps {
  machines: Machine[] // already in display order (most recently used first)
  value: Machine | null // null = no machine
  onChange: (machine: Machine | null) => void
  // Creates (or finds, since the API is idempotent) a machine by name.
  onCreate: (name: string) => Promise<Machine>
}

// A text box with a dropdown: type to filter existing machines, tap one to
// pick it, or tap "Add '<name>'" to create a new one.
export function MachineCombobox({ machines, value, onChange, onCreate }: MachineComboboxProps) {
  const [text, setText] = useState(value?.name ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // useRef gives us a handle on the actual DOM element, here the wrapper
  // <div>, so we can ask "was this tap inside the combobox?".
  const containerRef = useRef<HTMLDivElement>(null)

  // While the text still shows the selected machine, list everything;
  // once the user types something different, filter by it.
  const isFiltering = text !== (value?.name ?? '')
  const query = isFiltering ? text.trim().toLowerCase() : ''
  const options = machines.filter((machine) => machine.name.toLowerCase().includes(query))
  const exactMatch = machines.find((machine) => machine.name.toLowerCase() === query)
  const canCreate = query !== '' && exactMatch === undefined

  function select(machine: Machine | null) {
    onChange(machine)
    setText(machine?.name ?? '')
    setIsOpen(false)
    setError(null)
  }

  async function create() {
    setIsCreating(true)
    setError(null)
    try {
      select(await onCreate(text.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add machine')
    } finally {
      setIsCreating(false)
    }
  }

  // Close the dropdown when the user taps anywhere outside it.
  //
  // useEffect runs code *after* React updates the screen. It's for "side
  // effects" outside React, like listening to events on the whole document.
  // The function it returns is the cleanup: React runs it before the effect
  // runs again and when the component goes away, so listeners never pile up.
  // Effects usually take a second argument, a list of values that should
  // trigger a re-run. Leaving it out means "re-run after every render", which
  // here keeps the listener seeing the latest `text` and `value`.
  useEffect(() => {
    if (!isOpen) {
      return
    }
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) {
        return // tap was inside the combobox
      }
      setIsOpen(false)
      // Resolve what was typed: empty means no machine, an exact name picks
      // that machine, anything else goes back to the previous choice.
      if (text.trim() === '') {
        select(null)
      } else if (exactMatch) {
        select(exactMatch)
      } else {
        setText(value?.name ?? '')
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  })

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false)
    } else if (event.key === 'Enter') {
      event.preventDefault() // don't submit the whole form
      if (exactMatch) {
        select(exactMatch)
      } else if (canCreate && options.length === 0) {
        void create()
      } else if (options.length > 0) {
        select(options[0])
      }
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <input
        id="machine"
        className={styles.input}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="machine-options"
        autoComplete="off"
        placeholder="No machine"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setIsOpen(true)
        }}
        onFocus={(event) => {
          event.target.select() // so typing replaces the current name
          setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />

      {isOpen && (
        <ul id="machine-options" role="listbox" className={styles.options}>
          {options.map((machine) => (
            <li
              key={machine.id}
              role="option"
              aria-selected={machine.id === value?.id}
              className={machine.id === value?.id ? styles.selectedOption : styles.option}
              onClick={() => select(machine)}
            >
              {machine.name}
            </li>
          ))}
          {canCreate && (
            <li role="option" aria-selected={false} className={styles.createOption} onClick={create}>
              {isCreating ? 'Adding…' : `Add “${text.trim()}”`}
            </li>
          )}
          {!isFiltering && (
            <li
              role="option"
              aria-selected={value === null}
              className={styles.noMachineOption}
              onClick={() => select(null)}
            >
              No machine
            </li>
          )}
        </ul>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
