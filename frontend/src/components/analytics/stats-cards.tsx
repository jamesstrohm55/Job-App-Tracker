import { Briefcase, CheckCircle, Clock, TrendingUp, XCircle } from "lucide-react"
import type { AnalyticsSummary } from "@/api/analytics"

interface StatsCardsProps {
  data: AnalyticsSummary
}

export function StatsCards({ data }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Applications",
      value: data.total_applications,
      icon: Briefcase,
      color: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950/80",
    },
    {
      label: "Active",
      value: data.active_applications,
      icon: TrendingUp,
      color: "text-cyan-700 bg-cyan-100 dark:text-cyan-300 dark:bg-cyan-950/80",
    },
    {
      label: "Response Rate",
      value: `${data.response_rate}%`,
      icon: CheckCircle,
      color: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/80",
    },
    {
      label: "Offers",
      value: data.offer_count,
      icon: CheckCircle,
      color: "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-950/80",
    },
    {
      label: "Rejections",
      value: data.rejection_count,
      icon: XCircle,
      color: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950/80",
    },
    {
      label: "Avg Days to Response",
      value: data.avg_days_to_response != null ? `${data.avg_days_to_response}d` : "--",
      icon: Clock,
      color: "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800/90",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="surface-panel rounded-3xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Metric
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
            </div>
            <div className={`rounded-2xl p-2.5 ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  )
}
