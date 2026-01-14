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
import type { YearlyData, MonthlyDataPoint } from '@/lib/types/financial';

interface CumulativeFCFChartProps {
  yearlyData: YearlyData;
  equityPaybackYears: number | null;
  viewMode?: 'yearly' | 'monthly';
  monthlyData?: MonthlyDataPoint[];
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

export function CumulativeFCFChart({
  yearlyData,
  equityPaybackYears,
  viewMode = 'yearly',
  monthlyData,
}: CumulativeFCFChartProps) {
  const isMonthly = viewMode === 'monthly';

  // Prepare data based on view mode
  const data = !isMonthly
    ? yearlyData.years.map((year, index) => ({
        label: `Y${year}`,
        yearNum: year,
        fcf: yearlyData.fcf_to_equity[index],
        cumulative: yearlyData.cumulative_fcf_to_equity[index],
      }))
    : (monthlyData || []).map((point) => ({
        label: `${point.year}-${String(point.month).padStart(2, '0')}`,
        yearNum: point.year + (point.month - 1) / 12,
        fcf: point.fcf_to_equity,
        cumulative: point.cumulative_fcf_to_equity,
      }));

  // Find the break-even point for visual indicator
  let breakEvenLabel: string | null = null;
  if (!isMonthly && equityPaybackYears) {
    // Yearly view: use year
    breakEvenLabel = `Y${Math.ceil(equityPaybackYears)}`;
  } else if (isMonthly && monthlyData && monthlyData.length > 0) {
    // Monthly view: find the first month where cumulative FCF turns positive
    const paybackMonth = monthlyData.find(
      (point, index) =>
        point.cumulative_fcf_to_equity >= 0 &&
        (index === 0 || monthlyData[index - 1].cumulative_fcf_to_equity < 0)
    );
    if (paybackMonth) {
      breakEvenLabel = `${paybackMonth.year}-${String(paybackMonth.month).padStart(2, '0')}`;
    }
  }

  // For monthly view, only show every 12th label to avoid crowding
  const interval = !isMonthly ? 4 : 11;

  // Dynamic labels based on view mode
  const fcfLabel = isMonthly ? 'Monthly FCF to Equity' : 'Annual FCF to Equity';
  const fcfTooltipLabel = isMonthly ? 'Monthly FCF' : 'Annual FCF';

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 60, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            interval={interval}
          />
          {/* Left Y-axis for FCF (bars) */}
          <YAxis
            yAxisId="fcf"
            orientation="left"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
          />
          {/* Right Y-axis for Cumulative FCF (area) */}
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            formatter={(value, name) => [
              formatCurrency(Number(value) || 0),
              name === 'fcf' ? fcfTooltipLabel : 'Cumulative FCF',
            ]}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend
            formatter={(value: string) =>
              value === 'fcf' ? fcfLabel : 'Cumulative FCF'
            }
          />
          {/* Zero line for FCF axis */}
          <ReferenceLine yAxisId="fcf" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          {/* Break-even indicator */}
          {breakEvenLabel && (
            <ReferenceLine
              yAxisId="cumulative"
              x={breakEvenLabel}
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
            yAxisId="fcf"
            dataKey="fcf"
            fill="#3b82f6"
            opacity={0.7}
            radius={[2, 2, 0, 0]}
          />
          <Area
            yAxisId="cumulative"
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
