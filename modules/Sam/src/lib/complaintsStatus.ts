// @ts-nocheck
export type ComplaintStatus = "pending" | "in_review" | "scheduled" | "completed" | "rejected"

export type ReferralStatus = "none" | "requested" | "accepted" | "rejected"

export function normalizeComplaintStatus(input: string | null | undefined): ComplaintStatus {
  const v = (input || "").toLowerCase().trim()

  if (v === "pending") return "pending"
  if (v === "in_review") return "in_review"
  if (v === "scheduled") return "scheduled"
  if (v === "completed") return "completed"
  if (v === "rejected") return "rejected"

  if (v === "analyzing") return "in_review"
  if (v === "in_progress") return "in_review"
  if (v === "resolved") return "completed"
  if (v === "closed") return "completed"

  return "pending"
}

export function getComplaintStatusLabel(status: ComplaintStatus): string {
  if (status === "pending") return "Pendente"
  if (status === "in_review") return "Em Análise"
  if (status === "scheduled") return "Agendado"
  if (status === "completed") return "Concluído"
  return "Rejeitado"
}

export function getComplaintStatusVariant(
  status: ComplaintStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "pending") return "destructive"
  if (status === "in_review") return "default"
  if (status === "scheduled") return "secondary"
  if (status === "completed") return "outline"
  return "destructive"
}

export function expandComplaintStatusFilter(status: ComplaintStatus): string[] {
  if (status === "in_review") return ["in_review", "analyzing", "in_progress"]
  if (status === "completed") return ["completed", "resolved", "closed"]
  return [status]
}

export function normalizeReferralStatus(input: string | null | undefined, fallbackRequested?: boolean): ReferralStatus {
  const v = (input || "").toLowerCase().trim()

  if (v === "none") return "none"
  if (v === "requested") return "requested"
  if (v === "accepted") return "accepted"
  if (v === "rejected") return "rejected"

  if (fallbackRequested) return "requested"
  return "none"
}

export function getReferralStatusLabel(status: ReferralStatus): string {
  if (status === "none") return "Não"
  if (status === "requested") return "Solicitado"
  if (status === "accepted") return "Aceito"
  return "Rejeitado"
}

export function getReferralStatusVariant(status: ReferralStatus): "default" | "secondary" | "outline" | "destructive" {
  if (status === "accepted") return "default"
  if (status === "requested") return "secondary"
  if (status === "rejected") return "destructive"
  return "outline"
}
