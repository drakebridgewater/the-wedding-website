export type ListType = 'playlist' | 'do_not_play'

export type Moment =
  | 'ceremony'
  | 'cocktail'
  | 'first_dance'
  | 'reception'
  | 'other'

export const MOMENT_LABELS: Record<Moment, string> = {
  ceremony: 'Ceremony',
  cocktail: 'Cocktail Hour',
  first_dance: 'First Dance',
  reception: 'Reception',
  other: 'Other',
}

export const MOMENT_ORDER: Moment[] = [
  'ceremony',
  'first_dance',
  'cocktail',
  'reception',
  'other',
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
