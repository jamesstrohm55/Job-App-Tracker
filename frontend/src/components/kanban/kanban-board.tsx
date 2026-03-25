import { useState, useCallback, useMemo } from "react"
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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
      // Check if it's a column ID
      if (STAGES.includes(id as Stage)) return id as Stage

      // Find which column contains this application
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

      // Determine target: if dropped over a column, use that column; if over another card, use its column
      let overContainer: Stage | null = null
      if (STAGES.includes(overId as Stage)) {
        overContainer = overId as Stage
      } else {
        overContainer = findContainer(overId)
      }

      if (!activeContainer || !overContainer) return

      // Calculate new order
      const overColumn = columnMap[overContainer]
      let newOrder: number

      if (STAGES.includes(overId as Stage)) {
        // Dropped on empty column area — append to end
        newOrder = overColumn.length
      } else {
        // Dropped on a specific card — insert at that card's position
        const overIndex = overColumn.findIndex((a) => a.id === overId)
        newOrder = overIndex >= 0 ? overIndex : overColumn.length
      }

      // If same container and same position, skip
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
      <div className="flex gap-4 overflow-x-auto pb-4">
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
          <div className="w-72">
            <KanbanCard application={activeApp} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
