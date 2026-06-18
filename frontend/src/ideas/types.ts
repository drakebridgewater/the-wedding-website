export type IdeaSource = 'manual' | 'url' | 'pinterest'

export interface IdeaTag {
  id: number
  name: string
  created_at?: string
}

export interface Idea {
  id: number
  title: string
  description: string
  image_url: string | null
  source: IdeaSource
  source_url: string
  pinterest_pin_id: string
  tags: IdeaTag[]
  is_favorite: boolean
  order: number
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface IdeaFilters {
  tag?: number | null
  source?: IdeaSource | ''
  favorite?: boolean
  q?: string
}

export const SOURCE_LABELS: Record<IdeaSource, string> = {
  manual: 'Uploaded',
  url: 'Web link',
  pinterest: 'Pinterest',
}
