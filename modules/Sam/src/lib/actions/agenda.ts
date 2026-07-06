// @ts-nocheck
import { supabase } from '@sam/integrations/supabase/client'
import { registerAuditLog } from '@sam/lib/audit'
import { dispatchWebhookEvent } from '@sam/lib/actions/webhooks'
import { ensureSamStudentFromPrincipal } from '@sam/lib/principalStudents'

const APPOINTMENTS_TABLE = 'appointments'

type AgendaAppointment = {
  id: string
  studentId: string | null
  professionalId: string | null
  date: string
  time: string
  duration: string
  student: string
  professional: string
  school: string
  type: string
  status: string
}

export async function createAgendaAppointment(formData: FormData) {
  const student_id = formData.get('student_id') as string
  const professional_id = formData.get('professional_id') as string
  const type = formData.get('type') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const duration = formData.get('duration') as string
  const observations = formData.get('observations') as string

  const dateTimeString = `${date}T${time}:00`

  const durationMinutes = (() => {
    const n = parseInt(duration || '', 10)
    return Number.isFinite(n) && n > 0 ? n : 45
  })()

  try {
    await ensureSamStudentFromPrincipal(student_id)
  } catch (ensureError) {
    console.error('Error auto-creating student from principal:', ensureError)
    return { error: 'Erro ao sincronizar aluno a partir do sistema principal.' }
  }

  const { data: appointment, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .insert({
      student_id,
      professional_id: professional_id || null,
      type,
      date: dateTimeString,
      duration_minutes: durationMinutes,
      description: observations || null,
      status: 'scheduled'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating appointment:', error)
    return { error: 'Erro ao criar agendamento. Tente novamente.' }
  }

  await registerAuditLog('CREATE', 'Agendamentos', {
    id: appointment.id,
    student_id,
    date: dateTimeString,
    type
  })

  // Dispatch webhook
  const { data: studentData } = await supabase.from('students').select('full_name, guardian_name, guardian_phone').eq('id', student_id).single()
  const { data: profData } = await supabase.from('profiles').select('*').eq('id', professional_id).single()
  
  const payload = {
    id: appointment.id,
    data: date,
    hora: time,
    paciente_nome: studentData?.full_name || 'Aluno',
    paciente_telefone: studentData?.guardian_phone || undefined,
    servico: type,
    profissional: profData?.nome_completo || profData?.full_name || profData?.nome || 'Profissional',
  }
  dispatchWebhookEvent('agendamento_criado', payload).catch(console.error)
  dispatchWebhookEvent('sam.appointment.created', payload).catch(console.error)

  return { success: true }
}

export async function getAgendaAppointments(): Promise<AgendaAppointment[]> {
  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .select('id, date, duration_minutes, type, status, student_id, professional_id, students(full_name, school_id)')
    .eq('status', 'scheduled')
    .order('date', { ascending: true })

  if (error || !data) {
    console.error('Erro ao buscar agendamentos para agenda:', error)
    return []
  }

  const schoolIds = Array.from(
    new Set(
      data
        .map((a: any) => a.students?.school_id as string | null)
        .filter((id): id is string => !!id)
    )
  )

  const professionalIds = Array.from(
    new Set(
      data
        .map((a: any) => a.professional_id as string | null)
        .filter((id): id is string => !!id)
    )
  )

  const [schoolsResult, professionalsResult] = await Promise.all([
    schoolIds.length
      ? supabase.from('schools').select('id, name').in('id', schoolIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    professionalIds.length
      ? supabase.from('profiles').select('*').in('id', professionalIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const schoolsMap = new Map<string, string>(
    (schoolsResult.data || []).map((s: any) => [s.id, s.name])
  )

  const professionalsMap = new Map<string, string>(
    (professionalsResult.data || []).map((p: any) => [p.id, p.nome_completo || p.full_name || p.nome || 'Profissional'])
  )

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes || minutes <= 0) return ''
    if (minutes % 60 === 0) return `${minutes / 60}h`
    return `${minutes}min`
  }

  return data.map((a: any) => {
    const iso = a.date as string
    const time = iso?.substring(11, 16) || ''
    const duration = formatDuration(a.duration_minutes)

    const studentName = a.students?.full_name
    const schoolId = a.students?.school_id
    const schoolName = schoolId ? schoolsMap.get(schoolId) : undefined
    const professionalId = a.professional_id
    const professionalName = professionalId ? professionalsMap.get(professionalId) : undefined

    return {
      id: a.id,
      studentId: a.student_id || null,
      professionalId: a.professional_id || null,
      date: iso,
      time,
      duration,
      student: studentName || 'Aluno',
      professional: professionalName || 'Profissional',
      school: schoolName || 'Escola',
      type: a.type,
      status: a.status,
    }
  })
}

export async function cancelAppointment(appointmentId: string, reason?: string) {
  try {
    const { data: appointment, error: fetchError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .select('id, date, type, student_id, professional_id, students(full_name, guardian_phone), profiles:professional_id(full_name)')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Agendamento não encontrado.' }
    }

    const { error: updateError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)

    if (updateError) {
        const { error: deleteError } = await supabase
        .from(APPOINTMENTS_TABLE)
        .delete()
        .eq('id', appointmentId)

      if (deleteError) {
        return { success: false, error: 'Erro ao cancelar agendamento.' }
      }
    }

    await registerAuditLog('DELETE', 'Agendamentos', {
      id: appointmentId,
      student: (appointment as any).students?.full_name,
      date: appointment.date,
      reason
    })

    // Dispatch cancel webhook
    const dateStr = appointment.date?.substring(0, 10) || ''
    const timeStr = appointment.date?.substring(11, 16) || ''
    const payload = {
      id: appointmentId,
      data: dateStr,
      hora: timeStr,
      paciente_nome: (appointment as any).students?.full_name || 'Aluno',
      paciente_telefone: (appointment as any).students?.guardian_phone || undefined,
      servico: appointment.type,
      profissional: (appointment as any).profiles?.full_name || 'Profissional',
    }
    dispatchWebhookEvent('agendamento_cancelado', payload).catch(console.error)
    dispatchWebhookEvent('sam.appointment.canceled', payload).catch(console.error)

    return { success: true }
  } catch (error) {
    console.error('Error canceling appointment:', error)
    return { success: false, error: 'Erro interno ao cancelar.' }
  }
}

export async function rescheduleAppointment(appointmentId: string, newDate: string, newTime: string) {
  try {
    const dateTimeString = `${newDate}T${newTime}:00`

    const { data: appointment, error: fetchError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .select('id, date, type, student_id, professional_id, students(full_name, guardian_phone), profiles:professional_id(full_name)')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Agendamento não encontrado.' }
    }

    const { error: updateError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .update({
        date: dateTimeString,
        status: 'scheduled'
      })
      .eq('id', appointmentId)

    if (updateError) {
      return { success: false, error: 'Erro ao reagendar.' }
    }

    await registerAuditLog('UPDATE', 'Agendamentos', {
      id: appointmentId,
      student: (appointment as any).students?.full_name,
      old_date: appointment.date,
      new_date: dateTimeString
    })

    const oldDateStr = appointment.date?.substring(0, 10) || ''
    const oldTimeStr = appointment.date?.substring(11, 16) || ''
    const payload = {
      id: appointmentId,
      data: newDate,
      hora: newTime,
      data_anterior: oldDateStr,
      hora_anterior: oldTimeStr,
      paciente_nome: (appointment as any).students?.full_name || 'Aluno',
      paciente_telefone: (appointment as any).students?.guardian_phone || undefined,
      servico: appointment.type,
      profissional: (appointment as any).profiles?.full_name || 'Profissional',
    }
    dispatchWebhookEvent('agendamento_remarcado', payload).catch(console.error)
    dispatchWebhookEvent('sam.appointment.rescheduled', payload).catch(console.error)

    return { success: true }
  } catch (error) {
    console.error('Error rescheduling:', error)
    return { success: false, error: 'Erro interno ao reagendar.' }
  }
}

export async function markAppointmentMissed(appointmentId: string) {
  try {
    const { data: appointment, error: fetchError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .select('id, date, type, students(full_name, guardian_phone), profiles:professional_id(full_name)')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Agendamento não encontrado.' }
    }

    const { error: updateError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .update({ status: 'missed' })
      .eq('id', appointmentId)

    if (updateError) {
      return { success: false, error: 'Erro ao marcar falta.' }
    }

    await registerAuditLog('UPDATE', 'Agendamentos', {
      id: appointmentId,
      status: 'missed',
    })

    const dateStr = (appointment as any).date?.substring(0, 10) || ''
    const timeStr = (appointment as any).date?.substring(11, 16) || ''
    const payload = {
      id: appointmentId,
      data: dateStr,
      hora: timeStr,
      paciente_nome: (appointment as any).students?.full_name || 'Aluno',
      paciente_telefone: (appointment as any).students?.guardian_phone || undefined,
      servico: (appointment as any).type || '',
      profissional: (appointment as any).profiles?.full_name || 'Profissional',
    }
    dispatchWebhookEvent('sam.appointment.missed', payload).catch(console.error)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cancelAppointmentsByProfessional(params: { professionalId: string; startDate: string; endDate: string; reason?: string }) {
  const { professionalId, startDate, endDate, reason } = params

  try {
    const startIso = `${startDate}T00:00:00.000Z`
    const endIso = `${endDate}T23:59:59.999Z`

    const { data: appointments, error: fetchError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .select('id, date, type, students(full_name, guardian_phone), profiles:professional_id(full_name)')
      .eq('professional_id', professionalId)
      .eq('status', 'scheduled')
      .gte('date', startIso)
      .lte('date', endIso)

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    const ids = (appointments || []).map((a: any) => a.id)
    if (ids.length === 0) return { success: true, cancelled: 0 }

    const { error: updateError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .update({ status: 'cancelled' })
      .in('id', ids)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    await registerAuditLog('UPDATE', 'Agendamentos', {
      professional_id: professionalId,
      cancelled_count: ids.length,
      startDate,
      endDate,
      reason,
    })

    for (const appt of appointments as any[]) {
      const dateStr = appt.date?.substring(0, 10) || ''
      const timeStr = appt.date?.substring(11, 16) || ''
      const payload = {
        id: appt.id,
        data: dateStr,
        hora: timeStr,
        paciente_nome: appt.students?.full_name || 'Aluno',
        paciente_telefone: appt.students?.guardian_phone || undefined,
        servico: appt.type || '',
        profissional: appt.profiles?.full_name || 'Profissional',
      }
      dispatchWebhookEvent('sam.appointment.canceled', payload).catch(console.error)
    }

    return { success: true, cancelled: ids.length }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Inicia um atendimento: marca como "em andamento" e registra o horário de início.
// Resiliente caso a coluna started_at ainda não exista no banco.
export async function startAppointment(appointmentId: string) {
  try {
    const { data: appointment, error: fetchError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .select('id, status')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Agendamento não encontrado.' }
    }

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return { success: false, error: 'Este atendimento não pode ser iniciado.' }
    }

    const nowIso = new Date().toISOString()

    // Tenta atualizar status + started_at
    let { error: updateError } = await supabase
      .from(APPOINTMENTS_TABLE)
      .update({ status: 'in_progress', started_at: nowIso })
      .eq('id', appointmentId)

    // Fallback caso a coluna started_at não exista
    if (updateError) {
      console.error('startAppointment: update status+started_at failed:', updateError)
      const retry = await supabase
        .from(APPOINTMENTS_TABLE)
        .update({ status: 'in_progress' })
        .eq('id', appointmentId)
      updateError = retry.error
    }

    // Fallback caso o status "in_progress" não exista no enum: grava só started_at
    if (updateError) {
      console.error('startAppointment: update status in_progress failed:', updateError)
      const retry2 = await supabase
        .from(APPOINTMENTS_TABLE)
        .update({ started_at: nowIso })
        .eq('id', appointmentId)
      updateError = retry2.error
    }

    if (updateError) {
      console.error('startAppointment: final update failed:', updateError)
      return { success: false, error: updateError.message || 'Erro ao iniciar o atendimento.' }
    }

    await registerAuditLog('UPDATE', 'Agendamentos', {
      id: appointmentId,
      status: 'in_progress',
      started_at: nowIso,
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro interno ao iniciar.' }
  }
}
