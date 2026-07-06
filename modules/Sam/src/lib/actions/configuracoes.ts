// @ts-nocheck
import { supabase } from '@sam/integrations/supabase/client'
import { z } from 'zod'
import { createAuditLog } from '@sam/lib/actions/auditoria'

const integrationSchema = z.object({
  api_key: z.string().min(1, "Chave de API é obrigatória"),
  webhook_url: z.string().url("URL do Webhook inválida"),
  is_active: z.boolean(),
  settings: z.object({
    templates: z.object({
      appointment_confirmed: z.string(),
      appointment_reminder: z.string(),
      reschedule_request: z.string(),
    }),
    triggers: z.object({
      appointment_confirmed: z.boolean(),
      appointment_reminder: z.boolean(),
      reschedule_request: z.boolean(),
    }),
    schedule: z.object({
      active_hours_start: z.string(),
      active_hours_end: z.string(),
    }),
    recipients: z.object({
      student: z.boolean(),
      professional: z.boolean(),
      admin_copy_email: z.string().optional().or(z.literal('')),
    }),
    retry: z.object({
      enabled: z.boolean(),
      max_attempts: z.number().min(1).max(5),
    }),
    logs_enabled: z.boolean(),
  })
})

export type IntegrationConfigData = z.infer<typeof integrationSchema>

export async function getIntegrationConfig() {
  const { data, error } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('provider', 'make_zapi')
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar configurações:', JSON.stringify(error, null, 2))
    return null
  }

  return data
}

export async function saveIntegrationConfig(data: IntegrationConfigData) {
  const result = integrationSchema.safeParse(data)
  if (!result.success) {
    return { success: false, error: 'Dados inválidos: ' + result.error.errors[0].message }
  }

  const { error } = await supabase
    .from('integration_configs')
    .upsert({
      provider: 'make_zapi',
      name: 'Integração Make/Zapi',
      api_key: data.api_key,
      webhook_url: data.webhook_url,
      is_active: data.is_active,
      settings: data.settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'provider' })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

const institutionSchema = z.object({
  institution_name: z.string().min(1, "Nome da instituição é obrigatório"),
  logo_url: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal('')),
})

export type InstitutionSettingsData = z.infer<typeof institutionSchema>

export async function getInstitutionSettings() {
  const { data, error } = await supabase
    .from('institution_settings')
    .select('*')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar configurações da instituição:', error)
    return null
  }

  return data
}

export async function updateInstitutionSettings(data: InstitutionSettingsData) {
  const result = institutionSchema.safeParse(data)
  if (!result.success) {
    return { success: false, error: 'Dados inválidos: ' + result.error.errors[0].message }
  }

  const { data: existing } = await supabase
    .from('institution_settings')
    .select('id')
    .single()

  let error;

  if (existing) {
    const { error: updateError } = await supabase
      .from('institution_settings')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
    error = updateError
  } else {
    const { error: insertError } = await supabase
      .from('institution_settings')
      .insert({
        ...data,
        updated_at: new Date().toISOString()
      })
    error = insertError
  }

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function syncCriancasCache(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('Iniciando sincronização via Edge Function sync-criancas...')

    const { data, error } = await supabase.functions.invoke('sync-criancas', {
      method: 'POST'
    })

    if (error) {
      console.error('Erro ao chamar Edge Function:', error)
      const detail = error.message
      return {
        success: false,
        error: `Erro na Edge Function: ${detail}. Verifique se a função está implantada.`
      }
    }

    console.log('Sincronização concluída com sucesso:', data)

    await createAuditLog({
      action: 'SYNC_CRIANCAS',
      resource: 'criancas_cache',
      details: {
        timestamp: new Date().toISOString(),
        result: data
      }
    })

    return { success: true, data }
  } catch (err: any) {
    console.error('Erro inesperado na sincronização:', err)
    return {
      success: false,
      error: `Erro inesperado: ${err.message}`
    }
  }
}

export async function testIntegrationConnection(webhookUrl: string) {
  if (!webhookUrl) return { success: false, error: 'URL não fornecida' }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Connection': 'true'
      },
      body: JSON.stringify({
        event: 'test_connection',
        timestamp: new Date().toISOString(),
        message: 'Teste de integração SAM System'
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { success: true, status: response.status }
    } else {
      return { success: false, error: `Erro HTTP: ${response.status} ${response.statusText}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro de conexão' }
  }
}

const smtpSchema = z.object({
  host: z.string().min(1, "Host é obrigatório"),
  port: z.coerce.number().min(1, "Porta inválida"),
  secure: z.boolean(),
  auth: z.object({
    user: z.string().min(1, "Usuário é obrigatório"),
    pass: z.string().min(1, "Senha é obrigatória"),
  }),
  sender: z.object({
    email: z.string().email("E-mail remetente inválido"),
    name: z.string().min(1, "Nome remetente é obrigatório"),
  }),
})

export type SmtpSettings = z.infer<typeof smtpSchema>

export type SmtpConfigData = {
  settings: SmtpSettings
  is_active: boolean
}

export async function getSmtpConfig() {
  const { data, error } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('provider', 'smtp')
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar configurações SMTP:', error)
    return null
  }

  return data
}

export async function saveSmtpConfig(data: SmtpConfigData) {
  const result = smtpSchema.safeParse(data.settings)
  if (!result.success) {
    return { success: false, error: 'Dados inválidos: ' + result.error.errors[0].message }
  }

  const { error } = await supabase
    .from('integration_configs')
    .upsert({
      provider: 'smtp',
      name: 'SMTP Personalizado',
      api_key: 'smtp-config',
      webhook_url: '',
      is_active: data.is_active,
      settings: data.settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'provider' })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function testSmtpConnection(_settings: SmtpSettings) {
  return { success: false, error: 'Teste SMTP requer Edge Function (não disponível no client).' }
}

export async function sendEmail(_to: string, _subject: string, _html: string) {
  return { success: false, error: 'Envio de e-mail requer Edge Function (não disponível no client).' }
}
