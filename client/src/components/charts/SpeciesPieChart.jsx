import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { CATEGORICAL } from './chartPalette';

// `data` = [{ name, value }]. Direct labels + legend are mandatory here since
// three of the eight categorical slots sit below 3:1 contrast on white.
export default function SpeciesPieChart({ data, height = 260, valueFormatter }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">No production data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
          isAnimationActive={false}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={CATEGORICAL[i % CATEGORICAL.length]} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [valueFormatter ? valueFormatter(value) : value, name]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
