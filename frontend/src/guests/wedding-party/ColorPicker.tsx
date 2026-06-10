import { useState } from 'react'

const SWATCHES = [
  '#fda4af', '#f9a8d4', '#ddd6fe', '#bae6fd', '#bbf7d0',
  '#fecdd3', '#e9d5ff', '#93c5fd', '#86efac', '#fef3c7',
  '#fb7185', '#a78bfa', '#60a5fa', '#34d399', '#fde68a',
  '#e11d48', '#7c3aed', '#2563eb', '#059669', '#d97706',
]

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [hex, setHex] = useState(value)

  function commitHex(raw: string) {
    const v = raw.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => { onChange(c); setHex(c) }}
            className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-stone-400"
            style={{
              backgroundColor: c,
              borderColor: value === c ? '#292524' : 'transparent',
              boxShadow: value === c ? '0 0 0 1px #292524' : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full border border-stone-200 flex-shrink-0" style={{ backgroundColor: value }} />
        <input
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={(e) => commitHex(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitHex(hex) } }}
          placeholder="#000000"
          className="flex-1 border border-stone-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>
    </div>
  )
}
