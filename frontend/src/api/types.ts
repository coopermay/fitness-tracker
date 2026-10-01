// TypeScript descriptions of the JSON the API sends and receives.
// They mirror backend/app/schemas.py. TypeScript only checks these while you
// write code; nothing checks them at runtime, so keep them in sync by hand.

// A union of string literals: weight_unit can only be one of these three strings.
export type WeightUnit = 'lbs' | 'kg' | 'plates'

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
}

// `extends` adds fields to an existing interface (like subclassing).
export interface LiftListItem extends Lift {
  last_performed_on: DateString | null
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

export interface UnitRecords {
  weight_unit: WeightUnit
  records: RecordRow[] // heaviest first
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
