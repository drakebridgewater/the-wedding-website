import { useEffect, useState } from 'react'
import { useEmailTemplates } from '../api'
import { StatsBar } from './StatsBar'
import { TemplateEditor } from './TemplateEditor'
import { SendPanel } from './SendPanel'
import { SendLog } from './SendLog'

export function EmailsTab() {
  const { data: templates = [], isLoading } = useEmailTemplates()
  const [activeId, setActiveId] = useState<number | 'new' | null>(null)

  // Auto-select first template on load
  useEffect(() => {
    if (templates.length > 0 && activeId === null) {
      setActiveId(templates[0].id)
    }
  }, [templates]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeTemplate = activeId === 'new' ? null : (templates.find((t) => t.id === activeId) ?? null)

  return (
    <div className="space-y-6">
      <StatsBar />

      {/* Template selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-stone-500 mr-1">Templates:</span>
        {isLoading && <span className="text-xs text-stone-400">Loading…</span>}
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              activeId === t.id
                ? 'bg-stone-800 text-white border-stone-800'
                : 'border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {t.name}
          </button>
        ))}
        <button
          onClick={() => setActiveId('new')}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            activeId === 'new'
              ? 'bg-stone-800 text-white border-stone-800'
              : 'border-dashed border-stone-300 text-stone-500 hover:bg-stone-50'
          }`}
        >
          + New template
        </button>
      </div>

      {/* Editor + send side-by-side (stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium text-stone-700 mb-3">
            {activeId === 'new' ? 'New template' : activeTemplate ? `Edit: ${activeTemplate.name}` : 'Select a template'}
          </h3>
          {(activeId === 'new' || activeTemplate) ? (
            <TemplateEditor
              key={activeId}
              template={activeTemplate}
              onSaved={(t) => setActiveId(t.id)}
              onDeleted={() => setActiveId(templates.filter((t) => t.id !== activeId)[0]?.id ?? 'new')}
            />
          ) : (
            <p className="text-sm text-stone-400">Select a template from the list above or create a new one.</p>
          )}
        </div>

        <div>
          <SendPanel template={activeTemplate} />
        </div>
      </div>

      <SendLog />
    </div>
  )
}
