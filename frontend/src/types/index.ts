import type { Stage } from "@/lib/constants"

export interface User {
  id: string
  email: string
  name: string
  picture_url: string | null
}

export interface Application {
  id: string
  user_id: string
  company: string
  position: string
  url: string | null
  location: string | null
  work_model: "remote" | "hybrid" | "onsite" | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  stage: Stage
  stage_order: number
  notes: string | null
  applied_date: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  company: string | null
  linkedin_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TimelineEvent {
  id: string
  application_id: string
  event_type: string
  title: string
  description: string | null
  event_date: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
}
