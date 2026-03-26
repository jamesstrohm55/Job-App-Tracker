import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { format, parseISO } from "date-fns"
import type { ResponseRateBucket } from "@/api/analytics"

interface ResponseRateChartProps {
  data: ResponseRateBucket[]
}

export function ResponseRateChart({ data }: ResponseRateChartProps) {
  const chartData = data.map((b) => ({
    ...b,
    label: format(parseISO(b.period), "MMM d"),
  }))

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 font-semibold">Response Rate Over Time</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis unit="%" domain={[0, 100]} />
            <Tooltip
              formatter={(value) => [`${value}%`, "Response Rate"]}
            />
            <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} name="Rate" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
