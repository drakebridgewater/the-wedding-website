import { Heart } from 'lucide-react'
import type { Idea } from './types'

interface IdeaCardProps {
  idea: Idea
  onClick: () => void
  onToggleFavorite: () => void
}

export function IdeaCard({ idea, onClick, onToggleFavorite }: IdeaCardProps) {
  return (
    <div className="mb-3 break-inside-avoid group relative rounded-xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <button onClick={onClick} className="block w-full text-left">
        {idea.image_url ? (
          <img
            src={idea.image_url}
            alt={idea.title || 'Idea'}
            loading="lazy"
            className="w-full h-auto object-cover"
          />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}
        {(idea.title || idea.tags.length > 0) && (
          <div className="px-2.5 py-2">
            {idea.title && (
              <p className="text-sm font-medium text-gray-800 line-clamp-2">{idea.title}</p>
            )}
            {idea.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {idea.tags.map((t) => (
                  <span
                    key={t.id}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={idea.is_favorite ? 'Remove favorite' : 'Add favorite'}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur hover:bg-white transition-colors opacity-0 group-hover:opacity-100 data-[fav=true]:opacity-100"
        data-fav={idea.is_favorite}
      >
        <Heart
          size={16}
          className={idea.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-gray-500'}
        />
      </button>
    </div>
  )
}
