import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Stage } from "@/lib/constants"
import type { Application } from "@/types"
import {
  createApplication,
  deleteApplication,
  getApplication,
  getBoard,
  listApplications,
  moveApplication,
  updateApplication,
  type ApplicationCreate,
  type ApplicationUpdate,
  type BoardMoveRequest,
  type BoardResponse,
} from "@/api/applications"

export function useBoard() {
  return useQuery({
    queryKey: ["board"],
    queryFn: getBoard,
  })
}

export function useApplications(params?: {
  stage?: Stage
  search?: string
  archived?: boolean
  page?: number
  size?: number
}) {
  return useQuery({
    queryKey: ["applications", params],
    queryFn: () => listApplications(params),
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ["application", id],
    queryFn: () => getApplication(id),
    enabled: !!id,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ApplicationCreate) => createApplication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] })
      queryClient.invalidateQueries({ queryKey: ["applications"] })
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApplicationUpdate }) =>
      updateApplication(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] })
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["application"] })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] })
      queryClient.invalidateQueries({ queryKey: ["applications"] })
    },
  })
}

export function useMoveApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: BoardMoveRequest) => moveApplication(req),
    onMutate: async (req) => {
      await queryClient.cancelQueries({ queryKey: ["board"] })
      const previous = queryClient.getQueryData<BoardResponse>(["board"])

      if (previous) {
        const newColumns = previous.columns.map((col) => ({
          ...col,
          applications: col.applications.filter((a) => a.id !== req.application_id),
        }))

        // Find the moved application from the old data
        let movedApp: Application | undefined
        for (const col of previous.columns) {
          movedApp = col.applications.find((a) => a.id === req.application_id)
          if (movedApp) break
        }

        if (movedApp) {
          const targetCol = newColumns.find((c) => c.stage === req.new_stage)
          if (targetCol) {
            const updated = { ...movedApp, stage: req.new_stage, stage_order: req.new_order }
            targetCol.applications.splice(req.new_order, 0, updated)
            // Reindex stage_order
            targetCol.applications.forEach((a, i) => (a.stage_order = i))
          }
        }

        queryClient.setQueryData(["board"], { columns: newColumns })
      }

      return { previous }
    },
    onError: (_err, _req, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["board"], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] })
    },
  })
}
