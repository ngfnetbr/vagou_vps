// @ts-nocheck
import { supabase } from '@sam/integrations/supabase/client'

export async function registerAuditLog(
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER',
  resource: string,
  details: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action,
      resource,
      details,
      ip_address: 'client'
    })
  } catch (error) {
    console.error('Falha ao registrar log de auditoria:', error)
  }
}

