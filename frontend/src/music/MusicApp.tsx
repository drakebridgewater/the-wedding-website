import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { CreateSongData, ListType } from './types'
import { SongList } from './SongList'
import { AddSongModal } from './AddSongModal'

const TABS: { id: ListType; label: string }[] = [
  { id: 'playlist', label: 'Playlist' },
  { id: 'do_not_play', label: 'Do Not Play' },
]

export function MusicApp() {
  const [activeTab, setActiveTab] = useState<ListType>('playlist')
  const [showModal, setShowModal] = useState(false)
  const [prefill, setPrefill] = useState<Partial<CreateSongData> | null>(null)

  function openAdd(data?: Partial<CreateSongData>) {
    setPrefill(data ?? null)
    setShowModal(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Music</h1>
          <p className="text-sm text-stone-400 mt-0.5">Build your wedding playlist moment by moment</p>
        </div>
        <button
          onClick={() => openAdd()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          <Plus size={14} /> Add Song
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-stone-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-stone-800 text-stone-800'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SongList listType={activeTab} onAdd={openAdd} />

      {showModal && (
        <AddSongModal
          listType={activeTab}
          prefill={prefill}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
