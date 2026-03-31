import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  confirmRejection,
  connectGmail,
  dismissEmail,
  disconnectGmail,
  getEmailSuggestions,
  getGmailStatus,
  getPendingActions,
  linkEmail,
  listEmails,
  syncAllEmails,
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

export function usePendingActions() {
  return useQuery({
    queryKey: ["pending-actions"],
    queryFn: getPendingActions,
  })
}

export function useDismissEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (emailId: string) => dismissEmail(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-actions"] })
      queryClient.invalidateQueries({ queryKey: ["emails"] })
    },
  })
}

export function useConfirmRejection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ emailId, applicationId }: { emailId: string; applicationId: string }) =>
      confirmRejection(emailId, applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-actions"] })
      queryClient.invalidateQueries({ queryKey: ["board"] })
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      toast.success("Application moved to rejected")
    },
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
    mutationFn: () => syncAllEmails(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] })
      queryClient.invalidateQueries({ queryKey: ["email-suggestions"] })
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
      queryClient.invalidateQueries({ queryKey: ["pending-actions"] })
      queryClient.invalidateQueries({ queryKey: ["board"] })
      queryClient.invalidateQueries({ queryKey: ["applications"] })
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
      queryClient.invalidateQueries({ queryKey: ["pending-actions"] })
    },
  })
}

export function useUnlinkEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (emailId: string) => unlinkEmail(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] })
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
