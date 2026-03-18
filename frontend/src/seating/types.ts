export interface SeatingConfig {
  grid_cols: number
  grid_rows: number
  cell_size_ft: number
}

export interface GuestSeating {
  id: number
  first_name: string
  last_name: string
  is_child: boolean
  meal: string | null
  seating_table_id: number | null
  seat_color: string
}

export interface SeatingTable {
  id: number
  name: string
  capacity: number
  shape: 'round' | 'square'
  grid_x: number
  grid_y: number
  grid_width: number
  grid_height: number
  notes: string
  assigned_count: number
  guests: GuestSeating[]
  created_at: string
  updated_at: string
}

export interface TableFormData {
  name: string
  capacity: number
  shape: 'round' | 'square'
  grid_x: number
  grid_y: number
  grid_width: number
  grid_height: number
  notes: string
}
