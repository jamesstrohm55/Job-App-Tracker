import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  connectGmail,
  disconnectGmail,
  getEmailSuggestions,
  getGmailStatus,
  linkEmail,
  listEmails,
  syncEmails,
  trashApplicationEmails,
  trashRejectionEmails,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      queryClient.invalidateQueries({ queryKey: ["email-suggestions"] })
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
      queryClient.invalidateQueries({ queryKey: ["board"] })
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
      queryClient.invalidateQueries({ queryKey: ["timeline"] })

      if (data.llm_failures > 0) {
        toast.warning(
          `LLM classification failed for ${data.llm_failures} email(s) — used rules fallback. Try syncing again in a minute.`
        )
      }
    },
    onError: () => toast.error("Sync failed. Is Gmail connected?"),
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

export function useTrashApplicationEmails() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appId: string) => trashApplicationEmails(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
    },
  })
}

export function useTrashRejectionEmails() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => trashRejectionEmails(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
    },
  })
}
