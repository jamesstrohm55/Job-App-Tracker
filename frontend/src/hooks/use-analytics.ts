import { useQuery } from "@tanstack/react-query"
import {
  getAnalyticsSummary,
  getApplicationTimeline,
  getResponseRates,
  getStageDistribution,
  getStageFunnel,
} from "@/api/analytics"

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics-summary"],
    queryFn: getAnalyticsSummary,
  })
}

export function useStageFunnel() {
  return useQuery({
    queryKey: ["analytics-funnel"],
    queryFn: getStageFunnel,
  })
}

export function useApplicationTimeline() {
  return useQuery({
    queryKey: ["analytics-timeline"],
    queryFn: getApplicationTimeline,
  })
}

export function useResponseRates() {
  return useQuery({
    queryKey: ["analytics-response-rates"],
    queryFn: getResponseRates,
  })
}

export function useStageDistribution() {
  return useQuery({
    queryKey: ["analytics-stage-distribution"],
    queryFn: getStageDistribution,
  })
}
