import { StatsCards } from "@/components/analytics/stats-cards"
import { FunnelChart } from "@/components/analytics/funnel-chart"
import { TimelineChart } from "@/components/analytics/timeline-chart"
import { ResponseRateChart } from "@/components/analytics/response-rate-chart"
import { StageDonut } from "@/components/analytics/stage-donut"
import {
  useAnalyticsSummary,
  useStageFunnel,
  useApplicationTimeline,
  useResponseRates,
  useStageDistribution,
} from "@/hooks/use-analytics"

export function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary()
  const { data: funnel } = useStageFunnel()
  const { data: timeline } = useApplicationTimeline()
  const { data: responseRates } = useResponseRates()
  const { data: distribution } = useStageDistribution()

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {summary && <StatsCards data={summary} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {funnel && <FunnelChart data={funnel} />}
        {distribution && <StageDonut data={distribution} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {timeline && <TimelineChart data={timeline.buckets} />}
        {responseRates && <ResponseRateChart data={responseRates} />}
      </div>
    </div>
  )
}
