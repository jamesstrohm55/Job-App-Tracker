import api from "@/api/client"

export interface AnalyticsSummary {
  total_applications: number
  active_applications: number
  response_rate: number
  offer_count: number
  rejection_count: number
  avg_days_to_response: number | null
}

export interface StageFunnelEntry {
  stage: string
  count: number
  percentage: number
}

export interface TimelineBucket {
  period: string
  count: number
}

export interface ResponseRateBucket {
  period: string
  total: number
  responded: number
  rate: number
}

export interface StageDistributionEntry {
  stage: string
  count: number
  percentage: number
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { data } = await api.get<AnalyticsSummary>("/analytics/summary")
  return data
}

export async function getStageFunnel(): Promise<StageFunnelEntry[]> {
  const { data } = await api.get<{ entries: StageFunnelEntry[] }>("/analytics/funnel")
  return data.entries
}

export async function getApplicationTimeline(): Promise<{
  buckets: TimelineBucket[]
  granularity: string
}> {
  const { data } = await api.get("/analytics/timeline")
  return data
}

export async function getResponseRates(): Promise<ResponseRateBucket[]> {
  const { data } = await api.get<{ buckets: ResponseRateBucket[] }>("/analytics/response-rates")
  return data.buckets
}

export async function getStageDistribution(): Promise<StageDistributionEntry[]> {
  const { data } = await api.get<{ entries: StageDistributionEntry[] }>(
    "/analytics/stage-distribution"
  )
  return data.entries
}
