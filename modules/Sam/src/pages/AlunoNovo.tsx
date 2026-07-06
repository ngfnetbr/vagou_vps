// @ts-nocheck
import { useEffect, useState } from "react"
import { StudentForm } from "@sam/components/alunos/student-form"
import { supabase } from "@sam/integrations/supabase/client"

export default function AlunoNovo() {
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    let q = supabase.from("schools").select("id, name").order("name")
    q.then(({ data }) => setSchools(data?.map(d => ({ id: d.id, name: d.name })) || []))
  }, [])

  return (
    <>
      <div className="space-y-6">
        <StudentForm schools={schools} />
      </div>
    </>
  )
}

