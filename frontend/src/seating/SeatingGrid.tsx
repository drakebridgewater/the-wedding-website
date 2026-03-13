import { useDroppable } from '@dnd-kit/core'
import type { SeatingConfig, SeatingTable } from './types'
import { TableBlock, CELL_SIZE } from './TableBlock'

interface Props {
  config: SeatingConfig
  tables: SeatingTable[]
  overTableId: number | null
}

export function SeatingGrid({ config, tables, overTableId }: Props) {
  const { setNodeRef } = useDroppable({ id: 'grid-canvas' })

  const width = config.grid_cols * CELL_SIZE
  const height = config.grid_rows * CELL_SIZE

  return (
    <div className="overflow-auto rounded-xl border border-gray-200 bg-gray-50 shadow-inner">
      <div
        ref={setNodeRef}
        className="relative"
        style={{ width, height, minWidth: width, minHeight: height }}
      >
        {/* Grid lines */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
        >
          {Array.from({ length: config.grid_cols + 1 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={i * CELL_SIZE} y1={0}
              x2={i * CELL_SIZE} y2={height}
              stroke="#e5e7eb" strokeWidth={1}
            />
          ))}
          {Array.from({ length: config.grid_rows + 1 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={0} y1={i * CELL_SIZE}
              x2={width} y2={i * CELL_SIZE}
              stroke="#e5e7eb" strokeWidth={1}
            />
          ))}
        </svg>

        {/* Tables */}
        {tables.map((table) => (
          <TableBlock
            key={table.id}
            table={table}
            isOver={overTableId === table.id}
          />
        ))}
      </div>
    </div>
  )
}
