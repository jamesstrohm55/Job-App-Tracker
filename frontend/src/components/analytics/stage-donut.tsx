import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import type { StageDistributionEntry } from "@/api/analytics"
import { STAGE_LABELS } from "@/lib/constants"

const COLORS = [
  "#94a3b8", // saved - slate
  "#3b82f6", // applied - blue
  "#8b5cf6", // screening - purple
  "#f59e0b", // interview - amber
  "#10b981", // offer - green
  "#ef4444", // rejected - red
  "#6b7280", // withdrawn - gray
]

interface StageDonutProps {
  data: StageDistributionEntry[]
}

export function StageDonut({ data }: StageDonutProps) {
  const chartData = data.map((entry) => ({
    name: STAGE_LABELS[entry.stage as keyof typeof STAGE_LABELS] || entry.stage,
    value: entry.count,
    percentage: entry.percentage,
  }))

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 font-semibold">Stage Distribution</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_entry, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => [
                `${value} (${(props.payload as Record<string, unknown>).percentage}%)`,
                name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
