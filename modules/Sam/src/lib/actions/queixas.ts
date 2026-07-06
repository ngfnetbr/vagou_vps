// @ts-nocheck
import { supabase } from '@sam/integrations/supabase/client'
import { ensureSamStudentFromPrincipal } from '@sam/lib/principalStudents'
import {
  expandComplaintStatusFilter,
  normalizeComplaintStatus,
  normalizeReferralStatus,
  type ComplaintStatus,
  type ReferralStatus,
} from '@sam/lib/complaintsStatus'
import { dispatchWebhookEventGeneric } from '@sam/lib/actions/webhooks'

const SCHOOL_COMPLAINTS_TABLE = 'school_complaints'
const SCHOOL_COMPLAINT_MESSAGES_TABLE = 'school_complaint_messages'

function generateProtocol(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `QE-${year}-${random}`
}

export async function getComplaints(filters?: { schoolId?: string; status?: string;  }) {
  let query: any = supabase
    .from(SCHOOL_COMPLAINTS_TABLE)
    .select('*, students:student_id(full_name), schools:school_id(name), reporter:profiles!school_complaints_reporter_id_fkey(full_name), referral_decider:profiles!school_complaints_referral_decided_by_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (filters?.schoolId) query = query.eq('school_id', filters.schoolId)
  if (filters?.status) {
    const normalized = normalizeComplaintStatus(filters.status) satisfies ComplaintStatus
    const allowed = expandComplaintStatusFilter(normalized)
    if (allowed.length === 1) query = query.eq('status', allowed[0])
    else query = query.in('status', allowed)
  }

  const { data, error } = await query
  if (error) { console.error(error); return [] }
  return data || []
}

export async function getComplaintById(id: string) {
  let query: any = supabase
    .from(SCHOOL_COMPLAINTS_TABLE)
    .select('*, students:student_id(full_name), schools:school_id(name), reporter:profiles!school_complaints_reporter_id_fkey(full_name), referral_decider:profiles!school_complaints_referral_decided_by_fkey(full_name)')
    .eq('id', id)
  const { data } = await query.single()
  return data
}

export async function getComplaintMessages(complaintId: string) {
  const { data } = await supabase
    .from(SCHOOL_COMPLAINT_MESSAGES_TABLE)
    .select('*, profiles(full_name)')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function createComplaint(params: {
  schoolId: string
  studentId: string
  primaryComplaint: string
  symptoms?: string
  impactLearning?: string
  behaviorClassroom?: string
  diagnosisTags?: string[]
  documentUrl?: string
  laudoType?: string
  referralRequested?: boolean
  referralNotes?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const protocol = generateProtocol()

  await ensureSamStudentFromPrincipal(params.studentId, { schoolId: params.schoolId })

  const referralStatus: ReferralStatus = params.referralRequested ? 'requested' : 'none'

  const payloadBase: any = {
      school_id: params.schoolId,
      student_id: params.studentId,
      reporter_id: user.id,
      primary_complaint: params.primaryComplaint,
      symptoms: params.symptoms,
      impact_learning: params.impactLearning,
      behavior_classroom: params.behaviorClassroom,
      diagnosis_tags: params.diagnosisTags,
      protocol,
      status: 'pending' satisfies ComplaintStatus,
      document_url: params.documentUrl,
      laudo_type: params.laudoType,
      referral_requested: params.referralRequested || false,
      referral_notes: params.referralNotes,
    }

  const payloadWithReferralStatus = { ...payloadBase, referral_status: referralStatus }

  let inserted: any
  {
    const { data, error } = await supabase
      .from(SCHOOL_COMPLAINTS_TABLE)
      .insert(payloadWithReferralStatus)
      .select('id, protocol')
      .single()

    if (!error) inserted = data
    else {
      const msg = String((error as any).message || "")
      const code = String((error as any).code || "")
      const missingReferralColumn = code === "42703" || /referral_status/i.test(msg)
      if (!missingReferralColumn) throw error

      const { data: data2, error: error2 } = await supabase
        .from(SCHOOL_COMPLAINTS_TABLE)
        .insert(payloadBase)
        .select('id, protocol')
        .single()
      if (error2) throw error2
      inserted = data2
    }
  }

  dispatchWebhookEventGeneric({
    evento: 'sam.complaint.created',
    payload: {
      evento: 'sam.complaint.created',
      data_evento: new Date().toISOString(),
      queixa: {
        id: inserted.id,
        protocol: inserted.protocol,
        school_id: params.schoolId,
        student_id: params.studentId,
        status: payloadBase.status,
        referral_status: referralStatus,
        primary_complaint: params.primaryComplaint,
        diagnosis_tags: params.diagnosisTags || [],
        document_url: params.documentUrl || null,
        laudo_type: params.laudoType || null,
      },
    },
  }).catch(console.error)

  return inserted
}

export async function updateComplaintStatus(id: string, status: string) {
  const normalized = normalizeComplaintStatus(status) satisfies ComplaintStatus
  const before = await supabase
    .from(SCHOOL_COMPLAINTS_TABLE)
    .select('id, protocol, status, school_id, student_id')
    .eq('id', id)
    .single()

  let query: any = supabase
    .from(SCHOOL_COMPLAINTS_TABLE)
    .update({ status: normalized })
    .eq('id', id)
  const { error } = await query
  if (error) throw error

  dispatchWebhookEventGeneric({
    evento: 'sam.complaint.status_changed',
    payload: {
      evento: 'sam.complaint.status_changed',
      data_evento: new Date().toISOString(),
      queixa: {
        id,
        protocol: (before.data as any)?.protocol,
        school_id: (before.data as any)?.school_id,
        student_id: (before.data as any)?.student_id,
        status_anterior: (before.data as any)?.status,
        status_novo: normalized,
      },
    },
  }).catch(console.error)
}

export async function updateComplaintReferralStatus(id: string, status: ReferralStatus) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const normalized = normalizeReferralStatus(status) satisfies ReferralStatus
  const before = await supabase
    .from(SCHOOL_COMPLAINTS_TABLE)
    .select('id, protocol, referral_status, referral_requested, school_id, student_id')
    .eq('id', id)
    .single()

  const referralRequested = normalized !== 'none'
  const decidedAt = normalized === 'accepted' || normalized === 'rejected' ? new Date().toISOString() : null
  const decidedBy = normalized === 'accepted' || normalized === 'rejected' ? user.id : null

  let query: any = supabase
    .from(SCHOOL_COMPLAINTS_TABLE)
    .update({
      referral_status: normalized,
      referral_requested: referralRequested,
      referral_decided_at: decidedAt,
      referral_decided_by: decidedBy,
    })
    .eq('id', id)
  const { error } = await query
  if (error) {
    const msg = String((error as any).message || "")
    const code = String((error as any).code || "")
    const missingColumns = code === "42703" || /referral_status|referral_decided_at|referral_decided_by/i.test(msg)
    if (missingColumns) {
      throw new Error("Banco não atualizado para o fluxo de encaminhamento. Aplique as migrations do Supabase e tente novamente.")
    }
    throw error
  }

  dispatchWebhookEventGeneric({
    evento: 'sam.complaint.referral_changed',
    payload: {
      evento: 'sam.complaint.referral_changed',
      data_evento: new Date().toISOString(),
      queixa: {
        id,
        protocol: (before.data as any)?.protocol,
        school_id: (before.data as any)?.school_id,
        student_id: (before.data as any)?.student_id,
        referral_status_anterior: (before.data as any)?.referral_status,
        referral_status_novo: normalized,
        decided_at: decidedAt,
        decided_by: decidedBy,
      },
    },
  }).catch(console.error)
}

export async function sendComplaintMessage(complaintId: string, message: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from(SCHOOL_COMPLAINT_MESSAGES_TABLE)
    .insert({
      complaint_id: complaintId,
      sender_id: user.id,
      message,
    })
  if (error) throw error

  const complaint = await supabase
    .from(SCHOOL_COMPLAINTS_TABLE)
    .select('id, protocol, school_id, student_id')
    .eq('id', complaintId)
    .single()

  dispatchWebhookEventGeneric({
    evento: 'sam.complaint.message_created',
    payload: {
      evento: 'sam.complaint.message_created',
      data_evento: new Date().toISOString(),
      queixa: {
        id: complaintId,
        protocol: (complaint.data as any)?.protocol,
        school_id: (complaint.data as any)?.school_id,
        student_id: (complaint.data as any)?.student_id,
      },
      mensagem: {
        sender_id: user.id,
        message: (message || '').substring(0, 5000),
      },
    },
  }).catch(console.error)
}
