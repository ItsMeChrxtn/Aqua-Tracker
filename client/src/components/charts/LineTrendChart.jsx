import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { CHART_INK, seriesColor } from './chartPalette';

// Generic trend chart. `series` = [{ key, label }], `data` = [{ x, [key]: value }]
export default function LineTrendChart({ data, series, xKey = 'x', height = 260, yLabel, valueFormatter }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">No data to chart yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: CHART_INK.muted }}
          axisLine={false}
          tickLine={false}
          width={44}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: CHART_INK.muted } : undefined}
        />
        <Tooltip
          formatter={(value, name) => [valueFormatter ? valueFormatter(value) : value, name]}
          contentStyle={{ borderRadius: 8, borderColor: CHART_INK.grid, fontSize: 12 }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={seriesColor(i)}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: seriesColor(i) }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
