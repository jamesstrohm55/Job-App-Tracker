import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createTimelineEvent,
  deleteTimelineEvent,
  getTimelineEvents,
  updateTimelineEvent,
  type TimelineEventCreate,
  type TimelineEventUpdate,
} from "@/api/timeline"

export function useTimelineEvents(appId: string) {
  return useQuery({
    queryKey: ["timeline", appId],
    queryFn: () => getTimelineEvents(appId),
    enabled: !!appId,
  })
}

export function useCreateTimelineEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ appId, data }: { appId: string; data: TimelineEventCreate }) =>
      createTimelineEvent(appId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] })
    },
  })
}

export function useUpdateTimelineEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: TimelineEventUpdate }) =>
      updateTimelineEvent(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] })
    },
  })
}

export function useDeleteTimelineEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => deleteTimelineEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] })
    },
  })
}
