// TanStack Query hooks: one function per piece of server data.
//
// useQuery   fetches and caches data. Components that ask for the same
//            queryKey share one cached copy and one network request.
// useMutation runs a change (POST/PATCH/DELETE). On success we "invalidate"
//            the affected queries, which marks them stale so they refetch.
//
// Metadata rarely changes, so those queries use staleTime: Infinity: once
// loaded they're never refetched automatically, only when we invalidate them.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from './client'
import type { Lift, LiftListItem, MuscleGroup } from './types'

// Query keys identify cached data. Keeping them in one place avoids typos.
// Invalidating ['lifts'] also invalidates every ['lifts', ...] key under it.
export const queryKeys = {
  muscleGroups: ['muscle-groups'] as const,
  lifts: ['lifts'] as const,
  liftsForMuscleGroup: (muscleGroupId: number) => ['lifts', { muscleGroupId }] as const,
}

export function useMuscleGroups() {
  return useQuery({
    queryKey: queryKeys.muscleGroups,
    queryFn: () => apiGet<MuscleGroup[]>('/muscle-groups'),
    staleTime: Infinity,
  })
}

export function useLifts(muscleGroupId: number) {
  return useQuery({
    queryKey: queryKeys.liftsForMuscleGroup(muscleGroupId),
    queryFn: () => apiGet<LiftListItem[]>(`/lifts?muscle_group_id=${muscleGroupId}`),
    staleTime: Infinity,
  })
}

export function useCreateMuscleGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiPost<MuscleGroup>('/muscle-groups', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.muscleGroups }),
  })
}

export function useCreateLift(muscleGroupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      apiPost<Lift>('/lifts', { name, muscle_group_id: muscleGroupId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.lifts }),
  })
}
