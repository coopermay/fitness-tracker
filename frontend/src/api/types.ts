// TypeScript descriptions of the JSON the API sends and receives.
// They mirror backend/app/schemas.py. TypeScript only checks these while you
// write code; nothing checks them at runtime, so keep them in sync by hand.

// A union of string literals: weight_unit can only be one of these three strings.
export type WeightUnit = 'lbs' | 'kg' | 'plates'

// 'system' follows the phone's light/dark setting.
export type ThemeBase = 'system' | 'light' | 'dark' | 'black' | 'navy'
export type ThemeAccent = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'teal' | 'gold'

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
// How height and bodyweight are shown; they're always stored in cm and kg.
export type BodyUnits = 'imperial' | 'metric'

// Dates arrive as strings: "2026-09-25" for dates, ISO timestamps for created_at.
export type DateString = string

export interface MuscleGroup {
  id: number
  name: string
  archived: boolean
  created_at: DateString
}

export interface Lift {
  id: number
  name: string
  archived: boolean
  created_at: DateString
  muscle_group_id: number
  // The machine that counts for relative strength on Insights; null = automatic.
  strength_machine_id: number | null
}

// `extends` adds fields to an existing interface (like subclassing).
export interface LiftListItem extends Lift {
  last_performed_on: DateString | null
}

// PATCH body for muscle groups, lifts and machines. Omitted fields are unchanged.
export interface MetadataUpdate {
  name?: string
  archived?: boolean
}

// PATCH /lifts/{id} also takes the relative-strength machine (null = automatic).
export interface LiftUpdate extends MetadataUpdate {
  strength_machine_id?: number | null
}

export interface Machine {
  id: number
  name: string
  archived: boolean
  created_at: DateString
  gym_id: number
}

// One logged set ("set" in the API; WorkoutSet in the backend).
export interface WorkoutSet {
  id: number
  lift_id: number
  machine_id: number | null
  weight_value: number
  weight_unit: WeightUnit
  reps: number
  approximate: boolean
  performed_on: DateString | null
  notes: string | null
  created_at: DateString
  updated_at: DateString
}

export interface SetCreated extends WorkoutSet {
  is_new_record: boolean
}

// The editable fields of a set: the PATCH /sets/{id} body.
export interface SetFields {
  machine_id: number | null
  weight_value: number
  weight_unit: WeightUnit
  reps: number
  approximate: boolean
  performed_on: DateString | null
  notes: string | null
}

// POST /sets body: the editable fields plus which lift.
export interface SetCreate extends SetFields {
  lift_id: number
}

export interface Gym {
  id: number
  name: string
  archived: boolean
  created_at: DateString
}

export interface Settings {
  default_unit: WeightUnit
  theme_base: ThemeBase
  theme_accent: ThemeAccent
  // Target rep range on the Today page; move up a weight past the top.
  rep_range_min: number
  rep_range_max: number
  // Body stats; null until entered.
  sex: Sex | null
  birth_date: DateString | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: ActivityLevel
  body_units: BodyUnits
}

// --- GET /lifts/{id}/records ---

export interface RecordRow {
  set_id: number
  weight_value: number
  weight_unit: WeightUnit
  reps: number
  approximate: boolean
  performed_on: DateString | null
  notes: string | null
  estimated_1rm: number | null // null for plates
}

// One point on a progress chart: the day's best set.
export interface ProgressPoint {
  date: DateString
  value: number // est. 1RM; for plates, the heaviest weight
  weight_value: number
  reps: number
  approximate: boolean
}

export interface UnitRecords {
  weight_unit: WeightUnit
  records: RecordRow[] // heaviest first
  progress: ProgressPoint[] // one per dated session, oldest first
}

export interface MachineRecords {
  machine: Machine | null // null = sets with no machine recorded
  last_performed_on: DateString | null
  units: UnitRecords[] // most recently used first
  history: WorkoutSet[] // newest first, undated last
}

export interface LiftRecords {
  lift: Lift
  machine_groups: MachineRecords[] // most recently used first
}

// --- GET /calendar ---

export interface CalendarSet {
  id: number
  machine_name: string | null
  weight_value: number
  weight_unit: WeightUnit
  reps: number
  approximate: boolean
  is_pr: boolean
}

export interface CalendarLift {
  lift_id: number
  lift_name: string
  sets: CalendarSet[]
}

// Only days with at least one dated set are returned, newest first.
export interface CalendarDay {
  date: DateString
  set_count: number
  pr_count: number
  lifts: CalendarLift[]
}

// --- GET/PUT /split ---

export interface SplitDay {
  weekday: number // 0 = Monday ... 6 = Sunday
  muscle_group_ids: number[] // empty = rest day
}

// GET always returns all 7 days, Monday first.
export interface Split {
  days: SplitDay[]
}

// --- GET /insights ---

export interface Insights {
  plateaued_lift_ids: number[] // trained in the last 3 weeks, no PR in that time
}

// --- GET /today ---

export interface TodaySet {
  id: number
  weight_value: number
  weight_unit: WeightUnit
  reps: number
  approximate: boolean
  is_pr: boolean
}

export interface Target {
  weight_value: number
  weight_unit: WeightUnit
  reps: number
  move_up: boolean // true when it's a new, heavier weight
}

export interface TodayLift {
  id: number
  name: string
  plateaued: boolean
  machine_id: number | null // the machine used most recently, counting today
  machine_name: string | null
  best: TodaySet | null // best est. 1RM among 5+ rep sets before today, on that machine
  best_date: DateString | null
  target: Target | null // the goal, worked out from `best`
  sets_today: TodaySet[]
}

export interface TodayGroup {
  id: number
  name: string
  lifts: TodayLift[] // your usual lifts, plus any others done today
  other_lifts: TodayLift[] // the rest, for "Show all"
}

export interface TodayResponse {
  date: DateString
  groups: TodayGroup[] // empty on a rest day
  next_training: { date: DateString; muscle_groups: string[] } | null
  lifts_done: number
  set_count: number
  pr_count: number
  rep_range_min: number
  rep_range_max: number
}

// --- GET /body ---

export interface RelativeStrength {
  lift_id: number
  lift_name: string
  machine_id: number | null
  machine_name: string | null
  automatic: boolean // machine picked automatically (most-used), not on the lift page
  weight_value: number // the best set on that machine
  reps: number
  one_rep_max: number // that set's est. 1RM, in its own unit
  weight_unit: WeightUnit
  ratio: number // one_rep_max / bodyweight
  level: StrengthLevel | null // for lifts with a standard (needs sex)
  score: number | null // 0-100 on the Beginner -> Elite scale
}

export type StrengthLevel = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Elite'

export interface BodyStats {
  age: number | null
  calories: { bmr: number; maintenance: number; cut: number; lean_bulk: number } | null
  protein: { min_g: number; max_g: number } | null
  water: { daily_ml: number; training_day_ml: number } | null
  strength_score: { score: number; level: StrengthLevel; graded_lifts: number } | null
  relative_strength: RelativeStrength[] // strongest first
  missing: ('sex' | 'birth_date' | 'height_cm' | 'weight_kg')[]
}

// --- GET /body/standards ---

// One graded lift, for the "Which lifts get a grade?" guide.
export interface StandardGuide {
  key: string
  equipment: 'Barbell' | 'Dumbbell' // the machine name must contain this
  label: string
  name_words: string[] // the lift name must contain one of these...
  excluded_words: string[] // ...and none of these
  levels: StrengthLevel[] // Novice ... Elite, matching the thresholds below
  male: number[] // 1RM / bodyweight needed for each level
  female: number[]
}
