// @ts-nocheck
import { supabase } from '@sam/integrations/supabase/client'

const WEBHOOKS_TABLE = 'webhooks'
const WEBHOOK_LOGS_TABLE = 'webhooks_exec_logs'

export type WebhookRow = {
  id: string
    nome: string
  descricao: string | null
  url: string
  metodo: string
  evento: string
  ativo: boolean
  headers: Record<string, string>
  body_template: Record<string, any>
  created_at: string
  updated_at: string
}

export type WebhookInsert = {
  nome: string
  descricao?: string
  url: string
  metodo: string
  evento: string
  ativo?: boolean
  headers?: Record<string, string>
  body_template?: Record<string, any>
}

export const WEBHOOK_EVENTS = [
  { value: 'sam.appointment.created', label: 'SAM · Agendamento Criado' },
  { value: 'sam.appointment.canceled', label: 'SAM · Agendamento Cancelado' },
  { value: 'sam.appointment.rescheduled', label: 'SAM · Agendamento Remarcado' },
  { value: 'sam.appointment.finalized', label: 'SAM · Agendamento Finalizado' },
  { value: 'agendamento_lembrete_24h', label: 'SAM · Lembrete 24h (Amanhã tem consulta)' },
  { value: 'agendamento_lembrete_1h', label: 'SAM · Lembrete 1h (Hoje tem consulta · confirmar presença)' },
  { value: 'sam.appointment.missed', label: 'SAM · Agendamento Marcado como Falta' },
  { value: 'sam.appointment.confirmation.received', label: 'SAM · Confirmação de Presença (Sim/Não)' },
  { value: 'sam.appointment.confirmation.assumed', label: 'SAM · Confirmação Automática (Sem resposta)' },
  { value: 'sam.complaint.created', label: 'SAM · Queixa Criada' },
  { value: 'sam.complaint.status_changed', label: 'SAM · Queixa (Status Alterado)' },
  { value: 'sam.complaint.referral_changed', label: 'SAM · Queixa (Encaminhamento Alterado)' },
  { value: 'sam.complaint.message_created', label: 'SAM · Queixa (Nova Mensagem)' },
  { value: 'sondagem.sondagem.created', label: 'Sondagem · Lançamento Criado' },
  { value: 'sondagem.sondagem.finalized', label: 'Sondagem · Lançamento Finalizado' },
  { value: 'vagou.convocacao_enviada', label: 'Vagou · Convocação Enviada' },
  { value: 'vagou.posicao_fila_alterada', label: 'Vagou · Posição da Fila Alterada' },
] as const

export const TEMPLATE_VARIABLES = [
  '{paciente_nome}',
  '{paciente_telefone}',
  '{data}',
  '{hora}',
  '{data_anterior}',
  '{hora_anterior}',
  '{servico}',
  '{profissional}',
]

export async function getWebhooks(): Promise<WebhookRow[]> {
  const { data, error } = await supabase
    .from(WEBHOOKS_TABLE)
    .select('id, nome, descricao, url, metodo, evento, ativo, headers, body_template, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar webhooks:', error)
    return []
  }
  return (data || []) as WebhookRow[]
}

export async function createWebhook(wh: WebhookInsert) {
  const { error } = await supabase.from(WEBHOOKS_TABLE).insert({
    nome: wh.nome,
    descricao: wh.descricao || null,
    url: wh.url,
    metodo: wh.metodo,
    evento: wh.evento,
    ativo: wh.ativo ?? true,
    headers: wh.headers ?? {},
    body_template: wh.body_template ?? {},
  } as any)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateWebhook(id: string, wh: Partial<WebhookInsert>) {
  const updatePayload: Record<string, any> = {}
  if (wh.nome !== undefined) updatePayload.nome = wh.nome
  if (wh.descricao !== undefined) updatePayload.descricao = wh.descricao
  if (wh.evento !== undefined) updatePayload.evento = wh.evento
  if (wh.url !== undefined) updatePayload.url = wh.url
  if (wh.metodo !== undefined) updatePayload.metodo = wh.metodo
  if (wh.ativo !== undefined) updatePayload.ativo = wh.ativo
  if (wh.headers !== undefined) updatePayload.headers = wh.headers
  if (wh.body_template !== undefined) updatePayload.body_template = wh.body_template
  const { error } = await supabase.from(WEBHOOKS_TABLE).update(updatePayload).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteWebhook(id: string) {
  const { error } = await supabase.from(WEBHOOKS_TABLE).delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function toggleWebhookActive(id: string, ativo: boolean) {
  return updateWebhook(id, { ativo } as any)
}

export async function getWebhookLogs(webhookId?: string) {
  let query = supabase
    .from(WEBHOOK_LOGS_TABLE)
    .select('id, webhook_id, evento, resposta, status_http, executado_em')
    .order('executado_em', { ascending: false })
    .limit(100)

  if (webhookId) query = query.eq('webhook_id', webhookId)

  const [{ data, error }, { data: webhooksData }] = await Promise.all([
    query,
    supabase.from(WEBHOOKS_TABLE).select('id, nome, evento'),
  ])
  if (error) {
    console.error('Erro ao buscar logs:', error)
    return []
  }
  const webhookMap = new Map((webhooksData || []).map((item: any) => [item.id, item.nome || item.evento]))
  return (data || []).map((log: any) => ({
    ...log,
    evento: log.evento || '-',
    webhooks: { nome: webhookMap.get(log.webhook_id) || '-' },
  }))
}

function replaceTemplateVars(template: any, vars: Record<string, string>): any {
  const str = JSON.stringify(template)
  let result = str
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
  }
  return JSON.parse(result)
}

export async function dispatchWebhookEventGeneric(params: {
  evento: string
  payload: any
  vars?: Record<string, string>
}) {
  const { data: webhooks } = await supabase
    .from(WEBHOOKS_TABLE)
    .select('id, nome, url, metodo, evento, ativo, headers, body_template')
    .eq('evento', params.evento)
    .eq('ativo', true)

  if (!webhooks || webhooks.length === 0) return

  for (const wh of webhooks as any[]) {
    const defaultPayload = params.payload
    const bodyTemplate =
      wh.body_template && Object.keys(wh.body_template).length > 0
        ? wh.body_template
        : defaultPayload

    const payload = params.vars ? replaceTemplateVars(bodyTemplate, params.vars) : bodyTemplate
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(wh.headers || {}),
    }

    let statusHttp = 0
    let resposta = ''

    try {
      const response = await fetch(wh.url, {
        method: wh.metodo || 'POST',
        headers,
        body: (wh.metodo || 'POST') === 'POST' ? JSON.stringify(payload) : undefined,
      })
      statusHttp = response.status
      resposta = (await response.text()).substring(0, 1000)
    } catch (err: any) {
      resposta = err.message || 'Network error'
    }

    await supabase.from(WEBHOOK_LOGS_TABLE).insert({
      webhook_id: wh.id,
      evento: params.evento,
      payload_enviado: payload,
      resposta: resposta || null,
      status_http: statusHttp || null,
    } as any)
  }
}

export async function dispatchWebhookEvent(evento: string, agendamentoData: {
  id: string
  data: string
  hora: string
  paciente_nome: string
  paciente_telefone?: string
  data_anterior?: string
  hora_anterior?: string
  servico: string
  profissional: string
}) {
  const vars: Record<string, string> = {
    '{paciente_nome}': agendamentoData.paciente_nome,
    '{paciente_telefone}': agendamentoData.paciente_telefone || '',
    '{data}': agendamentoData.data,
    '{hora}': agendamentoData.hora,
    '{servico}': agendamentoData.servico,
    '{profissional}': agendamentoData.profissional,
  }
  const payload = {
    evento,
    data_evento: new Date().toISOString(),
    agendamento: agendamentoData,
  }
  await dispatchWebhookEventGeneric({ evento, payload, vars })
}

export async function testWebhook(wh: WebhookRow) {
  const samplePayload = {
    evento: wh.evento,
    data_evento: new Date().toISOString(),
    agendamento: {
      id: '00000000-0000-0000-0000-000000000000',
      data: '2026-03-10',
      hora: '14:00',
      paciente_nome: 'João da Silva (TESTE)',
      paciente_telefone: '44999999999',
      servico: 'Consulta',
      profissional: 'Dr. Carlos',
    },
  }

  const vars: Record<string, string> = {
    '{paciente_nome}': 'João da Silva (TESTE)',
    '{paciente_telefone}': '44999999999',
    '{data}': '2026-03-10',
    '{hora}': '14:00',
    '{servico}': 'Consulta',
    '{profissional}': 'Dr. Carlos',
  }

  const payload = replaceTemplateVars(samplePayload, vars)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  try {
    const startedAt = Date.now()
    const response = await fetch(wh.url, {
      method: wh.metodo,
      headers,
      body: wh.metodo === 'POST' ? JSON.stringify(payload) : undefined,
    })

    const resposta = (await response.text()).substring(0, 500)

    await supabase.from(WEBHOOK_LOGS_TABLE).insert({
      webhook_id: wh.id,
      evento: wh.evento,
      payload_enviado: payload,
      resposta,
      status_http: response.status,
    } as any)

    return { success: response.ok, status: response.status, resposta }
  } catch (err: any) {
    return { success: false, status: 0, resposta: err.message }
  }
}
