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
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client'
import type {
  BodyStats,
  CalendarDay,
  Gym,
  Insights,
  Lift,
  LiftListItem,
  LiftRecords,
  Machine,
  LiftUpdate,
  MetadataUpdate,
  MuscleGroup,
  SetCreate,
  SetCreated,
  SetFields,
  Settings,
  Split,
  WorkoutSet,
  TodayResponse,
  StandardGuide,
} from './types'

// Query keys identify cached data. Keeping them in one place avoids typos.
// Invalidating ['lifts'] also invalidates every ['lifts', ...] key under it.
export const queryKeys = {
  muscleGroups: ['muscle-groups'] as const,
  lifts: ['lifts'] as const,
  liftsForMuscleGroup: (muscleGroupId: number) => ['lifts', { muscleGroupId }] as const,
  allLiftRecords: ['lift-records'] as const,
  liftRecords: (liftId: number) => ['lift-records', liftId] as const,
  machines: ['machines'] as const,
  gyms: ['gyms'] as const,
  settings: ['settings'] as const,
  calendar: ['calendar'] as const,
  split: ['split'] as const,
  insights: ['insights'] as const,
  today: ['today'] as const,
  body: ['body'] as const,
  standards: ['standards'] as const,
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

// Changes whenever a set is logged, so it uses the default staleTime.
export function useCalendar() {
  return useQuery({
    queryKey: queryKeys.calendar,
    queryFn: () => apiGet<CalendarDay[]>('/calendar'),
  })
}

// The weekly split rarely changes, so it's treated like metadata.
export function useSplit() {
  return useQuery({
    queryKey: queryKeys.split,
    queryFn: () => apiGet<Split>('/split'),
    staleTime: Infinity,
  })
}

// Plateau flags. `today` comes from the phone, not the server's
// clock, which may be in another timezone.
export function useInsights(today: string) {
  return useQuery({
    queryKey: [...queryKeys.insights, today],
    queryFn: () => apiGet<Insights>(`/insights?today=${today}`),
  })
}

// Everything on the Today page. Like insights, `today` is the phone's date.
export function useToday(today: string) {
  return useQuery({
    queryKey: [...queryKeys.today, today],
    queryFn: () => apiGet<TodayResponse>(`/today?today=${today}`),
  })
}

// Calculations from body stats (Settings -> Body stats). `today` is for the age.
export function useBody(today: string) {
  return useQuery({
    queryKey: [...queryKeys.body, today],
    queryFn: () => apiGet<BodyStats>(`/body?today=${today}`),
  })
}

// The strength standards behind the grades. They never change while the app
// runs, so they're fetched once.
export function useStrengthStandards() {
  return useQuery({
    queryKey: queryKeys.standards,
    queryFn: () => apiGet<StandardGuide[]>('/body/standards'),
    staleTime: Infinity,
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.today }) // may be in today's groups
      return queryClient.invalidateQueries({ queryKey: queryKeys.lifts })
    },
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

// Rename and/or archive. These don't wait for the refetch (onSuccess returns
// nothing), so a page can navigate away straight after archiving instead of
// briefly showing "Not found" for the item that just disappeared from the list.

export function useUpdateMuscleGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: MetadataUpdate }) =>
      apiPatch<MuscleGroup>(`/muscle-groups/${id}`, changes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.muscleGroups })
      void queryClient.invalidateQueries({ queryKey: queryKeys.today })
    },
  })
}

export function useUpdateLift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: LiftUpdate }) =>
      apiPatch<Lift>(`/lifts/${id}`, changes),
    onSuccess: (lift) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.lifts })
      void queryClient.invalidateQueries({ queryKey: queryKeys.liftRecords(lift.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.calendar })
      void queryClient.invalidateQueries({ queryKey: queryKeys.today })
      void queryClient.invalidateQueries({ queryKey: queryKeys.body })
    },
  })
}

export function useUpdateMachine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: MetadataUpdate }) =>
      apiPatch<Machine>(`/machines/${id}`, changes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.machines })
      // A machine's name appears in the records of every lift that used it.
      void queryClient.invalidateQueries({ queryKey: queryKeys.allLiftRecords })
      void queryClient.invalidateQueries({ queryKey: queryKeys.calendar })
      void queryClient.invalidateQueries({ queryKey: queryKeys.today })
      void queryClient.invalidateQueries({ queryKey: queryKeys.body })
    },
  })
}

// Send only what changed, e.g. { theme_accent: 'teal' }.
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changes: Partial<Settings>) => apiPatch<Settings>('/settings', changes),
    // Optimistic update: change the cache right away, before the server
    // answers, so a new theme or unit shows instantly. onMutate's return value
    // is handed to onError as `context`, to undo the change if the save fails.
    onMutate: (changes) => {
      const previous = queryClient.getQueryData<Settings>(queryKeys.settings)
      if (previous) {
        queryClient.setQueryData(queryKeys.settings, { ...previous, ...changes })
      }
      return { previous }
    },
    onError: (_error, _changes, context) => {
      queryClient.setQueryData(queryKeys.settings, context?.previous)
    },
    // The response is the saved settings, so put it straight into the cache
    // instead of refetching. Today's targets depend on the rep range.
    onSuccess: (settings, changes) => {
      queryClient.setQueryData(queryKeys.settings, settings)
      if ('rep_range_min' in changes || 'rep_range_max' in changes) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.today })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.body }) // cheap; only fetched on its page
    },
  })
}

export function useUpdateSplit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (split: Split) => apiPut<Split>('/split', split),
    onSuccess: (split) => {
      queryClient.setQueryData(queryKeys.split, split)
      void queryClient.invalidateQueries({ queryKey: queryKeys.today }) // which groups are today's
    },
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
    queryClient.invalidateQueries({ queryKey: queryKeys.calendar }),
    queryClient.invalidateQueries({ queryKey: queryKeys.insights }),
    queryClient.invalidateQueries({ queryKey: queryKeys.today }),
    queryClient.invalidateQueries({ queryKey: queryKeys.body }), // relative strength
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
