import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { StudentForm } from "@sam/components/alunos/student-form"
import { supabase } from "@sam/integrations/supabase/client"
import { ensureSamStudentFromPrincipal } from "@sam/lib/principalStudents"

export default function AlunoEditar() {
  const { id } = useParams<{ id: string }>()
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([])
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async function load() {
      await ensureSamStudentFromPrincipal(id!)
      let schoolsQ = supabase.from("schools").select("id, name").order("name")
      let studentQ = supabase.from("students").select("*").eq("id", id!)
      const [schoolsRes, studentRes] = await Promise.all([schoolsQ, studentQ.single()])
      setSchools(schoolsRes.data?.map(d => ({ id: d.id, name: d.name })) || [])
      setStudent(studentRes.data)
      setLoading(false)
    }
    if (id) load()
  }, [id])

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>
  if (!student) return <div className="text-center py-8 text-muted-foreground">Aluno não encontrado.</div>

  return (
    <>
      <div className="space-y-6 pb-10">
        <StudentForm schools={schools} student={student} isEditing />
      </div>
    </>
  )
}
