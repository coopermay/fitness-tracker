import type { BodyRegion } from '../bodyRegions'
import styles from './BodyFigure.module.css'

interface BodyFigureProps {
  region: BodyRegion | null // the part to highlight; null highlights nothing
}

// A simple body made of separate shapes, so any one part can be highlighted.
// Back, triceps and glutes are on the rear of the body, so those show the
// figure from behind (the torso shapes change; the outline stays the same).
//
// SVG inside JSX works like HTML: shapes are elements, and attributes use
// React's spelling (className instead of class). Coordinates are in a
// box from x=15–85, y=2–154 (the viewBox) that scales to whatever size the CSS gives it.
export function BodyFigure({ region }: BodyFigureProps) {
  const rearView = region === 'back' || region === 'triceps' || region === 'glutes'

  // The CSS class for a shape: highlighted if it belongs to the region.
  function part(...regions: BodyRegion[]) {
    return region !== null && regions.includes(region) ? styles.active : styles.part
  }

  return (
    <svg className={styles.figure} viewBox="15 2 70 152" aria-hidden="true">
      {/* Head and neck */}
      <circle cx="50" cy="13" r="9" className={styles.part} />
      <rect x="46" y="21" width="8" height="7" className={styles.part} />

      {/* Shoulders */}
      <ellipse cx="30" cy="35" rx="7.5" ry="6.5" className={part('shoulders')} />
      <ellipse cx="70" cy="35" rx="7.5" ry="6.5" className={part('shoulders')} />

      {rearView ? (
        <>
          {/* Upper back: traps and lats as one V shape */}
          <path d="M38 29 H62 L60.5 49 L54 62 H46 L39.5 49 Z" className={part('back')} />
          {/* Lower back */}
          <rect x="42" y="63.5" width="16" height="8.5" rx="3" className={styles.part} />
        </>
      ) : (
        <>
          {/* Chest */}
          <rect x="37.5" y="29" width="12" height="15" rx="4" className={part('chest')} />
          <rect x="50.5" y="29" width="12" height="15" rx="4" className={part('chest')} />
          {/* Abs: two columns of three */}
          {[46, 55, 64].map((y) =>
            [41, 50.5].map((x) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="8.5" height="7.5" rx="2" className={part('abs')} />
            )),
          )}
        </>
      )}

      {/* Hips (glutes when seen from behind) */}
      <rect x="38" y="74" width="24" height="10" rx="3.5" className={part('glutes')} />

      {/* Upper arms: biceps from the front, triceps from behind */}
      <rect x="21.5" y="42" width="9" height="20" rx="4.5" className={part('biceps', 'triceps')} />
      <rect x="69.5" y="42" width="9" height="20" rx="4.5" className={part('biceps', 'triceps')} />

      {/* Forearms and hands */}
      <rect x="20" y="64" width="8.5" height="19" rx="4.25" className={part('forearms')} />
      <rect x="71.5" y="64" width="8.5" height="19" rx="4.25" className={part('forearms')} />
      <circle cx="24.25" cy="87" r="3.5" className={styles.part} />
      <circle cx="75.75" cy="87" r="3.5" className={styles.part} />

      {/* Thighs, calves, feet */}
      <rect x="38.5" y="86" width="11" height="32" rx="5" className={part('legs')} />
      <rect x="50.5" y="86" width="11" height="32" rx="5" className={part('legs')} />
      <rect x="39.5" y="120" width="9" height="27" rx="4.5" className={part('legs', 'calves')} />
      <rect x="51.5" y="120" width="9" height="27" rx="4.5" className={part('legs', 'calves')} />
      <ellipse cx="44" cy="150.5" rx="5" ry="2.5" className={styles.part} />
      <ellipse cx="56" cy="150.5" rx="5" ry="2.5" className={styles.part} />
    </svg>
  )
}
