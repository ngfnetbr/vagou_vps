import { supabase } from '@sam/integrations/supabase/client'
import { z } from 'zod'

const specialtySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
})

export type Specialty = {
  id: string
  name: string
  active: boolean
}

export async function getSpecialties() {
  try {
    const { data, error } = await supabase
      .from('specialties')
      .select('id, name, active')
      .order('name')

    if (error) {
      console.error('Erro ao buscar especialidades:', error)
      return []
    }

    return data as Specialty[]
  } catch (error) {
    console.error('Erro inesperado ao buscar especialidades:', error)
    return []
  }
}

export async function createSpecialty(formData: FormData) {
  const name = (formData.get('name') || '').toString().trim()

  const result = specialtySchema.safeParse({ name })
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  try {
    const { error } = await supabase.from('specialties').insert({
      name: result.data.name,
      active: true,
    })

    if (error) {
      console.error('Erro ao criar especialidade:', error)
      return { success: false, error: 'Não foi possível criar a especialidade.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erro inesperado ao criar especialidade:', error)
    return { success: false, error: 'Erro inesperado ao criar a especialidade.' }
  }
}

export async function toggleSpecialty(formData: FormData) {
  const id = formData.get('id')?.toString()
  if (!id) {
    return { success: false, error: 'Especialidade inválida.' }
  }

  const { data, error } = await supabase
    .from('specialties')
    .select('active')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    console.error('Erro ao buscar especialidade:', error)
    return { success: false, error: 'Especialidade não encontrada.' }
  }

  const { error: updateError } = await supabase
    .from('specialties')
    .update({ active: !data.active })
    .eq('id', id)

  if (updateError) {
    console.error('Erro ao atualizar especialidade:', updateError)
    return { success: false, error: 'Não foi possível atualizar a especialidade.' }
  }

  return { success: true }
}

export async function deleteSpecialty(formData: FormData) {
  const id = formData.get('id')?.toString()
  if (!id) {
    return { success: false, error: 'Especialidade inválida.' }
  }

  const { error } = await supabase
    .from('specialties')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir especialidade:', error)
    return { success: false, error: 'Não foi possível excluir a especialidade.' }
  }

  return { success: true }
}
