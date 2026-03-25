export const STAGES = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const

export type Stage = (typeof STAGES)[number]

export const STAGE_LABELS: Record<Stage, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
}

export const STAGE_COLORS: Record<Stage, string> = {
  saved: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  applied: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  screening: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  interview: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  offer: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  withdrawn: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}
