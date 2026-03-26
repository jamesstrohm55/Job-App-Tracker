import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { StageFunnelEntry } from "@/api/analytics"
import { STAGE_LABELS } from "@/lib/constants"

const FUNNEL_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"]

interface FunnelChartProps {
  data: StageFunnelEntry[]
}

export function FunnelChart({ data }: FunnelChartProps) {
  const chartData = data.map((entry, i) => ({
    ...entry,
    label: STAGE_LABELS[entry.stage as keyof typeof STAGE_LABELS] || entry.stage,
    fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
  }))

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 font-semibold">Application Funnel</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, _name, props) => [
                `${value} (${(props.payload as Record<string, unknown>).percentage}%)`,
                "Applications",
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.stage} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
