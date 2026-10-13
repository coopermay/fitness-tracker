import { useContext, useEffect } from 'react'
import { Link } from 'react-router'
import { SwipeBackContext } from '../swipeBack'
import type { SlideState } from '../tabs'
import styles from './BackLink.module.css'

interface BackLinkProps {
  to: string
  label: string // where it goes, e.g. "Muscle groups" or "Chest"
}

// Going back slides the previous page in from the left.
const BACK_SLIDE: SlideState = { slideFrom: 'left' }

// The "‹ Previous page" button at the top of a page. While it's on screen,
// swiping right goes to the same place.
export function BackLink({ to, label }: BackLinkProps) {
  const setSwipeBackTarget = useContext(SwipeBackContext)
  useEffect(() => {
    setSwipeBackTarget(to)
    return () => setSwipeBackTarget(null) // the page is going away
  }, [setSwipeBackTarget, to])

  return (
    <Link className={styles.back} to={to} state={BACK_SLIDE}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {label}
    </Link>
  )
}
