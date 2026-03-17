import { useState } from 'react'
import type { ListType } from './types'
import { SongList } from './SongList'
import { AddSongModal } from './AddSongModal'

const TABS: { id: ListType; label: string }[] = [
  { id: 'playlist', label: 'Playlist' },
  { id: 'do_not_play', label: 'Do-Not-Play' },
]

export function MusicApp() {
  const [activeTab, setActiveTab] = useState<ListType>('playlist')
  const [showModal, setShowModal] = useState(false)

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Music</h2>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? '#4f46e5' : '#6b7280',
              borderBottom: activeTab === tab.id ? '2px solid #4f46e5' : '2px solid transparent',
              marginBottom: -2,
              fontSize: 15,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SongList listType={activeTab} onAdd={() => setShowModal(true)} />

      {showModal && (
        <AddSongModal
          listType={activeTab}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
