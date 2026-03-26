import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  connectGmail,
  disconnectGmail,
  getEmailSuggestions,
  getGmailStatus,
  linkEmail,
  listEmails,
  syncEmails,
  unlinkEmail,
} from "@/api/emails"

export function useGmailStatus() {
  return useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  })
}

export function useEmails(params?: {
  linked?: boolean
  application_id?: string
  page?: number
  size?: number
}) {
  return useQuery({
    queryKey: ["emails", params],
    queryFn: () => listEmails(params),
  })
}

export function useEmailSuggestions() {
  return useQuery({
    queryKey: ["email-suggestions"],
    queryFn: getEmailSuggestions,
  })
}

export function useConnectGmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => connectGmail(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
    },
  })
}

export function useDisconnectGmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => disconnectGmail(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
    },
  })
}

export function useSyncEmails() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => syncEmails(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      queryClient.invalidateQueries({ queryKey: ["email-suggestions"] })
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
      // Sync may auto-create apps and update stages
      queryClient.invalidateQueries({ queryKey: ["board"] })
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
      queryClient.invalidateQueries({ queryKey: ["timeline"] })
    },
  })
}

export function useLinkEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ emailId, applicationId }: { emailId: string; applicationId: string }) =>
      linkEmail(emailId, applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      queryClient.invalidateQueries({ queryKey: ["email-suggestions"] })
    },
  })
}

export function useUnlinkEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (emailId: string) => unlinkEmail(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      queryClient.invalidateQueries({ queryKey: ["email-suggestions"] })
    },
  })
}
