import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router-dom"
import { GraduationCap, Plus, Search, User, FileText } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { useAuth } from "@root/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Input } from "@ui/input"
import { Button } from "@ui/button"
import { Skeleton } from "@ui/skeleton"
import { PageHeader } from "@sam/components/common/page-header"

type CriancaRow = {
  id: string
  nome: string | null
  data_nascimento: string | null
  responsavel_nome: string | null
  responsavel_telefone: string | null
  cmei_atual?: { nome: string | null; tipo_unidade?: string | null } | null
  turma_atual?: { nome: string | null } | null
}

export default function EscolaAlunos() {
  const { profile } = useAuth()
  const location = useLocation()
  const modulePrefix = location.pathname.startsWith("/modulo/sam") ? "/modulo/sam" : ""
  const base = `${modulePrefix}/escola`

  const [search, setSearch] = useState("")
  const cmeiId = profile?.cmei_id || null

  const { data, isLoading, error } = useQuery({
    queryKey: ["sam-escola-alunos", cmeiId, search],
    queryFn: async () => {
      if (!cmeiId) return [] as CriancaRow[]

      let q: any = supabase
        .from("criancas")
        .select(
          `
          id,
          nome,
          data_nascimento,
          responsavel_nome,
          responsavel_telefone,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_unidade),
          turma_atual:turmas!criancas_turma_atual_id_fkey(nome)
        `
        )
        .eq("cmei_atual_id", cmeiId)
        .order("nome")
        .limit(500)

      const term = search.trim()
      if (term) {
        q = q.or(`nome.ilike.%${term}%,responsavel_nome.ilike.%${term}%`)
      }

      const { data, error } = await q
      if (error) throw error
      const rows = (data || []) as CriancaRow[]
      return rows.filter((r) => (r.cmei_atual?.tipo_unidade || "cmei_creche") === "escola")
    },
  })

  const rows = useMemo(() => data || [], [data])

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Alunos"
        description="Cadastre e consulte alunos vinculados à sua escola."
        actions={(
          <Button asChild className="gap-2">
            <Link to={`${base}/alunos/novo`}>
              <Plus className="h-4 w-4" />
              Cadastrar aluno
            </Link>
          </Button>
        )}
      />

      {!cmeiId ? (
        <Card className="shadow-sm border-none ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-base">Vínculo da escola não encontrado</CardTitle>
            <CardDescription>
              Este usuário precisa estar vinculado a uma escola no Sistema Principal para visualizar e cadastrar alunos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/modulo/vagou/admin" target="_blank" rel="noreferrer">
                Abrir Sistema Principal
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-none ring-1 ring-border">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-primary">
                <GraduationCap className="h-5 w-5" />
                <CardTitle className="text-lg font-semibold">Lista</CardTitle>
              </div>
              <div className="relative w-80 max-w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou responsável..."
                  className="h-9 pl-9"
                />
              </div>
            </div>
            <CardDescription>Resultados da sua escola (até 500) com filtro por pesquisa.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">Erro ao carregar alunos.</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum aluno encontrado.</div>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-lg border px-3 py-2">
                    <div className="flex items-start justify-between gap-4">
                      <Link to={`${base}/alunos/${r.id}`} className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.nome || "-"}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {r.responsavel_nome || "-"}
                          </span>
                          <span>{r.turma_atual?.nome || "-"}</span>
                        </div>
                      </Link>
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <Link to={`${base}/queixas/nova?alunoId=${encodeURIComponent(r.id)}`}>
                          <FileText className="h-4 w-4" />
                          Nova queixa
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

