import { Link, useParams } from 'react-router'

// Placeholder so links from the muscle group page work. Built in Phase 4.
export function LiftPage() {
  const { liftId } = useParams()
  return (
    <>
      <Link to="/">‹ Muscle groups</Link>
      <p>Lift {liftId}: records and history come in the next phase.</p>
    </>
  )
}
