import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { TabBar } from './components/TabBar'
import { CalendarPage } from './pages/CalendarPage'
import { EditSetPage } from './pages/EditSetPage'
import { HomePage } from './pages/HomePage'
import { LiftPage } from './pages/LiftPage'
import { LogSetPage } from './pages/LogSetPage'
import { MuscleGroupPage } from './pages/MuscleGroupPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'
import { slideStateFor, tabIndex, TAB_PATHS, type SlideState } from './tabs'
import { useSwipe } from './useSwipe'
import styles from './App.module.css'

// Routing: <Routes> looks at the current URL and renders the first <Route>
// whose path matches. `:muscleGroupId` is a URL parameter that the page reads
// with useParams(). Clicking a <Link> changes the URL without reloading the page.
function App() {
  const location = useLocation()
  const navigate = useNavigate()

  // On a tab page (Home, Calendar, Settings), swiping moves to the next tab.
  const currentTab = tabIndex(location.pathname)
  function goToTab(index: number) {
    if (index >= 0 && index < TAB_PATHS.length) {
      navigate(TAB_PATHS[index], { state: slideStateFor(currentTab, index) })
    }
  }
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => currentTab !== null && goToTab(currentTab + 1),
    onSwipeRight: () => currentTab !== null && goToTab(currentTab - 1),
  })

  // Slide the new page in from the side it came from (set by swipes and tab taps).
  const slideFrom = (location.state as SlideState | null)?.slideFrom
  const slideClass =
    slideFrom === 'right' ? styles.slideFromRight : slideFrom === 'left' ? styles.slideFromLeft : ''

  return (
    <main>
      {/* key={pathname}: a new key makes React replace the element instead of
          updating it, so the slide animation plays again on every page change. */}
      <div
        key={location.pathname}
        className={`${styles.page} ${slideClass}`}
        {...(currentTab !== null ? swipeHandlers : {})}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/muscle-groups/:muscleGroupId" element={<MuscleGroupPage />} />
          <Route path="/lifts/:liftId" element={<LiftPage />} />
          <Route path="/lifts/:liftId/log" element={<LogSetPage />} />
          <Route path="/lifts/:liftId/sets/:setId" element={<EditSetPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <TabBar />
    </main>
  )
}

export default App
