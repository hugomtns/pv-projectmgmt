import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { YearlyData } from '@/lib/types/financial';

interface CumulativeFCFChartProps {
  yearlyData: YearlyData;
  equityPaybackYears: number | null;
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

export function CumulativeFCFChart({ yearlyData, equityPaybackYears }: CumulativeFCFChartProps) {
  const data = yearlyData.years.map((year, index) => ({
    year: `Y${year}`,
    yearNum: year,
    fcf: yearlyData.fcf_to_equity[index],
    cumulative: yearlyData.cumulative_fcf_to_equity[index],
  }));

  // Find the break-even point for visual indicator
  const breakEvenYear = equityPaybackYears ? Math.ceil(equityPaybackYears) : null;

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
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
              name === 'fcf' ? 'Annual FCF' : 'Cumulative FCF',
            ]}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend
            formatter={(value: string) =>
              value === 'fcf' ? 'Annual FCF to Equity' : 'Cumulative FCF'
            }
          />
          {/* Zero line */}
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          {/* Break-even indicator */}
          {breakEvenYear && (
            <ReferenceLine
              x={`Y${breakEvenYear}`}
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: 'Payback',
                position: 'insideTopRight',
                fill: '#22c55e',
                fontSize: 11,
                fontWeight: 500,
              }}
            />
          )}
          <Bar
            dataKey="fcf"
            fill="#3b82f6"
            opacity={0.7}
            radius={[2, 2, 0, 0]}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#8b5cf6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCumulative)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
