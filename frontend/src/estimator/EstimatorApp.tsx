import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Calculator, Loader2, AlertCircle, Download, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useEstimate, useImportEstimate, type EstimateRequest, type EstimateResult } from './api'

const TIERS = [
  {
    value: 'budget' as const,
    label: 'Budget',
    desc: '~$150/guest · $20–25k total',
    color: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    active: 'border-emerald-500 ring-2 ring-emerald-300',
  },
  {
    value: 'standard' as const,
    label: 'Standard',
    desc: '~$275/guest · $33–40k total',
    color: 'border-blue-300 bg-blue-50 text-blue-800',
    active: 'border-blue-500 ring-2 ring-blue-300',
  },
  {
    value: 'luxury' as const,
    label: 'Luxury',
    desc: '~$500/guest · $60–70k total',
    color: 'border-rose-300 bg-rose-50 text-rose-800',
    active: 'border-rose-500 ring-2 ring-rose-300',
  },
]

interface EstimatorAppProps {
  modal?: boolean
  onImportSuccess?: () => void
}

export function EstimatorApp({ modal, onImportSuccess }: EstimatorAppProps = {}) {
  const [guestCount, setGuestCount] = useState<string>('100')
  const [tier, setTier] = useState<EstimateRequest['tier']>('standard')
  const estimate = useEstimate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const count = parseInt(guestCount, 10)
    if (isNaN(count) || count < 1) return
    estimate.mutate({ guest_count: count, tier })
  }

  const content = (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator size={24} className="text-rose-600" />
          Budget Estimator
        </h1>
        <p className="text-base text-gray-500 mt-1">
          Get a quick estimate based on your guest count and service level.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest count */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Number of Guests
            </label>
            <input
              type="number"
              min={1}
              max={2000}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              className="w-40 rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* Tier selector */}
          <div>
            <p className="block text-base font-medium text-gray-700 mb-3">Service Level</p>
            <div className="flex gap-4">
              {TIERS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTier(t.value)}
                  className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${t.color} ${tier === t.value ? t.active : 'opacity-70 hover:opacity-100'}`}
                >
                  <p className="font-semibold text-base">{t.label}</p>
                  <p className="text-sm mt-0.5 opacity-75">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={estimate.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-rose-600 text-white text-base font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            {estimate.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Calculating…</>
            ) : (
              <><Calculator size={16} /> Calculate Estimate</>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {estimate.isError && (
        <div className="flex items-center gap-2 text-red-600 mb-6">
          <AlertCircle size={18} />
          <span className="text-base">Something went wrong. Please try again.</span>
        </div>
      )}

      {/* Results */}
      {estimate.data && (
        <EstimateResults
          result={estimate.data}
          guestCount={parseInt(guestCount, 10)}
          tier={tier}
          onImportSuccess={onImportSuccess}
        />
      )}
    </>
  )

  if (modal) {
    return <div className="px-6 py-6">{content}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">{content}</div>
    </div>
  )
}

function EstimateResults({
  result,
  guestCount,
  tier,
  onImportSuccess,
}: {
  result: EstimateResult
  guestCount: number
  tier: EstimateRequest['tier']
  onImportSuccess?: () => void
}) {
  const sorted = [...result.breakdown].sort((a, b) => b.amount - a.amount)
  const importMutation = useImportEstimate()

  function handleImport() {
    importMutation.mutate({ guest_count: guestCount, tier }, { onSuccess: onImportSuccess })
  }

  return (
    <div className="space-y-6">
      {/* Total + import button */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-base font-medium text-rose-700">Estimated Total</p>
          <p className="text-3xl font-bold text-rose-800 mt-1">
            {formatCurrency(result.total)}
          </p>
          <p className="text-sm text-rose-600 mt-1">
            {result.guest_count} guests · <span className="capitalize">{result.tier}</span> tier
          </p>
        </div>

        <div className="text-right">
          {importMutation.isSuccess ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">
                {importMutation.data.created} item{importMutation.data.created !== 1 ? 's' : ''} added to budget
                {importMutation.data.skipped > 0 && (
                  <span className="text-emerald-600">
                    {' '}({importMutation.data.skipped} skipped — already exist)
                  </span>
                )}
              </span>
            </div>
          ) : (
            <button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-rose-700 text-white text-base font-medium hover:bg-rose-800 disabled:opacity-50 transition-colors"
            >
              {importMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Importing…</>
              ) : (
                <><Download size={16} /> Import to Budget</>
              )}
            </button>
          )}
          {importMutation.isError && (
            <p className="text-sm text-red-600 mt-1">Import failed. Please try again.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-700">Category Breakdown</h3>
          </div>
          <table className="w-full text-base">
            <thead className="bg-gray-50 text-sm text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Category</th>
                <th className="px-4 py-2 text-right font-semibold">Amount</th>
                <th className="px-4 py-2 text-right font-semibold">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((item) => (
                <tr key={item.category} className="hover:bg-gray-50">
                  <td className="px-4 py-3 capitalize">{item.label}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {Math.round((item.amount / result.total) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-700 mb-3">Visual Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sorted} layout="vertical" margin={{ left: 20, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12 }}
                width={100}
              />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="amount" fill="#e11d48" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        These are rough estimates to help with planning. Actual costs will vary by vendor, location, and preferences.
      </p>
    </div>
  )
}
