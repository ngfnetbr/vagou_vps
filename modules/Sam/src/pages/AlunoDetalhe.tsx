import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
import { ArrowLeft, Pencil, User, School, FileText, Calendar } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { DeleteStudentButton } from "@sam/components/alunos/delete-student-button"
import { ensureSamStudentFromPrincipal } from "@sam/lib/principalStudents"
import { PageHeader } from "@sam/components/common/page-header"

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "muted" }> = {
  active: { label: "Em Acompanhamento", variant: "success" },
  waiting: { label: "Aguardando Avaliação", variant: "warning" },
  finished: { label: "Finalizado", variant: "secondary" },
}

export default function AlunoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await ensureSamStudentFromPrincipal(id!)
      let q = supabase.from("students").select("*, schools(name)").eq("id", id!)
      const { data } = await q.single()
      if (data) {
        setStudent(data)
        setSchool((data as any).schools)
      }
      setLoading(false)
    }
    if (id) load()
  }, [id])

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>
  if (!student) return <div className="text-center py-8 text-muted-foreground">Aluno não encontrado.</div>

  const status = statusMap[student.status] || statusMap.waiting

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <PageHeader
        leading={(
          <Button variant="outline" size="icon" className="rounded-full" asChild>
            <Link to="/modulo/sam/alunos"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
        )}
        title={<h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate text-foreground">{student.full_name}</h2>}
        description={<Badge variant={status.variant}>{status.label}</Badge>}
        actions={(
          <>
            <Button variant="outline" asChild>
              <Link to={`/modulo/sam/alunos/${id}/editar`}><Pencil className="mr-2 h-4 w-4" /> Editar</Link>
            </Button>
            <DeleteStudentButton id={id!} />
          </>
        )}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="bg-muted/40 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div><span className="text-sm text-muted-foreground">Nome:</span><p className="font-medium">{student.full_name}</p></div>
            <div><span className="text-sm text-muted-foreground">Data de Nascimento:</span><p className="font-medium">{student.birth_date ? new Date(student.birth_date).toLocaleDateString('pt-BR') : '-'}</p></div>
            <div><span className="text-sm text-muted-foreground">Responsável:</span><p className="font-medium">{student.guardian_name || '-'}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-muted/40 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2"><School className="h-5 w-5 text-primary" /> Dados Escolares</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div><span className="text-sm text-muted-foreground">Instituição:</span><p className="font-medium">{(student as any).schools?.name || '-'}</p></div>
            <div><span className="text-sm text-muted-foreground">Turma:</span><p className="font-medium">{student.class_name || '-'}</p></div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="bg-muted/40 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Detalhes do Encaminhamento</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div><span className="text-sm text-muted-foreground">Motivo:</span><p className="font-medium whitespace-pre-wrap">{student.reason || '-'}</p></div>
            <div><span className="text-sm text-muted-foreground">Observações:</span><p className="font-medium whitespace-pre-wrap">{student.observations || '-'}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link to={`/modulo/sam/alunos/${id}/prontuario`}><Calendar className="mr-2 h-4 w-4" /> Ver Prontuário</Link>
        </Button>
      </div>
    </div>
    </>
  )
}
