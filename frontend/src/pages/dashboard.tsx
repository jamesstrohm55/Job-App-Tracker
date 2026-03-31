import { FunnelChart } from "@/components/analytics/funnel-chart"
import { ResponseRateChart } from "@/components/analytics/response-rate-chart"
import { StageDonut } from "@/components/analytics/stage-donut"
import { StatsCards } from "@/components/analytics/stats-cards"
import { TimelineChart } from "@/components/analytics/timeline-chart"
import {
  useAnalyticsSummary,
  useApplicationTimeline,
  useResponseRates,
  useStageDistribution,
  useStageFunnel,
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
      <section className="surface-panel overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
              Analytics Overview
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              See where your search is moving and where it is stalling.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Track application volume, response momentum, and funnel drop-off from a single operating view.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:w-fit">
            <div className="rounded-2xl border border-border/80 bg-background-elevated/80 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Focus</p>
              <p className="mt-2 font-semibold">Response velocity</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background-elevated/80 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Lens</p>
              <p className="mt-2 font-semibold">Stage conversion</p>
            </div>
          </div>
        </div>
      </section>

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
