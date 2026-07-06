import { supabase } from '@sam/integrations/supabase/client'
import { registerAuditLog } from '@sam/lib/audit'

export type UserPermission = {
  dashboard: boolean
  appointments: boolean
  students: boolean
  financial: boolean
  reports: boolean
  users: boolean
  settings: boolean
  audit: boolean
}

export type UserData = {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'professional' | 'school_coord'
  specialty?: string
  permissions: UserPermission
  created_at: string
}

const defaultPermissions: UserPermission = {
  dashboard: true,
  appointments: true,
  students: true,
  financial: false,
  reports: false,
  users: false,
  settings: false,
  audit: false
}

export async function getUsers() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, specialty, specialty_id, permissions, specialties(name)')
    .order('full_name')

  if (error) {
    console.error('Erro ao buscar usuários:', error)
    return []
  }

  return (profiles || []).map((profile: any) => {
    const specialtyName = profile?.specialties?.name || profile?.specialty || null
    return {
      ...profile,
      email: 'N/A',
      permissions: profile.permissions || defaultPermissions,
      specialty: specialtyName
    }
  })
}

export async function createUser(_data: any) {
  return { success: false, error: 'Criação de usuários requer Edge Function (admin API). Configure no Supabase.' }
}

export async function getUserById(id: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, specialty, specialty_id, permissions, specialties(name)')
    .eq('id', id)
    .single()

  if (!profile) return null

  const specialtyName = (profile as any)?.specialties?.name || (profile as any)?.specialty || null
  return {
    ...profile,
    email: 'N/A',
    permissions: (profile as any).permissions || defaultPermissions,
    specialty: specialtyName
  }
}

export async function getProfessionals() {
  // Roles ficam na tabela separada user_roles (RBAC do app principal)
  const { data: roleRows, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'professional')

  if (roleError) {
    console.error('Erro ao buscar papéis de profissionais:', roleError)
    return []
  }

  const ids = Array.from(new Set((roleRows || []).map((r: any) => r.user_id).filter(Boolean)))
  if (ids.length === 0) return []

  // select('*') evita erro caso a coluna specialty não exista no schema unificado
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids)

  if (error) {
    console.error('Erro ao buscar profissionais:', error)
    return []
  }

  return (data || [])
    .map((p: any) => ({
      id: p.id,
      full_name: p.nome_completo || p.full_name || p.nome || p.email || 'Profissional',
      specialty_id: p.specialty_id ?? null,
      specialty: p?.specialties?.name || p.specialty || null,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
}

export async function updateUser(id: string, data: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autorizado' }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        role: data.role,
        specialty_id: data.specialty_id || null,
        school_id: data.school_id || null,
        permissions: data.permissions
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    if (data.password) {
      return { success: false, error: 'Atualização de senha requer Edge Function (admin API).' }
    }

    await registerAuditLog('UPDATE', 'Usuários', {
      user_id: id,
      changes: data
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteUser(_id: string) {
  return { success: false, error: 'Exclusão de usuários requer Edge Function (admin API).' }
}
