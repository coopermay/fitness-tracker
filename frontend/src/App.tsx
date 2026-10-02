import { Route, Routes } from 'react-router'
import { TabBar } from './components/TabBar'
import { EditSetPage } from './pages/EditSetPage'
import { HomePage } from './pages/HomePage'
import { LiftPage } from './pages/LiftPage'
import { LogSetPage } from './pages/LogSetPage'
import { MuscleGroupPage } from './pages/MuscleGroupPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'

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
        <Route path="/lifts/:liftId/log" element={<LogSetPage />} />
        <Route path="/lifts/:liftId/sets/:setId" element={<EditSetPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <TabBar />
    </main>
  )
}

export default App
