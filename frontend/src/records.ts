// Helpers for reading the records response.

import type { LiftRecords, WeightUnit } from './api/types'

// The unit last used for this lift on this machine (null = no machine), if any.
// The API lists each machine's units most recently used first.
export function lastUnitFor(records: LiftRecords, machineId: number | null): WeightUnit | undefined {
  const group = records.machine_groups.find((g) => (g.machine?.id ?? null) === machineId)
  return group?.units[0]?.weight_unit
}
