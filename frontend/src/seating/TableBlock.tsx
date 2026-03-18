import { useRef, useState } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { SeatingTable, GuestSeating } from './types'
import { TablePopup } from './TablePopup'

export const CELL_SIZE = 80

const DEFAULT_SEAT_COLOR = '#94a3b8'

function initials(g: GuestSeating): string {
  return ((g.first_name[0] ?? '') + (g.last_name[0] ?? '')).toUpperCase()
}

function RoundTable({ table, isOver }: { table: SeatingTable; isOver: boolean }) {
  const N = table.capacity
  const seatR = 14
  const seatGap = 4
  // Space seats evenly around circumference
  const seatDist = Math.max((N * (seatR * 2 + seatGap)) / (2 * Math.PI), seatR + 22)
  const tableR = Math.max(seatDist - seatR - seatGap, 22)
  const padding = 8
  const nat = (seatDist + seatR + padding) * 2
  const cx = nat / 2
  const cy = nat / 2

  const seats = Array.from({ length: N }, (_, i) => {
    const angle = (2 * Math.PI * i) / N - Math.PI / 2
    return {
      x: cx + seatDist * Math.cos(angle),
      y: cy + seatDist * Math.sin(angle),
      guest: table.guests[i] ?? null,
    }
  })

  const nameSize = Math.max(8, Math.min(13, tableR * 0.44))
  const countSize = Math.max(7, Math.min(11, tableR * 0.34))

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${nat} ${nat}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Drop shadow */}
      <circle cx={cx + 2} cy={cy + 2.5} r={tableR} fill="rgba(0,0,0,0.07)" />
      {/* Table surface */}
      <circle
        cx={cx} cy={cy} r={tableR}
        fill={isOver ? '#fce7f3' : '#fefaf6'}
        stroke={isOver ? '#f43f5e' : '#c4a882'}
        strokeWidth={isOver ? 2.5 : 1.5}
      />
      {/* Inner ring decoration */}
      <circle
        cx={cx} cy={cy} r={tableR - 5}
        fill="none"
        stroke={isOver ? '#fda4af' : '#e8d5bc'}
        strokeWidth={0.8}
      />
      {/* Table name */}
      <text
        x={cx} y={cy - countSize * 0.7}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={nameSize} fontWeight="600"
        fill="#5c3d2e"
        style={{ userSelect: 'none', fontFamily: 'inherit' }}
      >
        {table.name}
      </text>
      {/* Seat count */}
      <text
        x={cx} y={cy + nameSize * 0.9}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={countSize}
        fill={table.assigned_count >= N ? '#b45309' : '#a8a29e'}
        style={{ userSelect: 'none' }}
      >
        {table.assigned_count}/{N}
      </text>
      {/* Seat circles */}
      {seats.map(({ x, y, guest }, i) => {
        const color = guest ? (guest.seat_color || DEFAULT_SEAT_COLOR) : undefined
        return (
          <g key={i}>
            <circle
              cx={x} cy={y} r={seatR}
              fill={guest ? color! : '#f5f5f4'}
              stroke={guest ? color! : '#d6d3d1'}
              strokeWidth={1.5}
            />
            {guest && (
              <text
                x={x} y={y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontWeight="700" fill="white"
                style={{ userSelect: 'none' }}
              >
                {initials(guest)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function RectTable({ table, isOver }: { table: SeatingTable; isOver: boolean }) {
  const N = table.capacity
  const seatR = 12
  const topCount = Math.ceil(N / 2)
  const botCount = Math.floor(N / 2)
  const colCount = Math.max(topCount, botCount)

  const seatSpacing = seatR * 2 + 6
  const tableW = colCount * seatSpacing + 16
  const tableH = Math.max(44, tableW * 0.38)

  const padX = seatR + 8
  const padY = seatR + 8
  const natW = tableW + padX * 2
  const natH = tableH + padY * 2
  const tx = padX
  const ty = padY

  const seats: Array<{ x: number; y: number; guest: GuestSeating | null }> = []
  for (let i = 0; i < topCount; i++) {
    seats.push({
      x: tx + (tableW / (topCount + 1)) * (i + 1),
      y: ty - seatR - 4,
      guest: table.guests[i] ?? null,
    })
  }
  for (let i = 0; i < botCount; i++) {
    seats.push({
      x: tx + (tableW / (botCount + 1)) * (i + 1),
      y: ty + tableH + seatR + 4,
      guest: table.guests[topCount + i] ?? null,
    })
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${natW} ${natH}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Shadow */}
      <rect x={tx + 2} y={ty + 2.5} width={tableW} height={tableH} rx={6} fill="rgba(0,0,0,0.07)" />
      {/* Table surface */}
      <rect
        x={tx} y={ty} width={tableW} height={tableH}
        rx={6}
        fill={isOver ? '#fce7f3' : '#fefaf6'}
        stroke={isOver ? '#f43f5e' : '#c4a882'}
        strokeWidth={isOver ? 2.5 : 1.5}
      />
      {/* Name */}
      <text
        x={tx + tableW / 2} y={ty + tableH / 2 - 8}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fontWeight="600" fill="#5c3d2e"
        style={{ userSelect: 'none' }}
      >
        {table.name}
      </text>
      {/* Count */}
      <text
        x={tx + tableW / 2} y={ty + tableH / 2 + 8}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fill={table.assigned_count >= N ? '#b45309' : '#a8a29e'}
        style={{ userSelect: 'none' }}
      >
        {table.assigned_count}/{N}
      </text>
      {/* Seats */}
      {seats.map(({ x, y, guest }, i) => {
        const color = guest ? (guest.seat_color || DEFAULT_SEAT_COLOR) : undefined
        return (
          <g key={i}>
            <circle
              cx={x} cy={y} r={seatR}
              fill={guest ? color! : '#f5f5f4'}
              stroke={guest ? color! : '#d6d3d1'}
              strokeWidth={1.5}
            />
            {guest && (
              <text
                x={x} y={y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={7} fontWeight="700" fill="white"
                style={{ userSelect: 'none' }}
              >
                {initials(guest)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

interface Props {
  table: SeatingTable
  isOver?: boolean
}

interface PopupAnchor { x: number; y: number }

export function TableBlock({ table, isOver }: Props) {
  const [anchor, setAnchor] = useState<PopupAnchor | null>(null)
  const blockRef = useRef<HTMLDivElement>(null)

  const { setNodeRef: setDropRef } = useDroppable({
    id: `table-${table.id}`,
    data: { type: 'table', tableId: table.id },
  })

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `table-move-${table.id}`,
    data: { type: 'table-move', tableId: table.id },
  })

  const style = {
    position: 'absolute' as const,
    left: table.grid_x * CELL_SIZE,
    top: table.grid_y * CELL_SIZE,
    width: table.grid_width * CELL_SIZE,
    height: table.grid_height * CELL_SIZE,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : anchor ? 50 : 10,
    opacity: isDragging ? 0.7 : 1,
  }

  function setRef(el: HTMLElement | null) {
    setDropRef(el)
    setDragRef(el)
  }

  function handleClick() {
    if (isDragging) return
    if (anchor) { setAnchor(null); return }
    const rect = blockRef.current?.getBoundingClientRect()
    if (rect) setAnchor({ x: rect.left + rect.width / 2, y: rect.bottom })
  }

  return (
    <div style={style} className="table-block relative" ref={blockRef}>
      <div
        ref={setRef}
        onClick={handleClick}
        className="flex h-full w-full cursor-pointer items-center justify-center select-none"
        {...listeners}
        {...attributes}
      >
        {table.shape === 'round' ? (
          <RoundTable table={table} isOver={!!isOver} />
        ) : (
          <RectTable table={table} isOver={!!isOver} />
        )}
      </div>

      {anchor && (
        <TablePopup table={table} anchor={anchor} onClose={() => setAnchor(null)} />
      )}
    </div>
  )
}
