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
