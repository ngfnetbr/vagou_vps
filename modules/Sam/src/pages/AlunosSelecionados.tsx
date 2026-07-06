// @ts-nocheck
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent } from "@ui/card"
import { Badge } from "@ui/badge"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Skeleton } from "@ui/skeleton"
import { Users, GraduationCap, UserPlus, FileText } from "lucide-react"
import { VagouListShell } from "@root/components/common/VagouListShell"
import { EmptyState } from "@sam/components/common/empty-state"
import { useDebouncedValue } from "@sam/hooks/use-debounced-value"
import { getSelectedStudents, type SelectedStudent } from "@sam/lib/actions/students-sam"

function calcularIdade(dataNascimento: string | null) {
  if (!dataNascimento) return null
  const nasc = new Date(dataNascimento)
  if (isNaN(nasc.getTime())) return null
  const hoje = new Date()
  let anos = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos -= 1
  return anos >= 0 ? `${anos} ano(s)` : null
}

export default function AlunosSelecionados() {
  const [students, setStudents] = useState<SelectedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  useEffect(() => {
    let active = true
    setLoading(true)
    getSelectedStudents(debouncedSearch).then((data) => {
      if (active) {
        setStudents(data)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [debouncedSearch])

  const total = students.length
  const filtered = useMemo(() => students, [students])

  return (
    <VagouListShell
      title="Alunos do SAM"
      description="Alunos selecionados para acompanhamento multidisciplinar."
      actions={
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/modulo/sam/cadastros/alunos">
            <UserPlus className="mr-2 h-4 w-4" />
            Selecionar alunos
          </Link>
        </Button>
      }
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Buscar aluno...",
      }}
    >
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{total}</span> aluno(s) no SAM
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Nenhum aluno selecionado"
          description="Selecione alunos na tela de cadastros para acompanhá-los no SAM."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const idade = calcularIdade(s.birth_date)
            return (
              <Link key={s.id} to={`/modulo/sam/alunos/${s.id}/prontuario`}>
                <Card className="hover:shadow-md transition-all cursor-pointer h-full border-l-4 border-l-primary/40">
                  <CardContent className="p-4 flex flex-col gap-2 h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate" title={s.full_name}>{s.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[s.school_name, s.class_name].filter(Boolean).join(" • ") || "Sem turma"}
                        </div>
                      </div>
                      <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {idade ? <Badge variant="outline" className="text-[10px]">{idade}</Badge> : null}
                      {s.guardian_name ? <span className="truncate">Resp.: {s.guardian_name}</span> : null}
                    </div>
                    <div className="mt-auto flex items-center gap-1 text-xs text-primary">
                      <FileText className="h-3.5 w-3.5" />
                      Ver perfil e histórico
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </VagouListShell>
  )
}
