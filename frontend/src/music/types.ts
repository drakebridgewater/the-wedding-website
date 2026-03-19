export type ListType = 'playlist' | 'do_not_play'

export type Moment =
  | 'start'
  | 'prelude'
  | 'party'
  | 'bride'
  | 'ceremony'
  | 'exit'
  | 'postlude'
  | 'cocktail'
  | 'entrance'
  | 'dance'
  | 'dinner'
  | 'review'

export const MOMENT_LABELS: Record<Moment, string> = {
  start: 'Start',
  prelude: 'Prelude',
  party: 'Party',
  bride: 'Bride',
  ceremony: 'Ceremony',
  exit: 'Exit',
  postlude: 'Postlude',
  cocktail: 'Cocktail',
  entrance: 'Entrance',
  dance: 'Dance',
  dinner: 'Dinner',
  review: 'Review',
}

export const MOMENT_ORDER: Moment[] = [
  'start',
  'prelude',
  'bride',
  'ceremony',
  'exit',
  'postlude',
  'cocktail',
  'entrance',
  'dance',
  'dinner',
  'party',
  'review',
]

export type Source = 'youtube' | 'spotify' | 'soundcloud' | 'other' | ''

export interface Song {
  id: number
  list_type: ListType
  moment: Moment
  title: string
  artist: string
  url: string
  source: Source
  thumbnail_url: string
  notes: string
  order: number
  created_at: string
}

export interface FetchedMetadata {
  title: string
  artist: string
  thumbnail_url: string
  source: Source
}

export interface MusicBrainzResult {
  mbid: string
  title: string
  artist: string
  duration_ms: number | null
}

export interface CreateSongData {
  list_type: ListType
  moment: Moment
  title: string
  artist?: string
  url?: string
  source?: Source
  thumbnail_url?: string
  notes?: string
  order?: number
}
