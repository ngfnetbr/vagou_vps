import { supabase } from '@sam/integrations/supabase/client'
import { z } from 'zod'

// appointment_types table is not in generated types, use untyped client
const db = supabase as any

const typeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
})

export type AppointmentType = {
  id: string
  name: string
  active: boolean
}

export async function getAppointmentTypes(): Promise<AppointmentType[]> {
  try {
    const { data, error } = await db
      .from('appointment_types')
      .select('id, name, active')
      .order('name')

    if (error) return []
    return (data || []) as AppointmentType[]
  } catch (error) {
    console.error('Erro inesperado ao buscar tipos de atendimento:', error)
    return []
  }
}

export async function createAppointmentType(formData: FormData) {
  const name = (formData.get('name') || '').toString().trim()
  const result = typeSchema.safeParse({ name })
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  try {
    const { error } = await db.from('appointment_types').insert({ name: result.data.name, active: true })
    if (error) {
      console.error('Erro ao criar tipo de atendimento:', error)
      return { success: false, error: 'Não foi possível criar o tipo.' }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Erro inesperado ao criar o tipo.' }
  }
}

export async function toggleAppointmentType(formData: FormData) {
  const id = formData.get('id')?.toString()
  if (!id) return { success: false, error: 'Tipo inválido.' }

  const { data, error } = await db.from('appointment_types').select('active').eq('id', id).maybeSingle()
  if (error || !data) return { success: false, error: 'Tipo não encontrado.' }

  const { error: updateError } = await db.from('appointment_types').update({ active: !data.active }).eq('id', id)
  if (updateError) return { success: false, error: 'Não foi possível atualizar o tipo.' }

  return { success: true }
}

export async function deleteAppointmentType(formData: FormData) {
  const id = formData.get('id')?.toString()
  if (!id) return { success: false, error: 'Tipo inválido.' }

  const { error } = await db.from('appointment_types').delete().eq('id', id)
  if (error) return { success: false, error: 'Não foi possível excluir o tipo.' }

  return { success: true }
}
