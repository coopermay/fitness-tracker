// TanStack Query hooks: one function per piece of server data.
//
// useQuery   fetches and caches data. Components that ask for the same
//            queryKey share one cached copy and one network request.
// useMutation runs a change (POST/PATCH/DELETE). On success we "invalidate"
//            the affected queries, which marks them stale so they refetch.
//
// Metadata rarely changes, so those queries use staleTime: Infinity: once
// loaded they're never refetched automatically, only when we invalidate them.

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type {
  Gym,
  Lift,
  LiftListItem,
  LiftRecords,
  Machine,
  MuscleGroup,
  SetCreate,
  SetCreated,
  SetFields,
  Settings,
  WorkoutSet,
} from './types'

// Query keys identify cached data. Keeping them in one place avoids typos.
// Invalidating ['lifts'] also invalidates every ['lifts', ...] key under it.
export const queryKeys = {
  muscleGroups: ['muscle-groups'] as const,
  lifts: ['lifts'] as const,
  liftsForMuscleGroup: (muscleGroupId: number) => ['lifts', { muscleGroupId }] as const,
  liftRecords: (liftId: number) => ['lift-records', liftId] as const,
  machines: ['machines'] as const,
  gyms: ['gyms'] as const,
  settings: ['settings'] as const,
}

// --- Queries -----------------------------------------------------------------

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

// Records change whenever a set is logged, so they use the default staleTime
// (refetch when the page is opened again) rather than Infinity.
export function useLiftRecords(liftId: number) {
  return useQuery({
    queryKey: queryKeys.liftRecords(liftId),
    queryFn: () => apiGet<LiftRecords>(`/lifts/${liftId}/records`),
  })
}

export function useMachines() {
  return useQuery({
    queryKey: queryKeys.machines,
    queryFn: () => apiGet<Machine[]>('/machines'),
    staleTime: Infinity,
  })
}

export function useGyms() {
  return useQuery({
    queryKey: queryKeys.gyms,
    queryFn: () => apiGet<Gym[]>('/gyms'),
    staleTime: Infinity,
  })
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => apiGet<Settings>('/settings'),
    staleTime: Infinity,
  })
}

// --- Metadata mutations -----------------------------------------------------

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

export function useCreateMachine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, gymId }: { name: string; gymId: number }) =>
      apiPost<Machine>('/machines', { name, gym_id: gymId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.machines }),
  })
}

// --- Set mutations ------------------------------------------------------------
// Any set change can alter this lift's records and its "last performed" date
// on the muscle group page. Returning the Promise from onSuccess makes
// mutateAsync() wait for the refetch, so the lift page is fresh when we go back.

function refreshAfterSetChange(queryClient: QueryClient, liftId: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.liftRecords(liftId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.lifts }),
  ])
}

export function useCreateSet(liftId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SetCreate) => apiPost<SetCreated>('/sets', body),
    onSuccess: () => refreshAfterSetChange(queryClient, liftId),
  })
}

export function useUpdateSet(liftId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ setId, fields }: { setId: number; fields: SetFields }) =>
      apiPatch<WorkoutSet>(`/sets/${setId}`, fields),
    onSuccess: () => refreshAfterSetChange(queryClient, liftId),
  })
}

export function useDeleteSet(liftId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (setId: number) => apiDelete(`/sets/${setId}`),
    onSuccess: () => refreshAfterSetChange(queryClient, liftId),
  })
}
