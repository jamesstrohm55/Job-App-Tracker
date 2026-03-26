import api from "@/api/client"
import type { Contact } from "@/types"

export interface ContactCreate {
  name: string
  email?: string | null
  phone?: string | null
  role?: string | null
  company?: string | null
  linkedin_url?: string | null
  notes?: string | null
}

export type ContactUpdate = Partial<ContactCreate>

export interface ContactListResponse {
  items: Contact[]
  total: number
}

export async function createContact(data: ContactCreate): Promise<Contact> {
  const { data: contact } = await api.post<Contact>("/contacts", data)
  return contact
}

export async function listContacts(params?: {
  search?: string
  company?: string
}): Promise<ContactListResponse> {
  const { data } = await api.get<ContactListResponse>("/contacts", { params })
  return data
}

export async function getContact(id: string): Promise<Contact> {
  const { data } = await api.get<Contact>(`/contacts/${id}`)
  return data
}

export async function updateContact(id: string, data: ContactUpdate): Promise<Contact> {
  const { data: contact } = await api.put<Contact>(`/contacts/${id}`, data)
  return contact
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`)
}

export async function getApplicationContacts(appId: string): Promise<Contact[]> {
  const { data } = await api.get<Contact[]>(`/applications/${appId}/contacts`)
  return data
}

export async function linkContact(appId: string, contactId: string): Promise<void> {
  await api.post(`/applications/${appId}/contacts/${contactId}`)
}

export async function unlinkContact(appId: string, contactId: string): Promise<void> {
  await api.delete(`/applications/${appId}/contacts/${contactId}`)
}
