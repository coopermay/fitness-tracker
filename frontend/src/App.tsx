import { useCallback, useRef } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { useSettings } from './api/queries'
import { TabBar } from './components/TabBar'
import { BodyPage } from './pages/BodyPage'
import { CalendarPage } from './pages/CalendarPage'
import { EditSetPage } from './pages/EditSetPage'
import { HomePage } from './pages/HomePage'
import { InsightsPage } from './pages/InsightsPage'
import { LiftPage } from './pages/LiftPage'
import { LogSetPage } from './pages/LogSetPage'
import { MuscleGroupPage } from './pages/MuscleGroupPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'
import { SplitPage } from './pages/SplitPage'
import { ThemePage } from './pages/ThemePage'
import { TodayPage } from './pages/TodayPage'
import { SwipeBackContext } from './swipeBack'
import { useTheme } from './theme'
import { slideStateFor, tabIndex, TAB_PATHS, type SlideState } from './tabs'
import { useSwipe } from './useSwipe'
import styles from './App.module.css'

// Routing: <Routes> looks at the current URL and renders the first <Route>
// whose path matches. `:muscleGroupId` is a URL parameter that the page reads
// with useParams(). Clicking a <Link> changes the URL without reloading the page.
function App() {
  const location = useLocation()
  const navigate = useNavigate()

  // Colours from Settings, applied on every page.
  const settings = useSettings()
  useTheme(settings.data?.theme_base, settings.data?.theme_accent)

  // On a tab page (Insights, Today, Home, Calendar, Settings), swiping moves to the next tab.
  const currentTab = tabIndex(location.pathname)
  function goToTab(index: number) {
    if (index >= 0 && index < TAB_PATHS.length) {
      navigate(TAB_PATHS[index], { state: slideStateFor(currentTab, index) })
    }
  }
  // On other pages, swiping right goes where the page's BackLink goes.
  // A ref, not state: changing it shouldn't re-render; it's only read on a swipe.
  const swipeBackTarget = useRef<string | null>(null)
  // useCallback with no dependencies keeps this the same function on every
  // render, so BackLink's effect doesn't re-run each time App renders.
  const setSwipeBackTarget = useCallback((to: string | null) => {
    swipeBackTarget.current = to
  }, [])
  function goBack() {
    if (swipeBackTarget.current !== null) {
      navigate(swipeBackTarget.current, { state: { slideFrom: 'left' } satisfies SlideState })
    }
  }
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => currentTab !== null && goToTab(currentTab + 1),
    onSwipeRight: () => (currentTab !== null ? goToTab(currentTab - 1) : goBack()),
  })

  // Slide the new page in from the side it came from (set by swipes and tab taps).
  const slideFrom = (location.state as SlideState | null)?.slideFrom
  const slideClass =
    slideFrom === 'right' ? styles.slideFromRight : slideFrom === 'left' ? styles.slideFromLeft : ''

  return (
    // Every BackLink inside can get setSwipeBackTarget with useContext.
    <SwipeBackContext value={setSwipeBackTarget}>
      <main>
        {/* key={pathname}: a new key makes React replace the element instead of
            updating it, so the slide animation plays again on every page change. */}
        <div key={location.pathname} className={`${styles.page} ${slideClass}`} {...swipeHandlers}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/muscle-groups/:muscleGroupId" element={<MuscleGroupPage />} />
            <Route path="/lifts/:liftId" element={<LiftPage />} />
            <Route path="/lifts/:liftId/log" element={<LogSetPage />} />
            <Route path="/lifts/:liftId/sets/:setId" element={<EditSetPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/split" element={<SplitPage />} />
            <Route path="/settings/theme" element={<ThemePage />} />
            <Route path="/settings/body" element={<BodyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        <TabBar />
      </main>
    </SwipeBackContext>
  )
}

export default App
