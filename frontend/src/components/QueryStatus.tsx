// Shown while a query is loading or after it failed.
// Pages use it as: if (query.isPending || query.isError) return <QueryStatus ... />

interface QueryStatusProps {
  isError: boolean
  error: Error | null
}

export function QueryStatus({ isError, error }: QueryStatusProps) {
  if (isError) {
    return <p style={{ color: 'var(--error)' }}>Couldn't load: {error?.message}</p>
  }
  return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
}
