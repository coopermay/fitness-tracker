// The swipeable tab pages, in tab-bar order (placeholder slots are skipped).

export const TAB_PATHS = ['/', '/calendar', '/settings']

// Position of `pathname` among the tabs, or null if it isn't a tab page
// (e.g. /lifts/3, which belongs to Home but doesn't swipe).
export function tabIndex(pathname: string): number | null {
  const index = TAB_PATHS.indexOf(pathname)
  return index === -1 ? null : index
}

// Passed as router state when moving between tabs, so the new page can slide
// in from the correct side.
export interface SlideState {
  slideFrom: 'left' | 'right'
}

// Router state for going from tab `fromIndex` to tab `toIndex`, or undefined
// when there's no tab to slide from.
export function slideStateFor(fromIndex: number | null, toIndex: number): SlideState | undefined {
  if (fromIndex === null || fromIndex === toIndex) {
    return undefined
  }
  return { slideFrom: toIndex > fromIndex ? 'right' : 'left' }
}
