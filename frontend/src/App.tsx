import { Route, Routes } from 'react-router'
import { HomePage } from './pages/HomePage'
import { LiftPage } from './pages/LiftPage'
import { MuscleGroupPage } from './pages/MuscleGroupPage'
import { NotFoundPage } from './pages/NotFoundPage'

// Routing: <Routes> looks at the current URL and renders the first <Route>
// whose path matches. `:muscleGroupId` is a URL parameter that the page reads
// with useParams(). Clicking a <Link> changes the URL without reloading the page.
function App() {
  return (
    <main>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/muscle-groups/:muscleGroupId" element={<MuscleGroupPage />} />
        <Route path="/lifts/:liftId" element={<LiftPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  )
}

export default App
