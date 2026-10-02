import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import styles from './TabBar.module.css'

// The bar fixed to the bottom of every screen, like a social media app.
// Five slots: blank placeholders for future tabs, Home in the middle, and
// Settings on the right.
export function TabBar() {
  const { pathname } = useLocation()
  const onSettings = pathname.startsWith('/settings')

  return (
    <nav className={styles.bar} aria-label="Main">
      <div className={styles.slots}>
        <span className={styles.placeholder} aria-hidden="true" />
        <span className={styles.placeholder} aria-hidden="true" />
        {/* Home stays highlighted on muscle group and lift pages too, since
            they're all reached from Home. */}
        <Tab to="/" label="Home" active={!onSettings} icon={<HomeIcon />} />
        <span className={styles.placeholder} aria-hidden="true" />
        <Tab to="/settings" label="Settings" active={onSettings} icon={<SettingsIcon />} />
      </div>
    </nav>
  )
}

interface TabProps {
  to: string
  label: string
  active: boolean
  // ReactNode: anything React can render (an element, text, etc.)
  icon: ReactNode
}

function Tab({ to, label, active, icon }: TabProps) {
  return (
    <Link
      to={to}
      className={active ? styles.tabActive : styles.tab}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      <span className={styles.label}>{label}</span>
    </Link>
  )
}

// Icons are inline SVGs; `currentColor` makes them follow the text colour.
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
