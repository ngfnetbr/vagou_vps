import { supabase } from '@sam/integrations/supabase/client'

export interface AuditLog {
  id: string
  user_id: string | null
  user_name?: string
  action: string
  resource: string
  details: any
  ip_address: string | null
  created_at: string
}

export async function createAuditLog(data: {
  action: string
  resource: string
  details: any
  user_id?: string
}) {
  let user_id = data.user_id
  if (!user_id) {
    const { data: { user } } = await supabase.auth.getUser()
    user_id = user?.id
  }

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: user_id || null,
      action: data.action,
      resource: data.resource,
      details: data.details,
      ip_address: null
    })

  if (error) {
    console.error('Erro ao criar log de auditoria:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getAuditLogs(filters?: {
  action?: string
  resource?: string
  startDate?: string
  endDate?: string
}, limit = 100) {
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      profiles:user_id (
        full_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters?.action && filters.action !== 'all') {
    query = query.eq('action', filters.action)
  }

  if (filters?.resource && filters.resource !== 'all') {
    query = query.eq('resource', filters.resource)
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate + 'T23:59:59')
  }

  const { data: logsWithUser, error: joinError } = await query

  if (joinError) {
    console.error('Erro ao buscar logs com user:', joinError)
    return []
  }

  return (logsWithUser || []).map((log: any) => ({
    ...log,
    user_name: log.profiles?.full_name || 'Sistema/Desconhecido'
  })) as AuditLog[]
}
