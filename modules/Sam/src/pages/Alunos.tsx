import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { Users, School, GraduationCap } from "lucide-react"
import { Avatar, AvatarFallback } from "@ui/avatar"
import { Card, CardContent } from "@ui/card"
import { StudentFilters } from "@sam/components/alunos/student-filters"
import { StudentPreviewButton } from "@sam/components/alunos/student-preview-button"
import { supabase } from "@sam/integrations/supabase/client"
import { useCanAccess } from "@root/components/admin/PermissionGate"
import { fetchPrincipalStudents } from "@sam/lib/principalStudents"
import { PageHeader } from "@sam/components/common/page-header"
import { StatCard } from "@sam/components/dashboard/stat-card"
import { ListEmptyState } from "@root/components/common/ListEmptyState"
import { ListPagination } from "@root/components/common/ListPagination"

const PAGE_SIZE = 10

export default function Alunos() {
  const [searchParams] = useSearchParams()
  const [students, setStudents] = useState<any[]>([])
  const [schoolNames, setSchoolNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [canViewProntuario, setCanViewProntuario] = useState(false)
  const [page, setPage] = useState(1)
  const canView = useCanAccess(["modulos.sam.acessar", "sam.alunos.visualizar"])

  useEffect(() => {
    const loadSchoolNames = async () => {
      let q: any = supabase.from("cmeis").select("nome").eq("ativo", true).order("nome")
      const { data } = await q
      const unique = Array.from(new Set((data || []).map((d: any) => d.nome).filter(Boolean)))
      unique.sort((a, b) => a.localeCompare(b))
      setSchoolNames(unique)
    }
    const checkPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role, permissions").eq("id", user.id).single()
        setCanViewProntuario(
          profile?.role === "admin" || profile?.role === "professional" || (profile as any)?.permissions?.students === true
        )
      }
    }
    loadSchoolNames()
    checkPermissions()
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const search = searchParams.get("search")
      const school = searchParams.get("school")
      const className = searchParams.get("className")
      const status = searchParams.get("status")

      const data = await fetchPrincipalStudents({
        search,
        schoolName: school && school !== "all" ? school : null,
        className,
        limit: 1000,
      })

      const normalized = (data || []).map(d => ({
        id: d.id,
        nome: d.nome,
        data_nascimento: d.data_nascimento,
        cmei_atual_nome: d.escola_nome,
        turma_atual_nome: d.turma_nome,
        nome_responsavel: d.nome_responsavel,
        responsavel_telefone: d.responsavel_telefone,
        status: "active",
      }))
      const filteredByStatus = status && status !== "all"
        ? normalized.filter((student) => student.status === status)
        : normalized

      setStudents(filteredByStatus)
      setPage(1)
      setLoading(false)
    }
    load()
  }, [searchParams])

  const pagedStudents = useMemo(
    () => students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [students, page]
  )

  const stats = useMemo(() => {
    const escolas = new Set(students.map((s) => s.cmei_atual_nome).filter(Boolean))
    const turmas = new Set(students.map((s) => s.turma_atual_nome).filter(Boolean))
    return {
      total: students.length,
      escolas: escolas.size,
      turmas: turmas.size,
    }
  }, [students])

  return (
    <>
      {!canView ? (
        <div className="rounded-2xl border border-border p-6 bg-muted/30 text-sm text-muted-foreground">
          Você não tem permissão para visualizar alunos.
        </div>
      ) : (
      <div className="space-y-6 pb-8 animate-fade-in">
      <PageHeader
        title="Gestão de Alunos"
        description="Consulte e gerencie os alunos encaminhados para atendimento."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total de alunos" value={stats.total} subtitle="Alunos listados" icon={Users} accentColor="border-l-primary" iconClassName="text-primary" />
        <StatCard title="Escolas" value={stats.escolas} subtitle="Unidades distintas" icon={School} accentColor="border-l-info" iconClassName="text-info" />
        <StatCard title="Turmas" value={stats.turmas} subtitle="Turmas distintas" icon={GraduationCap} accentColor="border-l-success" iconClassName="text-success" />
      </div>

      <StudentFilters schoolNames={schoolNames} />


      <Card>
        <CardContent className="p-0">
        <Table className="min-w-[900px]">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[320px]">Nome</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : pagedStudents.length > 0 ? (
              pagedStudents.map((student, idx) => (
                <TableRow
                  key={student.id}
                  className="animate-fade-in transition-colors hover:bg-muted/50"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {(student.nome || "").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">{student.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {student.data_nascimento ? new Date(student.data_nascimento).toLocaleDateString('pt-BR') : 'Sem data nasc.'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="max-w-[220px] truncate" title={student.cmei_atual_nome || "-"}>
                      {student.cmei_atual_nome || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <div className="max-w-[220px] truncate" title={student.turma_atual_nome || "-"}>
                      {student.turma_atual_nome || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="max-w-[220px] truncate" title={student.nome_responsavel || "-"}>
                      {student.nome_responsavel || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="max-w-[160px] truncate" title={student.responsavel_telefone || "-"}>
                      {student.responsavel_telefone || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <StudentPreviewButton student={student} canViewProntuario={canViewProntuario} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <ListEmptyState
                    title="Nenhum aluno encontrado"
                    description="Ajuste os filtros ou a busca para ver mais resultados."
                    className="border-0 rounded-none bg-transparent"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <ListPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={students.length}
          onPageChange={setPage}
          itemLabel="alunos"
        />
      )}
    </div>
      )}
    </>
  )
}
