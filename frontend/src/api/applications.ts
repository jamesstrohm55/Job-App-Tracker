import api from "@/api/client"
import type { Application } from "@/types"
import type { Stage } from "@/lib/constants"

export interface ApplicationCreate {
  company: string
  position: string
  url?: string | null
  location?: string | null
  work_model?: "remote" | "hybrid" | "onsite" | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  stage?: Stage
  notes?: string | null
  applied_date?: string | null
}

export interface ApplicationUpdate extends Partial<ApplicationCreate> {
  is_archived?: boolean
}

export interface ApplicationListResponse {
  items: Application[]
  total: number
  page: number
  size: number
}

export interface BoardColumn {
  stage: Stage
  applications: Application[]
}

export interface BoardResponse {
  columns: BoardColumn[]
}

export interface BoardMoveRequest {
  application_id: string
  new_stage: Stage
  new_order: number
}

export async function createApplication(data: ApplicationCreate): Promise<Application> {
  const { data: app } = await api.post<Application>("/applications", data)
  return app
}

export async function getApplication(id: string): Promise<Application> {
  const { data } = await api.get<Application>(`/applications/${id}`)
  return data
}

export async function listApplications(params?: {
  stage?: Stage
  search?: string
  archived?: boolean
  page?: number
  size?: number
}): Promise<ApplicationListResponse> {
  const { data } = await api.get<ApplicationListResponse>("/applications", { params })
  return data
}

export async function updateApplication(
  id: string,
  data: ApplicationUpdate
): Promise<Application> {
  const { data: app } = await api.patch<Application>(`/applications/${id}`, data)
  return app
}

export async function deleteApplication(id: string): Promise<void> {
  await api.delete(`/applications/${id}`)
}

export async function getBoard(): Promise<BoardResponse> {
  const { data } = await api.get<BoardResponse>("/board")
  return data
}

export async function moveApplication(req: BoardMoveRequest): Promise<void> {
  await api.patch("/board/move", req)
}

export async function reorderColumn(stage: Stage, ordered_ids: string[]): Promise<void> {
  await api.patch("/board/reorder", { stage, ordered_ids })
}
