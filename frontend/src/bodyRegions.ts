// Which part of the body figure to highlight for a muscle group.
// Muscle groups are user-named, so this matches on keywords in the name.

export type BodyRegion =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'glutes'
  | 'calves'
  | 'legs'

// Checked in order; the first region with a matching keyword wins.
const KEYWORDS: [BodyRegion, string[]][] = [
  ['chest', ['chest', 'pec']],
  ['back', ['back', 'lat', 'trap']],
  ['shoulders', ['shoulder', 'delt']],
  ['biceps', ['bicep']],
  ['triceps', ['tricep']],
  ['forearms', ['forearm', 'grip', 'wrist']],
  ['abs', ['abs', 'abdom', 'core', 'oblique']],
  ['glutes', ['glute', 'butt', 'hip']],
  ['calves', ['calf', 'calves']],
  ['legs', ['leg', 'quad', 'hamstring', 'thigh']],
]

// "Chest" -> 'chest', "Lats" -> 'back', "Cardio" -> null (no highlight)
export function regionForMuscleGroup(name: string): BodyRegion | null {
  const lower = name.toLowerCase()
  const match = KEYWORDS.find(([, words]) => words.some((word) => lower.includes(word)))
  return match ? match[0] : null
}
