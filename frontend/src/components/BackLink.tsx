import { Link } from 'react-router'
import styles from './BackLink.module.css'

interface BackLinkProps {
  to: string
  label: string // where it goes, e.g. "Muscle groups" or "Chest"
}

// The "‹ Previous page" button at the top of a page.
export function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link className={styles.back} to={to}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {label}
    </Link>
  )
}
