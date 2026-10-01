import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <>
      <h1>Not found</h1>
      <Link to="/">Back to muscle groups</Link>
    </>
  )
}
