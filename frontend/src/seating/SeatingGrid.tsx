import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { SeatingConfig, SeatingTable } from './types'
import { TableBlock, CELL_SIZE } from './TableBlock'

export interface ViewTransform {
  x: number
  y: number
  scale: number
}

interface Props {
  config: SeatingConfig
  tables: SeatingTable[]
  overTableId: number | null
  transform: ViewTransform
  onTransformChange: (t: ViewTransform) => void
}

export interface SeatingGridHandle {
  fitView: () => void
}

export const SeatingGrid = forwardRef<SeatingGridHandle, Props>(
  function SeatingGrid({ config, tables, overTableId, transform, onTransformChange }, ref) {
    const viewportRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const transformRef = useRef(transform)
    transformRef.current = transform
    const onChangeRef = useRef(onTransformChange)
    onChangeRef.current = onTransformChange
    const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

    const { setNodeRef: setDropRef } = useDroppable({ id: 'grid-canvas' })

    const gridWidth = config.grid_cols * CELL_SIZE
    const gridHeight = config.grid_rows * CELL_SIZE

    // Padding around the room floor area
    const floorPad = 20

    function fitView() {
      const vp = viewportRef.current
      if (!vp) return
      const { clientWidth, clientHeight } = vp
      const totalW = gridWidth + floorPad * 2
      const totalH = gridHeight + floorPad * 2
      const scale = Math.min(clientWidth / totalW, clientHeight / totalH) * 0.92
      const x = (clientWidth - totalW * scale) / 2
      const y = (clientHeight - totalH * scale) / 2
      onChangeRef.current({ x, y, scale })
    }

    useImperativeHandle(ref, () => ({ fitView }))

    useEffect(() => {
      canvasRef.current?.style.setProperty('--view-scale', String(transform.scale))
    }, [transform.scale])

    // Auto-fit on load — clamp to a min scale so tables are always readable
    useEffect(() => {
      const id = setTimeout(() => {
        const vp = viewportRef.current
        if (!vp) return
        const { clientWidth, clientHeight } = vp
        const totalW = gridWidth + floorPad * 2
        const totalH = gridHeight + floorPad * 2
        const fitScale = Math.min(clientWidth / totalW, clientHeight / totalH) * 0.92
        // Never go below 0.65 so 2×2 tables (160px) show at ≥104px
        const scale = Math.max(fitScale, 0.65)
        const x = (clientWidth - totalW * scale) / 2
        const y = (clientHeight - totalH * scale) / 2
        onChangeRef.current({ x, y, scale })
      }, 50)
      return () => clearTimeout(id)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.grid_cols, config.grid_rows])

    // Wheel zoom — non-passive so we can preventDefault
    useEffect(() => {
      const el = viewportRef.current
      if (!el) return

      function handleWheel(e: WheelEvent) {
        e.preventDefault()
        const prev = transformRef.current
        const factor = e.deltaY < 0 ? 1.08 : 0.93
        const newScale = Math.max(0.15, Math.min(4, prev.scale * factor))
        const rect = el!.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const r = newScale / prev.scale
        onChangeRef.current({
          scale: newScale,
          x: mx - r * (mx - prev.x),
          y: my - r * (my - prev.y),
        })
      }

      el.addEventListener('wheel', handleWheel, { passive: false })
      return () => el.removeEventListener('wheel', handleWheel)
    }, [])

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (e.button !== 0) return
      if ((e.target as Element).closest('.table-block')) return
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: transformRef.current.x,
        originY: transformRef.current.y,
      }
      viewportRef.current?.setPointerCapture(e.pointerId)
    }

    function handlePointerMove(e: React.PointerEvent) {
      if (!panRef.current) return
      const dx = e.clientX - panRef.current.startX
      const dy = e.clientY - panRef.current.startY
      onChangeRef.current({
        ...transformRef.current,
        x: panRef.current.originX + dx,
        y: panRef.current.originY + dy,
      })
    }

    function stopPan() {
      panRef.current = null
    }

    function setRootRef(el: HTMLDivElement | null) {
      ;(viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      setDropRef(el)
    }

    return (
      <div
        ref={setRootRef}
        className="relative flex-1 overflow-hidden rounded-xl select-none"
        style={{
          cursor: panRef.current ? 'grabbing' : 'grab',
          background: '#e8e3db',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPan}
        onPointerLeave={stopPan}
      >
        {/* Transformed canvas */}
        <div
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: gridWidth + floorPad * 2,
            height: gridHeight + floorPad * 2,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Venue floor area */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#fefcf8',
              borderRadius: 12,
              boxShadow: '0 2px 24px rgba(0,0,0,0.10)',
              border: '1.5px solid #d4b896',
            }}
          />

          {/* Subtle dot grid overlay on the floor */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={gridWidth + floorPad * 2}
            height={gridHeight + floorPad * 2}
            style={{ opacity: 0.35 }}
          >
            <defs>
              <pattern id="dots" x="0" y="0" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
                <circle cx={CELL_SIZE / 2} cy={CELL_SIZE / 2} r={1.5} fill="#c4a882" />
              </pattern>
            </defs>
            <rect
              x={floorPad} y={floorPad}
              width={gridWidth} height={gridHeight}
              fill="url(#dots)"
            />
          </svg>

          {/* Tables */}
          <div
            style={{
              position: 'absolute',
              left: floorPad,
              top: floorPad,
              width: gridWidth,
              height: gridHeight,
            }}
          >
            {tables.map((table) => (
              <TableBlock
                key={table.id}
                table={table}
                isOver={overTableId === table.id}
              />
            ))}
          </div>
        </div>

        {/* Zoom level indicator */}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-white/80 px-2 py-1 text-xs text-stone-400 shadow">
          {Math.round(transform.scale * 100)}%
        </div>
      </div>
    )
  },
)
