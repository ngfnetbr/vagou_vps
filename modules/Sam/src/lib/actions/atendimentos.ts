import { supabase } from '@sam/integrations/supabase/client'
import { dispatchWebhookEvent } from '@sam/lib/actions/webhooks'

export async function checkFirstVisit(studentId: string, professionalId: string): Promise<boolean> {
  const { count } = await supabase
    .from('appointment_records')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('professional_id', professionalId)

  return (count || 0) === 0
}

export async function getStudentAnamnesis(studentId: string, professionalId: string) {
  const { data } = await supabase
    .from('appointment_records')
    .select('anamnesis_data, specialty, created_at, profiles(full_name)')
    .eq('student_id', studentId)
    .eq('professional_id', professionalId)
    .eq('is_first_visit', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

export async function getStudentRecords(studentId: string) {
  const { data } = await supabase
    .from('appointment_records')
    .select('*, profiles(full_name, registration_number)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  return data || []
}

export async function createAppointmentRecord(params: {
  appointmentId: string
  studentId: string
  professionalId: string
  specialty: string
  registrationNumber: string
  isFirstVisit: boolean
  anamnesisData: Record<string, any>
  summary: string
  returnDate: string | null
}) {
  const { data, error } = await supabase
    .from('appointment_records')
    .insert({
      appointment_id: params.appointmentId,
      student_id: params.studentId,
      professional_id: params.professionalId,
      specialty: params.specialty,
      registration_number: params.registrationNumber,
      is_first_visit: params.isFirstVisit,
      anamnesis_data: params.anamnesisData,
      summary: params.summary,
      return_date: params.returnDate || null,
    })
    .select('id')
    .single()

  if (error) throw error

  // If return_date is set, auto-create an agenda appointment
  if (params.returnDate) {
    await supabase.from('appointments').insert({
      student_id: params.studentId,
      professional_id: params.professionalId,
      date: new Date(params.returnDate).toISOString(),
      type: params.specialty,
      description: 'Retorno agendado automaticamente',
      status: 'scheduled',
    })
  }

  return data
}

export async function createAppointment(formData: FormData) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Usuário não autenticado.' }
  }

  const appointment_id = (formData.get('appointment_id') as string) || ''
  const student_id = formData.get('student_id') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const duration_minutes = formData.get('duration_minutes') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const evolution = formData.get('evolution') as string
  const action_plan = formData.get('action_plan') as string
  const document = formData.get('document') as File

  const noteFieldNames = [
    'anamnese', 'avaliacao_especifica', 'observacoes_comportamentais', 'historico_escolar',
    'desenvolvimento_neuropsicomotor', 'aspectos_comunicativos', 'aspectos_emocionais', 'aspectos_sociais',
    'psicope_queixa', 'psicope_queixa_detalhamento', 'psicope_hist_gestacao_planejamento',
    'psicope_hist_gestacao_intercorrencias', 'psicope_hist_gestacao_medicacoes', 'psicope_hist_parto_tipo',
    'psicope_hist_parto_idade_gestacional', 'psicope_hist_peso_nascer', 'psicope_hist_apgar',
    'psicope_hist_complicacoes_neonatais', 'psicope_desenvol_sentou_idade', 'psicope_desenvol_engatinhou_idade',
    'psicope_desenvol_andou_idade', 'psicope_desenvol_esfincteriano', 'psicope_desenvol_linguagem_primeiras_palavras',
    'psicope_desenvol_linguagem_frases', 'psicope_desenvol_atrasos_regressoes', 'psicope_escolar_idade_ingresso',
    'psicope_escolar_reprovacoes', 'psicope_escolar_transferencias', 'psicope_escolar_rendimento',
    'psicope_escolar_dificuldades_leitura', 'psicope_escolar_dificuldades_escrita',
    'psicope_escolar_dificuldades_interpretacao', 'psicope_escolar_dificuldades_matematica',
    'psicope_escolar_dificuldades_atencao_organizacao', 'psicope_escolar_reforco_atendimento_especializado',
    'psicope_cognitivo_atencao', 'psicope_cognitivo_memoria_operacional', 'psicope_cognitivo_organizacao',
    'psicope_cognitivo_autonomia', 'psicope_comportamental_tolerancia_frustracao',
    'psicope_comportamental_relacionamento_interpessoal', 'psicope_comportamental_comportamento_escolar',
    'psicope_comportamental_postura_academica', 'psicope_familiar_composicao', 'psicope_familiar_dinamica',
    'psicope_familiar_rotina_diaria', 'psicope_familiar_acompanhamento_escolar',
    'psicope_familiar_praticas_educativas', 'psicope_familiar_eventos_estressores',
    'psicope_observacoes_tecnicas', 'psico_queixa', 'psico_queixa_e_prejuizos',
    'psico_hist_psicologico_psicoterapia', 'psico_hist_psicologico_diagnosticos',
    'psico_hist_psicologico_psicofarmacos', 'psico_hist_psicologico_internacoes',
    'psico_hist_psicologico_acompanhamento_medico', 'psico_hist_familiar_dinamica',
    'psico_hist_familiar_vinculos', 'psico_hist_familiar_eventos_traumaticos',
    'psico_hist_familiar_transtornos_mentais', 'psico_relacionamentos_vinculos_afetivos',
    'psico_relacionamentos_suporte_social', 'psico_relacionamentos_padroes_dificuldades',
    'psico_vida_acad_prof_desempenho', 'psico_vida_acad_prof_satisfacao_estresse',
    'psico_vida_acad_prof_conflitos_afastamentos', 'psico_saude_doencas_clinicas',
    'psico_saude_medicacoes', 'psico_saude_sono', 'psico_saude_alimentacao',
    'psico_saude_atividade_fisica', 'psico_saude_substancias', 'psico_estado_emocional_humor',
    'psico_estado_emocional_ansiedade_irritabilidade', 'psico_estado_emocional_pensamentos_crencas',
    'psico_estado_emocional_apetite_sono', 'psico_risco_ideacao_suicida', 'psico_risco_plano_tentativa',
    'psico_risco_automutilacao', 'psico_impressao_clinica_plano', 'fono_queixa',
    'fono_queixa_tempo_e_impacto', 'fono_hist_gestacao_intercorrencias',
    'fono_hist_gestacao_substancias_medicamentos', 'fono_hist_parto_tipo', 'fono_hist_prematuridade',
    'fono_hist_peso_nascer', 'fono_hist_uti_neonatal', 'fono_desenvol_vocalizacoes_idade',
    'fono_desenvol_primeiras_palavras_idade', 'fono_desenvol_frases_idade',
    'fono_desenvol_compreensao_verbal', 'fono_desenvol_fonologia_trocas_omissoes',
    'fono_desenvol_inteligibilidade_fala', 'fono_desenvol_disfluencia',
    'fono_hist_auditivo_triagem_neonatal', 'fono_hist_auditivo_exames',
    'fono_hist_auditivo_otites_recorrentes', 'fono_hist_auditivo_suspeita_perda',
    'fono_hist_auditivo_protese', 'fono_motricidade_amamentacao', 'fono_motricidade_chupeta_mamadeira',
    'fono_motricidade_respiracao', 'fono_motricidade_mastigacao', 'fono_motricidade_degluticao',
    'fono_motricidade_bruxismo', 'fono_motricidade_habitos_orais', 'fono_escolar_dificuldades_leitura',
    'fono_escolar_dificuldades_escrita', 'fono_escolar_consciencia_fonologica',
    'fono_escolar_relato_escolar', 'fono_escolar_impacto_academico', 'fono_impressao_clinica_inicial'
  ]

  if (!student_id || !date || !type || !description) {
    return { error: 'Preencha todos os campos obrigatórios.' }
  }

  const dateIso = (() => {
    if (date && time) return new Date(`${date}T${time}:00`).toISOString()
    return new Date(date).toISOString()
  })()

  let document_url = null

  if (document && document.size > 0) {
    const fileExt = document.name.split('.').pop()
    const fileName = `${student_id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, document)

    if (uploadError) {
      console.error('Error uploading document:', uploadError)
      return { error: 'Erro ao fazer upload do documento.' }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    document_url = publicUrl
  }

  const durationParsed = parseInt(duration_minutes) || 30

  const upserted = appointment_id
    ? await supabase
        .from('appointments')
        .update({
          date: dateIso,
          duration_minutes: durationParsed,
          type,
          description,
          evolution,
          action_plan,
          status: 'completed',
          ...(document_url ? { document_url } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment_id)
        .select('id, date, student_id, professional_id, type')
        .single()
    : await supabase
        .from('appointments')
        .insert({
          student_id,
          professional_id: user.id,
          date: dateIso,
          duration_minutes: durationParsed,
          type,
          description,
          evolution,
          action_plan,
          status: 'completed',
          document_url
        })
        .select('id, date, student_id, professional_id, type')
        .single()

  if (upserted.error) {
    console.error('Error creating/updating appointment:', upserted.error)
    return { error: 'Erro ao registrar atendimento. Tente novamente.' }
  }

  const appointmentId = (upserted.data as any).id as string

  const notesData: Record<string, string | null> = {}
  let hasNotes = false
  for (const field of noteFieldNames) {
    const val = formData.get(field) as string | null
    notesData[field] = val || null
    if (val) hasNotes = true
  }

  if (hasNotes) {
    const { error: notesError } = await supabase.from('appointment_specialty_notes').insert({
      appointment_id: appointmentId,
      ...notesData
    })

    if (notesError) {
      console.error('Error creating specialty notes:', notesError)
    }
  }

  const dateStr = (upserted.data as any).date?.substring(0, 10) || ''
  const timeStr = (upserted.data as any).date?.substring(11, 16) || ''
  const [{ data: studentData }, { data: profData }] = await Promise.all([
    supabase.from('students').select('full_name, guardian_name').eq('id', (upserted.data as any).student_id).single(),
    supabase.from('profiles').select('full_name').eq('id', (upserted.data as any).professional_id).single(),
  ])

  const payload = {
    id: appointmentId,
    data: dateStr,
    hora: timeStr,
    paciente_nome: studentData?.full_name || 'Aluno',
    servico: (upserted.data as any).type || type,
    profissional: profData?.full_name || 'Profissional',
  }
  dispatchWebhookEvent('sam.appointment.finalized', payload).catch(console.error)
  dispatchWebhookEvent('agendamento_finalizado', payload).catch(console.error)

  return { success: true, appointmentId, studentId: student_id }
}
