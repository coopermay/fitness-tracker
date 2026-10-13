import { createContext } from 'react'

// Lets a page tell App where swiping right should go: the target of its
// BackLink, or null when it has none (tab pages, forms).
//
// A context passes a value down to every component inside its provider
// without threading it through props. App provides the function; BackLink
// calls it while it's on screen. Outside a provider it does nothing.
export const SwipeBackContext = createContext<(to: string | null) => void>(() => {})
