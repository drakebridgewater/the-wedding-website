import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { BudgetSummary } from './api'

const COLORS = [
  '#e11d48', '#7c3aed', '#2563eb', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#db2777', '#6d28d9', '#1d4ed8',
  '#0e7490', '#047857',
]

interface Props {
  summary: BudgetSummary
}

export function BudgetSummary({ summary }: Props) {
  const pieData = summary.by_category.map((c) => ({
    name: c.label,
    value: c.estimated,
  }))

  const variance = parseFloat(summary.variance)
  const isOverBudget = variance < 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Totals */}
      <div className="lg:col-span-1 space-y-4">
        <SummaryCard
          label="Total Estimated"
          value={formatCurrency(summary.total_estimated)}
          color="text-gray-900"
        />
        <SummaryCard
          label="Total Actual"
          value={formatCurrency(summary.total_actual)}
          color="text-gray-900"
        />
        <SummaryCard
          label="Variance"
          value={formatCurrency(Math.abs(variance))}
          sublabel={isOverBudget ? 'over budget' : 'under budget'}
          color={isOverBudget ? 'text-red-600' : 'text-emerald-600'}
        />
      </div>

      {/* Pie chart */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-gray-700 mb-3">Estimated by Category</h3>
        {pieData.length === 0 ? (
          <p className="text-base text-gray-400 text-center py-10">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend
                formatter={(v) => <span className="text-sm text-gray-700">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string
  value: string
  sublabel?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sublabel && <p className="text-sm text-gray-500 mt-0.5">{sublabel}</p>}
    </div>
  )
}
