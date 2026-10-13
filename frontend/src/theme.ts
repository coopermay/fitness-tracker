import { useEffect } from 'react'
import type { ThemeAccent, ThemeBase } from './api/types'

// The choices shown in Settings, in display order.
export const THEME_BASES: { value: ThemeBase; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'black', label: 'Black' },
  { value: 'navy', label: 'Navy' },
]

export const THEME_ACCENTS: ThemeAccent[] = [
  'blue', 'green', 'purple', 'orange', 'red', 'pink', 'teal', 'gold',
]

// The last theme applied, kept in this browser so index.html can apply it
// before the app (and the settings request) has loaded. The server's settings
// are the real source; this is only a cache. Keep the key and the logic in
// sync with the script in index.html.
const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

// Sets data-base and data-accent on <html>; index.css does the rest.
function applyTheme(base: ThemeBase, accent: ThemeAccent) {
  const root = document.documentElement
  const systemBase = window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
  root.dataset.base = base === 'system' ? systemBase : base
  root.dataset.accent = accent

  // The browser's own toolbar / status bar colour follows the background.
  const background = getComputedStyle(root).getPropertyValue('--bg').trim()
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', background)
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ base, accent }))
  } catch {
    // Storage can be unavailable (e.g. private browsing); the theme still applies.
  }
}

// Keeps the page's colours in line with the saved theme. Does nothing until
// settings have loaded (the cached theme from index.html stays until then).
export function useTheme(base: ThemeBase | undefined, accent: ThemeAccent | undefined) {
  useEffect(() => {
    if (base === undefined || accent === undefined) {
      return
    }
    applyTheme(base, accent)
    if (base !== 'system') {
      return
    }
    // On "System", follow the phone switching between light and dark mode.
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => applyTheme(base, accent)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [base, accent])
}
