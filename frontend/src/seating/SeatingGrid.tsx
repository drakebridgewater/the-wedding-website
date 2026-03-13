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
    // Keep refs so wheel/pan closures are never stale
    const transformRef = useRef(transform)
    transformRef.current = transform
    const onChangeRef = useRef(onTransformChange)
    onChangeRef.current = onTransformChange
    const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

    const { setNodeRef: setDropRef } = useDroppable({ id: 'grid-canvas' })

    const gridWidth = config.grid_cols * CELL_SIZE
    const gridHeight = config.grid_rows * CELL_SIZE

    function fitView() {
      const vp = viewportRef.current
      if (!vp) return
      const { clientWidth, clientHeight } = vp
      const scale = Math.min(clientWidth / gridWidth, clientHeight / gridHeight) * 0.92
      const x = (clientWidth - gridWidth * scale) / 2
      const y = (clientHeight - gridHeight * scale) / 2
      onChangeRef.current({ x, y, scale })
    }

    useImperativeHandle(ref, () => ({ fitView }))

    // Keep --view-scale CSS variable in sync so table text can counter-scale without prop drilling
    useEffect(() => {
      canvasRef.current?.style.setProperty('--view-scale', String(transform.scale))
    }, [transform.scale])

    // Auto-fit when grid dimensions change
    useEffect(() => {
      const id = setTimeout(fitView, 50)
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
      // Don't start panning when pressing on a table block
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

    // Merge the drop ref and the viewport ref onto the same element
    function setRootRef(el: HTMLDivElement | null) {
      ;(viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      setDropRef(el)
    }

    return (
      <div
        ref={setRootRef}
        className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-inner select-none"
        style={{ cursor: panRef.current ? 'grabbing' : 'grab' }}
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
            width: gridWidth,
            height: gridHeight,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Grid lines */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={gridWidth}
            height={gridHeight}
          >
            {Array.from({ length: config.grid_cols + 1 }, (_, i) => (
              <line
                key={`v${i}`}
                x1={i * CELL_SIZE} y1={0}
                x2={i * CELL_SIZE} y2={gridHeight}
                stroke="#e5e7eb" strokeWidth={1}
              />
            ))}
            {Array.from({ length: config.grid_rows + 1 }, (_, i) => (
              <line
                key={`h${i}`}
                x1={0} y1={i * CELL_SIZE}
                x2={gridWidth} y2={i * CELL_SIZE}
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

        {/* Zoom level indicator */}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-white/80 px-2 py-1 text-xs text-gray-400 shadow">
          {Math.round(transform.scale * 100)}%
        </div>
      </div>
    )
  },
)
