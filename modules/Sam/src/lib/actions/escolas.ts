import { supabase } from '@sam/integrations/supabase/client'
import { z } from 'zod'

const schoolSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  address: z.string().optional(),
  active: z.boolean().default(true)
})

export type SchoolData = z.infer<typeof schoolSchema>

export async function getSchools() {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar escolas:', error)
    return []
  }

  return data
}

export async function getSchool(id: string) {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar escola:', error)
    return null
  }

  return data
}

export async function createSchool(data: SchoolData) {
  const result = schoolSchema.safeParse(data)
  if (!result.success) {
    return { success: false, error: 'Dados inválidos' }
  }

  const { error } = await supabase
    .from('schools')
    .insert({
      name: data.name,
      address: data.address,
      active: data.active
    })

  if (error) {
    console.error('Erro ao criar escola:', error)
    return { success: false, error: 'Erro ao criar escola' }
  }

  return { success: true }
}

export async function getSchoolClasses(schoolId: string) {
  const { data, error } = await supabase
    .from('school_classes')
    .select('*')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar turmas:', error)
    return []
  }

  return data
}

export async function updateSchool(id: string, data: SchoolData) {
  const result = schoolSchema.safeParse(data)
  if (!result.success) {
    return { success: false, error: 'Dados inválidos' }
  }

  const { error } = await supabase
    .from('schools')
    .update({
      name: data.name,
      address: data.address,
      active: data.active
    })
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar escola:', error)
    return { success: false, error: 'Erro ao atualizar escola' }
  }

  return { success: true }
}

export async function deleteSchool(id: string) {
  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir escola:', error)
    return { success: false, error: 'Erro ao excluir escola. Verifique se existem alunos vinculados.' }
  }

  return { success: true }
}
