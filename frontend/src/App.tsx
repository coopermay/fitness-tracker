import { useEffect, useState } from 'react'

// The shape of the JSON that GET /api/health returns.
// A TypeScript `interface` describes an object's fields and their types.
interface HealthResponse {
  status: string
}

// The three things the page can be showing at any moment.
type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthResponse }
  | { kind: 'error'; message: string }

// A React "component" is a function that returns what to show on screen.
// This is a temporary Phase 0 page that proves the frontend can reach the API.
// In Phase 3 it gets replaced by real pages, and the fetching moves to TanStack Query.
function App() {
  // useState holds a value that, when changed, makes React re-render this component.
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })

  // useEffect runs code *after* the component appears on screen.
  // The empty [] at the end means "run once, when it first appears".
  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.json() as Promise<HealthResponse>
      })
      .then((data) => setHealth({ kind: 'ok', data }))
      .catch((error: Error) => setHealth({ kind: 'error', message: error.message }))
  }, [])

  return (
    <main>
      <h1>Lift Tracker</h1>
      {health.kind === 'loading' && <p>Checking API…</p>}
      {health.kind === 'ok' && (
        <p style={{ color: 'var(--ok)' }}>API status: {health.data.status}</p>
      )}
      {health.kind === 'error' && (
        <p style={{ color: 'var(--error)' }}>API unreachable: {health.message}</p>
      )}
    </main>
  )
}

export default App
