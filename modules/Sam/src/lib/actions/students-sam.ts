// @ts-nocheck
import { supabase } from "@sam/integrations/supabase/client"
import { ensureSamStudentFromPrincipal } from "@sam/lib/principalStudents"

const DOCS_BUCKET = "sam-documentos"

export type SelectedStudent = {
  id: string
  full_name: string
  birth_date: string | null
  class_name: string | null
  guardian_name: string | null
  guardian_phone: string | null
  school_id: string | null
  school_name: string | null
  status: string | null
  created_at: string | null
}

export type StudentDocument = {
  id: string
  student_id: string
  file_path: string
  file_name: string
  doc_type: string | null
  description: string | null
  created_at: string | null
}

// Lista apenas os alunos selecionados para o SAM (tabela students)
export async function getSelectedStudents(search?: string): Promise<SelectedStudent[]> {
  let q: any = supabase
    .from("students")
    .select("id, full_name, birth_date, class_name, guardian_name, guardian_phone, school_id, status, created_at, schools:school_id(name)")
    .order("full_name", { ascending: true })

  const term = (search || "").trim()
  if (term) q = q.ilike("full_name", `%${term}%`)

  const { data, error } = await q
  if (error) {
    console.error("getSelectedStudents error:", error)
    return []
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    full_name: s.full_name || "Aluno",
    birth_date: s.birth_date || null,
    class_name: s.class_name || null,
    guardian_name: s.guardian_name || null,
    guardian_phone: s.guardian_phone || null,
    school_id: s.school_id || null,
    school_name: s.schools?.name || null,
    status: s.status || null,
    created_at: s.created_at || null,
  }))
}

// Retorna o conjunto de ids (criancas/students) já selecionados, para marcar na tela geral
export async function getSelectedStudentIds(ids?: string[]): Promise<Set<string>> {
  let q: any = supabase.from("students").select("id")
  if (ids?.length) q = q.in("id", ids)
  const { data, error } = await q
  if (error) {
    console.error("getSelectedStudentIds error:", error)
    return new Set()
  }
  return new Set((data || []).map((r: any) => r.id as string))
}

export async function isStudentSelected(studentId: string): Promise<boolean> {
  const { data } = await supabase.from("students").select("id").eq("id", studentId).maybeSingle()
  return !!data
}

// Seleciona um aluno (cria a linha em students a partir da crianca principal)
export async function selectStudent(principalStudentId: string) {
  try {
    await ensureSamStudentFromPrincipal(principalStudentId)
    return { success: true }
  } catch (error: any) {
    console.error("selectStudent error:", error)
    return { success: false, error: error?.message || "Erro ao selecionar aluno." }
  }
}

// Verifica se o aluno tem qualquer histórico (atendimentos, registros ou documentos)
async function studentHasHistory(studentId: string): Promise<boolean> {
  const [appts, records, docs] = await Promise.all([
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    supabase.from("appointment_records").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    supabase.from("student_documents").select("id", { count: "exact", head: true }).eq("student_id", studentId),
  ])
  return (appts.count || 0) > 0 || (records.count || 0) > 0 || (docs.count || 0) > 0
}

// Remove um aluno do SAM, somente se não houver histórico
export async function unselectStudent(studentId: string) {
  try {
    const hasHistory = await studentHasHistory(studentId)
    if (hasHistory) {
      return { success: false, error: "Este aluno já possui atendimentos/registros e não pode ser removido do SAM." }
    }
    const { error } = await supabase.from("students").delete().eq("id", studentId)
    if (error) {
      return { success: false, error: "Erro ao remover aluno do SAM." }
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Erro ao remover aluno." }
  }
}

// ===== Documentos / laudos do aluno =====

export async function listStudentDocuments(studentId: string): Promise<{ data: StudentDocument[]; missingTable: boolean }> {
  const { data, error } = await supabase
    .from("student_documents")
    .select("id, student_id, file_path, file_name, doc_type, description, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (error) {
    // 42P01 = tabela não existe ainda
    const missingTable = (error as any).code === "42P01" || /does not exist/i.test(error.message || "")
    if (!missingTable) console.error("listStudentDocuments error:", error)
    return { data: [], missingTable }
  }
  return { data: (data || []) as StudentDocument[], missingTable: false }
}

export async function uploadStudentDocument(params: {
  studentId: string
  file: File
  docType?: string
  description?: string
  uploadedBy?: string | null
}) {
  const { studentId, file, docType, description, uploadedBy } = params
  try {
    const safeName = file.name.replace(/[^\w.\-]+/g, "_")
    const path = `${studentId}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (uploadError) {
      console.error("uploadStudentDocument storage error:", uploadError)
      return { success: false, error: "Erro ao enviar o arquivo. Verifique se o armazenamento está configurado." }
    }

    const { error: insertError } = await supabase.from("student_documents").insert({
      student_id: studentId,
      file_path: path,
      file_name: file.name,
      doc_type: docType || null,
      description: description || null,
      uploaded_by: uploadedBy || null,
    })
    if (insertError) {
      // tenta limpar o arquivo órfão
      await supabase.storage.from(DOCS_BUCKET).remove([path])
      console.error("uploadStudentDocument insert error:", insertError)
      return { success: false, error: "Erro ao registrar o documento." }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Erro ao enviar documento." }
  }
}

export async function getStudentDocumentUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(filePath, 60 * 10)
  if (error) {
    console.error("getStudentDocumentUrl error:", error)
    return null
  }
  return data?.signedUrl || null
}

export async function deleteStudentDocument(doc: { id: string; file_path: string }) {
  try {
    await supabase.storage.from(DOCS_BUCKET).remove([doc.file_path])
    const { error } = await supabase.from("student_documents").delete().eq("id", doc.id)
    if (error) return { success: false, error: "Erro ao excluir o documento." }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Erro ao excluir documento." }
  }
}
