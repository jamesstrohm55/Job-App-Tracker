import api from "@/api/client"

export interface EmailMessage {
  id: string
  user_id: string
  application_id: string | null
  gmail_message_id: string
  thread_id: string
  subject: string
  from_address: string
  snippet: string | null
  body_preview: string | null
  received_at: string
  is_auto_linked: boolean
  created_at: string
  updated_at: string
}

export interface EmailListResponse {
  items: EmailMessage[]
  total: number
}

export interface EmailSyncResponse {
  new_emails: number
  auto_linked: number
  auto_created: number
  stage_updates: number
  timeline_events: number
  sync_duration_seconds: number
}

export interface EmailSuggestion {
  email: EmailMessage
  matched_company: string | null
  confidence: string
}

export interface EmailSuggestionsResponse {
  suggestions: EmailSuggestion[]
}

export interface GmailStatus {
  connected: boolean
  email_address: string | null
  last_sync_at: string | null
  total_emails: number
}

export async function getGmailAuthUrl(): Promise<string> {
  const { data } = await api.get<{ url: string }>("/emails/gmail/url")
  return data.url
}

export async function connectGmail(code: string): Promise<void> {
  await api.post("/emails/connect-gmail", { code })
}

export async function disconnectGmail(): Promise<void> {
  await api.delete("/emails/disconnect-gmail")
}

export async function getGmailStatus(): Promise<GmailStatus> {
  const { data } = await api.get<GmailStatus>("/emails/gmail/status")
  return data
}

export async function syncEmails(): Promise<EmailSyncResponse> {
  const { data } = await api.post<EmailSyncResponse>("/emails/sync")
  return data
}

export async function listEmails(params?: {
  linked?: boolean
  application_id?: string
  page?: number
  size?: number
}): Promise<EmailListResponse> {
  const { data } = await api.get<EmailListResponse>("/emails", { params })
  return data
}

export async function getEmailSuggestions(): Promise<EmailSuggestionsResponse> {
  const { data } = await api.get<EmailSuggestionsResponse>("/emails/suggestions")
  return data
}

export async function linkEmail(emailId: string, applicationId: string): Promise<void> {
  await api.patch(`/emails/${emailId}/link`, { application_id: applicationId })
}

export async function unlinkEmail(emailId: string): Promise<void> {
  await api.patch(`/emails/${emailId}/unlink`)
}

export async function trashRejectionEmails(): Promise<{ trashed: number }> {
  const { data } = await api.post<{ trashed: number }>("/emails/trash-rejections")
  return data
}
