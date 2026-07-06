import { Fragment, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Skeleton } from "@ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { PaginationControls } from "@ui/PaginationControls"
import { Badge } from "@ui/badge"
import { BookOpen, Building2, GraduationCap } from "lucide-react"
import { supabase } from "@sondagem/integrations/supabase/client"
import { Link } from "react-router-dom"
import { VagouListShell } from "@root/components/common/VagouListShell"
import SexoIcon from "@root/components/common/SexoIcon"

type CriancaRow = {
  id: string
  nome: string | null
  status: string | null
  protocolo: string | null
  responsavel_nome: string | null
  data_nascimento: string | null
  sexo: string | null
  created_at: string | null
  cmei_atual?: { nome: string | null; tipo_unidade?: string | null } | null
  turma_atual?: { nome: string | null } | null
}

export default function CadastrosAlunosConsulta() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParam = searchParams.get("search") || ""
  const viewMode = (searchParams.get("view") || "table") === "grid" ? "grid" : "table"
  const pageParam = Number(searchParams.get("page") || "1")
  const pageSizeParam = Number(searchParams.get("pageSize") || "25")
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const pageSize = [10, 25, 50, 100].includes(pageSizeParam) ? pageSizeParam : 25

  const [searchTerm, setSearchTerm] = useState(searchParam)
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam)
  const [sortBy, setSortBy] = useState<"nome" | "data_nascimento" | "created_at">("nome")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (searchParams.get("view")) return
    const next = new URLSearchParams(searchParams)
    next.set("view", "table")
    setSearchParams(next)
  }, [searchParams, setSearchParams])

  const { data, isLoading, error } = useQuery({
    queryKey: ["sondagem-consulta-criancas"],
    queryFn: async () => {
      const query = supabase
        .from("criancas")
        .select(
          `
          id,
          nome,
          status,
          protocolo,
          responsavel_nome,
          data_nascimento,
          sexo,
          created_at,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, tipo_unidade),
          turma_atual:turmas!criancas_turma_atual_id_fkey(nome)
        `
        )
        .order("created_at", { ascending: false })
        .limit(200)

      const { data, error } = await query
      if (error) throw error
      return (data || []) as CriancaRow[]
    },
  })

  useEffect(() => {
    setSearchTerm(searchParam)
    setDebouncedSearch(searchParam)
  }, [searchParam])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm)
      const next = new URLSearchParams(searchParams)
      const clean = searchTerm.trim()
      if (clean) next.set("search", clean)
      else next.delete("search")
      next.delete("page")
      setSearchParams(next)
    }, 300)
    return () => window.clearTimeout(t)
  }, [searchParams, searchTerm, setSearchParams])

  const rows = useMemo(() => data || [], [data])

  const calcularIdade = (dataNascimento: string | null) => {
    if (!dataNascimento) return "-"
    const nasc = new Date(dataNascimento)
    if (isNaN(nasc.getTime())) return "-"
    const hoje = new Date()
    let anos = hoje.getFullYear() - nasc.getFullYear()
    let meses = hoje.getMonth() - nasc.getMonth()
    if (hoje.getDate() < nasc.getDate()) meses -= 1
    if (meses < 0) { anos -= 1; meses += 12 }
    if (anos <= 0) return `${meses} mês(es)`
    return `${anos} ano(s)${meses > 0 ? `, ${meses} mês(es)` : ""}`
  }

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "Matriculado":
      case "Matriculada":
        return "default"
      case "Convocado":
        return "secondary"
      case "Fila de Espera":
        return "outline"
      case "Desistente":
      case "Recusada":
        return "destructive"
      default:
        return "secondary"
    }
  }
  const filteredRowsBase = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== "all" && (r.status || "") !== statusFilter) return false
      if (!term) return true

      const nome = (r.nome || "").toLowerCase()
      const resp = (r.responsavel_nome || "").toLowerCase()
      const protocolo = (r.protocolo || "").toLowerCase()
      return nome.includes(term) || resp.includes(term) || protocolo.includes(term)
    })
  }, [debouncedSearch, rows, statusFilter])

  const filteredRows = useMemo(() => {
    const list = filteredRowsBase.slice()
    if (sortBy === "nome") {
      list.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
    } else if (sortBy === "data_nascimento") {
      list.sort((a, b) => (a.data_nascimento || "").localeCompare(b.data_nascimento || ""))
    } else {
      list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    }
    return list
  }, [filteredRowsBase, sortBy])

  const totalItems = filteredRows.length
  const statCards = useMemo(() => {
    const instituicoes = new Set(filteredRows.map((r) => r.cmei_atual?.nome).filter(Boolean))
    const turmas = new Set(filteredRows.map((r) => r.turma_atual?.nome).filter(Boolean))
    return { total: filteredRows.length, instituicoes: instituicoes.size, turmas: turmas.size }
  }, [filteredRows])
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const paginated = filteredRows.slice(startIdx, startIdx + pageSize)
  const groupedTableData = useMemo(() => {
    const instituicoes = new Map<string, Map<string, CriancaRow[]>>()
    paginated.forEach((r) => {
      const instituicao = r.cmei_atual?.nome || "-"
      const turma = r.turma_atual?.nome || "-"
      const byTurma = instituicoes.get(instituicao) || new Map<string, CriancaRow[]>()
      const arr = byTurma.get(turma) || []
      arr.push(r)
      byTurma.set(turma, arr)
      instituicoes.set(instituicao, byTurma)
    })

    return Array.from(instituicoes.entries())
      .map(([instituicao, turmasMap]) => ({
        instituicao,
        turmas: Array.from(turmasMap.entries())
          .map(([turma, alunos]) => ({
            turma,
            alunos: alunos.slice().sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
          }))
          .sort((a, b) => a.turma.localeCompare(b.turma)),
      }))
      .sort((a, b) => a.instituicao.localeCompare(b.instituicao))
  }, [paginated])

  const setView = (mode: "grid" | "table") => {
    const next = new URLSearchParams(searchParams)
    next.set("view", mode)
    setSearchParams(next)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSortBy("nome")
    setStatusFilter("all")
    const next = new URLSearchParams(searchParams)
    next.delete("search")
    next.delete("page")
    setSearchParams(next)
  }

  return (
    <VagouListShell
      title="Alunos"
      description={
        <div className="space-y-2">
          <div>Consulta rápida de crianças (até 200 registros recentes).</div>
          <div className="flex gap-2">
            <Badge variant="secondary">{totalItems} registros</Badge>
          </div>
        </div>
      }
      stats={[
        { title: "Total de alunos", value: statCards.total, subtitle: "Registros filtrados", icon: GraduationCap, accent: "primary" },
        { title: "Instituições", value: statCards.instituicoes, subtitle: "Unidades distintas", icon: Building2, accent: "info" },
        { title: "Turmas", value: statCards.turmas, subtitle: "Turmas distintas", icon: BookOpen, accent: "success" },
      ]}
      search={{
        value: searchTerm,
        onChange: setSearchTerm,
        placeholder: "Buscar por nome, responsável ou protocolo...",
      }}
      filters={
        <>
          <Select
            value={sortBy}
            onValueChange={(v) => {
              if (v === "nome" || v === "data_nascimento" || v === "created_at") setSortBy(v)
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome (A-Z)</SelectItem>
              <SelectItem value="data_nascimento">Data de Nascimento</SelectItem>
              <SelectItem value="created_at">Data de Cadastro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="Fila de Espera">Fila de Espera</SelectItem>
              <SelectItem value="Convocado">Convocado</SelectItem>
              <SelectItem value="Matriculado">Matriculado</SelectItem>
              <SelectItem value="Matriculada">Matriculada</SelectItem>
              <SelectItem value="Desistente">Desistente</SelectItem>
              <SelectItem value="Recusada">Recusada</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
      onClear={clearFilters}
      showClear={!!searchTerm || statusFilter !== "all" || sortBy !== "nome"}
      viewMode={viewMode}
      onViewModeChange={setView}
      pagination={
        !isLoading && !error && filteredRows.length > 0 ? (
          <PaginationControls
            currentPage={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={(p) => {
              const next = new URLSearchParams(searchParams)
              next.set("page", String(p))
              setSearchParams(next)
            }}
            onPageSizeChange={(s) => {
              const next = new URLSearchParams(searchParams)
              next.set("pageSize", String(s))
              next.delete("page")
              setSearchParams(next)
            }}
            hasNextPage={safePage < totalPages}
            hasPreviousPage={safePage > 1}
          />
        ) : null
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">Erro ao carregar crianças.</div>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum resultado.</p>
      ) : viewMode === "grid" ? (
        <div className="space-y-4">
          {groupedTableData.map((g) => (
            <Card key={g.instituicao}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base flex items-center gap-2">
                    {g.instituicao}
                    <Badge variant="secondary">
                      {g.turmas.reduce((acc, t) => acc + t.alunos.length, 0)} alunos
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {g.turmas.map((t) => (
                  <div key={`${g.instituicao}::${t.turma}`} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>{t.turma}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {t.alunos.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {t.alunos.map((r) => (
                        <Link key={r.id} to={`/modulo/sondar/aluno/${r.id}`} className="block">
                          <Card className="hover:shadow-md transition-shadow h-full">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base truncate">{r.nome || "-"}</CardTitle>
                              <CardDescription className="truncate">
                                {g.instituicao} • {t.turma}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-2">
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{r.responsavel_nome || "-"}</span>
                                <Badge variant="outline" className="text-[10px]">{r.status || "-"}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">Protocolo: {r.protocolo || "-"}</div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="w-[56px] text-center">Sexo</TableHead>
                <TableHead>Data Nasc.</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <Link to={`/modulo/sondar/aluno/${r.id}`} className="block">
                      <div>{r.nome || "-"}</div>
                      {r.protocolo ? (
                        <div className="text-xs text-muted-foreground">{r.protocolo}</div>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell>{r.responsavel_nome || "-"}</TableCell>
                  <TableCell className="text-center">
                    <SexoIcon sexo={r.sexo} />
                  </TableCell>
                  <TableCell>
                    {r.data_nascimento ? new Date(r.data_nascimento).toLocaleDateString("pt-BR") : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{calcularIdade(r.data_nascimento)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(r.status)}>{r.status || "-"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </VagouListShell>
  )
}
