import { supabase } from '@sam/integrations/supabase/client'

export async function createStudent(formData: FormData) {
  const full_name = formData.get('full_name') as string
  const birth_date = formData.get('birth_date') as string
  const school_id = formData.get('school_id') as string
  const class_name = formData.get('class_name') as string
  const guardian_name = formData.get('guardian_name') as string
  const reason = formData.get('reason') as string
  const observations = formData.get('observations') as string

  const { error } = await supabase.from('students').insert({
    full_name,
    birth_date: birth_date || null,
    school_id: school_id || null,
    class_name,
    guardian_name,
    reason,
    observations,
    status: 'waiting'
  })

  if (error) {
    console.error('Error creating student:', error)
    return { error: `Erro ao criar aluno: ${error.message}` }
  }

  return { success: true }
}

export async function getStudentsForSelect() {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name')
    .order('full_name')

  if (error) {
    console.error('Erro ao buscar alunos para select:', error)
    return []
  }

  return data
}

export async function updateStudent(id: string, formData: FormData) {
  const full_name = formData.get('full_name') as string
  const birth_date = formData.get('birth_date') as string
  const school_id = formData.get('school_id') as string
  const class_name = formData.get('class_name') as string
  const guardian_name = formData.get('guardian_name') as string
  const reason = formData.get('reason') as string
  const observations = formData.get('observations') as string
  const status = formData.get('status') as string

  const { error } = await supabase.from('students').update({
    full_name,
    birth_date: birth_date || null,
    school_id: school_id || null,
    class_name,
    guardian_name,
    reason,
    observations,
    status: status as any
  }).eq('id', id)

  if (error) {
    console.error('Error updating student:', error)
    return { error: 'Erro ao atualizar aluno. Verifique os dados e tente novamente.' }
  }

  return { success: true }
}

export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting student:', error)
    return { error: 'Erro ao excluir aluno. Tente novamente.' }
  }

  return { success: true }
}
