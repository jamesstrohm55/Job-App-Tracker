import { useState, useCallback, useMemo, useRef } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { STAGES, type Stage } from "@/lib/constants"
import type { Application } from "@/types"
import type { BoardResponse } from "@/api/applications"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"

interface KanbanBoardProps {
  data: BoardResponse
  onMove: (applicationId: string, newStage: Stage, newOrder: number) => void
  onAddClick: (stage: Stage) => void
  onCardClick: (app: Application) => void
}

export function KanbanBoard({ data, onMove, onAddClick, onCardClick }: KanbanBoardProps) {
  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, scrollLeft: 0 })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Grab-to-pan scrolling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el) return
    // Only pan when clicking the board background, not cards
    if ((e.target as HTMLElement).closest("[data-kanban-card]")) return
    isPanning.current = true
    panStart.current = { x: e.clientX, scrollLeft: el.scrollLeft }
    el.style.cursor = "grabbing"
    el.style.userSelect = "none"
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || !scrollRef.current) return
    const dx = e.clientX - panStart.current.x
    scrollRef.current.scrollLeft = panStart.current.scrollLeft - dx
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab"
      scrollRef.current.style.userSelect = ""
    }
  }, [])

  const columnMap = useMemo(() => {
    const map: Record<Stage, Application[]> = {} as Record<Stage, Application[]>
    for (const stage of STAGES) {
      map[stage] = []
    }
    for (const col of data.columns) {
      map[col.stage] = [...col.applications].sort((a, b) => a.stage_order - b.stage_order)
    }
    return map
  }, [data])

  const findContainer = useCallback(
    (id: string): Stage | null => {
      if (STAGES.includes(id as Stage)) return id as Stage
      for (const stage of STAGES) {
        if (columnMap[stage].some((a) => a.id === id)) {
          return stage
        }
      }
      return null
    },
    [columnMap]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const container = findContainer(active.id as string)
      if (container) {
        const app = columnMap[container].find((a) => a.id === active.id)
        setActiveApp(app || null)
      }
    },
    [findContainer, columnMap]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveApp(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      const activeContainer = findContainer(activeId)

      let overContainer: Stage | null = null
      if (STAGES.includes(overId as Stage)) {
        overContainer = overId as Stage
      } else {
        overContainer = findContainer(overId)
      }

      if (!activeContainer || !overContainer) return

      const overColumn = columnMap[overContainer]
      let newOrder: number

      if (STAGES.includes(overId as Stage)) {
        newOrder = overColumn.length
      } else {
        const overIndex = overColumn.findIndex((a) => a.id === overId)
        newOrder = overIndex >= 0 ? overIndex : overColumn.length
      }

      if (activeContainer === overContainer) {
        const activeIndex = overColumn.findIndex((a) => a.id === activeId)
        if (activeIndex === newOrder) return
      }

      onMove(activeId, overContainer, newOrder)
    },
    [findContainer, columnMap, onMove]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 cursor-grab select-none"
        style={{ scrollbarWidth: "thin" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            applications={columnMap[stage]}
            onAddClick={() => onAddClick(stage)}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeApp && (
          <div className="w-56">
            <KanbanCard application={activeApp} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
