import { Briefcase, CheckCircle, TrendingUp, XCircle, Clock } from "lucide-react"
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
      color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950",
    },
    {
      label: "Active",
      value: data.active_applications,
      icon: TrendingUp,
      color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950",
    },
    {
      label: "Response Rate",
      value: `${data.response_rate}%`,
      icon: CheckCircle,
      color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-950",
    },
    {
      label: "Offers",
      value: data.offer_count,
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950",
    },
    {
      label: "Rejections",
      value: data.rejection_count,
      icon: XCircle,
      color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950",
    },
    {
      label: "Avg Days to Response",
      value: data.avg_days_to_response != null ? `${data.avg_days_to_response}d` : "—",
      icon: Clock,
      color: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-950",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2">
            <div className={`rounded-md p-1.5 ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  )
}
