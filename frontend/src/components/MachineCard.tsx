import { useState } from 'react'
import type { MachineRecords, RecordRow } from '../api/types'
import { formatDate, formatReps, formatWeight } from '../format'
import { HistoryList } from './HistoryList'
import styles from './MachineCard.module.css'

interface MachineCardProps {
  group: MachineRecords
}

// One card per machine: the best set at each weight, plus expandable history.
export function MachineCard({ group }: MachineCardProps) {
  // Each card on the page is its own instance with its own state, so
  // expanding one card doesn't expand the others.
  const [showHistory, setShowHistory] = useState(false)

  // `?.` ("optional chaining") reads .name only if machine isn't null;
  // `??` supplies a fallback when the left side is null or undefined.
  const title = group.machine?.name ?? 'No machine'
  const showUnitHeadings = group.units.length > 1

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          {title}
          {group.machine?.archived && <span className={styles.archived}> (archived)</span>}
        </h2>
        {group.last_performed_on && (
          <span className={styles.lastDate}>{formatDate(group.last_performed_on)}</span>
        )}
      </header>

      {group.units.map((unitRecords) => (
        <div key={unitRecords.weight_unit}>
          {showUnitHeadings && <h3 className={styles.unitHeading}>{unitRecords.weight_unit}</h3>}
          <ul className={styles.records}>
            {unitRecords.records.map((record) => (
              <RecordLine key={record.set_id} record={record} />
            ))}
          </ul>
        </div>
      ))}

      <button
        type="button"
        className={styles.toggle}
        onClick={() => setShowHistory(!showHistory)}
        aria-expanded={showHistory}
      >
        {showHistory ? 'Hide history' : `History (${group.history.length})`}
      </button>
      {showHistory && <HistoryList sets={group.history} />}
    </section>
  )
}

// A small component used only by MachineCard, so it lives in the same file.
function RecordLine({ record }: { record: RecordRow }) {
  return (
    <li className={styles.recordLine}>
      <span className={styles.recordMain}>
        {formatWeight(record.weight_value, record.weight_unit)} ×{' '}
        {formatReps(record.reps, record.approximate)}
        {record.performed_on && (
          <span className={styles.recordDate}> · {formatDate(record.performed_on)}</span>
        )}
      </span>
      {record.estimated_1rm !== null && (
        <span className={styles.oneRepMax}>1RM {record.estimated_1rm}</span>
      )}
    </li>
  )
}
