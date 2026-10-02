import { useRef, type TouchEvent } from 'react'

// A custom hook: a plain function whose name starts with `use` and that calls
// other hooks (here useRef). It packages up reusable behaviour; the component
// spreads the returned handlers onto an element: <div {...swipeHandlers}>.

const MIN_DISTANCE = 60 // px the finger must travel sideways

interface SwipeOptions {
  onSwipeLeft: () => void // finger moved right-to-left
  onSwipeRight: () => void // finger moved left-to-right
}

export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeOptions) {
  // Where the touch started. A ref (not state) because changing it shouldn't
  // re-render anything; we only need to remember it until the finger lifts.
  const start = useRef<{ x: number; y: number } | null>(null)

  function onTouchStart(event: TouchEvent) {
    const target = event.target as HTMLElement
    // Dragging inside a text box should move the cursor, not change pages.
    if (event.touches.length !== 1 || target.closest('input, textarea')) {
      start.current = null
      return
    }
    start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  function onTouchEnd(event: TouchEvent) {
    if (start.current === null) {
      return
    }
    const dx = event.changedTouches[0].clientX - start.current.x
    const dy = event.changedTouches[0].clientY - start.current.y
    start.current = null

    // Mostly sideways and far enough, so vertical scrolling never counts.
    if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 2) {
      return
    }
    if (dx < 0) {
      onSwipeLeft()
    } else {
      onSwipeRight()
    }
  }

  return { onTouchStart, onTouchEnd }
}
