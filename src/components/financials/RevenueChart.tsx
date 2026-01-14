import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { YearlyData } from '@/lib/types/financial';

interface RevenueChartProps {
  yearlyData: YearlyData;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`;
  }
  return value.toFixed(0);
}

export function RevenueChart({ yearlyData }: RevenueChartProps) {
  const data = yearlyData.years.map((year, index) => ({
    year: `Y${year}`,
    revenue: yearlyData.revenue[index],
    omCosts: yearlyData.om_costs[index],
    ebitda: yearlyData.ebitda[index],
  }));

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorOM" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorEBITDA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            formatter={(value, name) => [
              formatCurrency(Number(value) || 0),
              name === 'revenue' ? 'Revenue' : name === 'omCosts' ? 'O&M Costs' : 'EBITDA',
            ]}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend
            formatter={(value: string) =>
              value === 'revenue' ? 'Revenue' : value === 'omCosts' ? 'O&M Costs' : 'EBITDA'
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#22c55e"
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
          <Area
            type="monotone"
            dataKey="omCosts"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#colorOM)"
          />
          <Area
            type="monotone"
            dataKey="ebitda"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorEBITDA)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
