import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createContact,
  deleteContact,
  getApplicationContacts,
  linkContact,
  listContacts,
  unlinkContact,
  updateContact,
  type ContactCreate,
  type ContactUpdate,
} from "@/api/contacts"

export function useContacts(params?: { search?: string; company?: string }) {
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: () => listContacts(params),
  })
}

export function useApplicationContacts(appId: string) {
  return useQuery({
    queryKey: ["application-contacts", appId],
    queryFn: () => getApplicationContacts(appId),
    enabled: !!appId,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ContactCreate) => createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdate }) => updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      queryClient.invalidateQueries({ queryKey: ["application-contacts"] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      queryClient.invalidateQueries({ queryKey: ["application-contacts"] })
    },
  })
}

export function useLinkContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ appId, contactId }: { appId: string; contactId: string }) =>
      linkContact(appId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application-contacts"] })
    },
  })
}

export function useUnlinkContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ appId, contactId }: { appId: string; contactId: string }) =>
      unlinkContact(appId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application-contacts"] })
    },
  })
}
