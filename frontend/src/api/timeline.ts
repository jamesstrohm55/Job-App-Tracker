import api from "@/api/client"
import type { TimelineEvent } from "@/types"

export interface TimelineEventCreate {
  event_type: string
  title: string
  description?: string | null
  event_date: string
}

export type TimelineEventUpdate = Partial<TimelineEventCreate>

export async function getTimelineEvents(appId: string): Promise<TimelineEvent[]> {
  const { data } = await api.get<TimelineEvent[]>(`/applications/${appId}/timeline`)
  return data
}

export async function createTimelineEvent(
  appId: string,
  data: TimelineEventCreate
): Promise<TimelineEvent> {
  const { data: event } = await api.post<TimelineEvent>(
    `/applications/${appId}/timeline`,
    data
  )
  return event
}

export async function updateTimelineEvent(
  eventId: string,
  data: TimelineEventUpdate
): Promise<TimelineEvent> {
  const { data: event } = await api.put<TimelineEvent>(`/timeline/${eventId}`, data)
  return event
}

export async function deleteTimelineEvent(eventId: string): Promise<void> {
  await api.delete(`/timeline/${eventId}`)
}
