import api from "@/api/client"

export interface EmailMessage {
  id: string
  user_id: string
  application_id: string | null
  gmail_message_id: string
  thread_id: string
  subject: string
  from_address: string
  to_address: string | null
  snippet: string | null
  body_preview: string | null
  received_at: string
  is_auto_linked: boolean
  label: string
  is_read: boolean
  is_job_related: boolean
  intent: string | null
  extracted_company: string | null
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
  sync_duration_seconds: number
}

export interface PendingAction {
  type: "new_meeting" | "past_interview" | "rejection_detected"
  email_id?: string
  gmail_message_id?: string
  subject?: string
  from_address?: string
  snippet?: string
  received_at?: string
  extracted_company?: string
  application_id?: string
  company?: string
  position?: string
  interview_title?: string
  interview_date?: string
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

export interface GmailSearchResult {
  gmail_message_id: string
  subject: string
  from_address: string
  snippet: string
  received_at: string
  is_stored: boolean
}

export async function searchGmail(query: string): Promise<GmailSearchResult[]> {
  const { data } = await api.get<{ results: GmailSearchResult[] }>("/emails/search", {
    params: { q: query },
  })
  return data.results
}

export async function importEmail(
  gmailMessageId: string,
  applicationId?: string
): Promise<EmailMessage> {
  const { data } = await api.post<EmailMessage>("/emails/import", {
    gmail_message_id: gmailMessageId,
    application_id: applicationId || null,
  })
  return data
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const { data } = await api.get<{ actions: PendingAction[] }>("/emails/pending-actions")
  return data.actions
}

export async function dismissEmail(emailId: string): Promise<void> {
  await api.post("/emails/dismiss", { email_id: emailId })
}

export async function confirmRejection(emailId: string, applicationId: string): Promise<void> {
  await api.post("/emails/confirm-rejection", { email_id: emailId, application_id: applicationId })
}

export async function importAsInterview(
  gmailMessageId: string,
  company: string,
  position?: string
): Promise<{ ok: boolean; application_id: string; company: string }> {
  const { data } = await api.post("/emails/import-as-interview", {
    gmail_message_id: gmailMessageId,
    company,
    position: position || "Unknown Position",
  })
  return data
}

export async function trashRejectionEmails(): Promise<{ trashed: number }> {
  const { data } = await api.post<{ trashed: number }>("/emails/trash-rejections")
  return data
}

export async function trashApplicationEmails(appId: string): Promise<{ trashed: number }> {
  const { data } = await api.post<{ trashed: number }>(`/emails/trash-application/${appId}`)
  return data
}

// ── Email Client API ──

export interface InboxItem {
  id: string
  gmail_message_id: string
  thread_id: string
  subject: string
  from_address: string
  to_address: string | null
  snippet: string | null
  received_at: string | null
  label: string
  is_read: boolean
  is_job_related: boolean
  intent: string | null
  extracted_company: string | null
  application_id: string | null
}

export interface InboxResponse {
  items: InboxItem[]
  total: number
  page: number
  size: number
}

export async function syncAllEmails(): Promise<{
  new_emails: number
  auto_linked: number
  auto_created: number
  sync_duration_seconds: number
}> {
  const { data } = await api.post("/emails/sync-all")
  return data
}

export async function getInbox(params?: {
  label?: string
  category?: string
  search?: string
  page?: number
  size?: number
}): Promise<InboxResponse> {
  const { data } = await api.get<InboxResponse>("/emails/inbox", { params })
  return data
}

export async function getEmailBody(emailId: string): Promise<{
  body_html: string | null
  body_text: string | null
}> {
  const { data } = await api.get(`/emails/${emailId}/body`)
  return data
}

export async function composeEmail(to: string, subject: string, bodyHtml: string): Promise<void> {
  await api.post("/emails/compose", { to, subject, body_html: bodyHtml })
}

export async function replyToEmail(emailId: string, bodyHtml: string): Promise<void> {
  await api.post(`/emails/${emailId}/reply`, { body_html: bodyHtml })
}

export async function trashEmail(emailId: string): Promise<void> {
  await api.delete(`/emails/${emailId}/trash`)
}

export async function markEmailRead(emailId: string): Promise<void> {
  await api.patch(`/emails/${emailId}/read`)
}

export async function batchEmailAction(
  emailIds: string[],
  action: "mark_read" | "mark_unread" | "trash" | "dismiss"
): Promise<{ affected: number }> {
  const { data } = await api.post<{ affected: number }>("/emails/batch", {
    email_ids: emailIds,
    action,
  })
  return data
}
