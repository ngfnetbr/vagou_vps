import { Fragment, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Skeleton } from "@ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { PaginationControls } from "@ui/PaginationControls"
import { Badge } from "@ui/badge"
import { BookOpen, Building2, Layers } from "lucide-react"
import { supabase } from "@sondagem/integrations/supabase/client"
import { VagouListShell } from "@root/components/common/VagouListShell"

type TurmaRow = {
  id: string
  nome: string | null
  turno: string | null
  capacidade: number | null
  turma_base: string | null
  ativo: boolean
  cmeis?: { id: string | null; nome: string | null; tipo_unidade?: string | null } | null
}

function getTipoUnidadeLabel(tipo: string | null | undefined) {
  return (tipo || "cmei_creche") === "escola" ? "Escola" : "CMEI"
}

export default function CadastrosTurmasConsulta() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParam = searchParams.get("search") || ""
  const cmeiParam = searchParams.get("cmei") || undefined
  const viewMode = (searchParams.get("view") || "table") === "grid" ? "grid" : "table"
  const pageParam = Number(searchParams.get("page") || "1")
  const pageSizeParam = Number(searchParams.get("pageSize") || "25")
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const pageSize = [10, 25, 50, 100].includes(pageSizeParam) ? pageSizeParam : 25

  const [searchTerm, setSearchTerm] = useState(searchParam)
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam)
  const [selectedCMEI, setSelectedCMEI] = useState<string | undefined>(cmeiParam)

  useEffect(() => {
    if (searchParams.get("view")) return
    const next = new URLSearchParams(searchParams)
    next.set("view", "table")
    setSearchParams(next)
  }, [searchParams, setSearchParams])

  const { data: cmeis } = useQuery({
    queryKey: ["sondagem-consulta-turmas-cmeis"],
    queryFn: async () => {
      const query = supabase
        .from("cmeis")
        .select("id, nome, tipo_unidade, ativo")
        .order("nome")
        .limit(1000)
      const { data, error } = await query
      if (error) throw error
      return (data || []) as Array<{ id: string; nome: string; tipo_unidade?: string | null; ativo?: boolean | null }>
    },
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ["sondagem-consulta-turmas"],
    queryFn: async () => {
      const query = supabase
        .from("turmas")
        .select("id, nome, turno, capacidade, turma_base, ativo, cmeis(id, nome, tipo_unidade)")
        .eq("ativo", true)
        .order("nome")
        .limit(500)

      const { data, error } = await query
      if (error) throw error
      return (data || []) as TurmaRow[]
    },
  })

  const { data: studentsCount } = useQuery({
    queryKey: ["sondagem-consulta-turmas-students-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criancas")
        .select("turma_atual_id")
        .in("status", ["Matriculado", "Matriculada", "Convocado", "Aguardando Documentação"])
      if (error) throw error
      const counts: Record<string, number> = {}
      ;((data || []) as Array<{ turma_atual_id: string | null }>).forEach((c) => {
        if (c.turma_atual_id) counts[c.turma_atual_id] = (counts[c.turma_atual_id] || 0) + 1
      })
      return counts
    },
  })

  const getOccupationBadge = (ocupadas: number, capacidade: number) => {
    const percentage = capacidade > 0 ? Math.round((ocupadas / capacidade) * 100) : 0
    return (
      <Badge variant={percentage === 0 ? "outline" : percentage >= 100 ? "destructive" : percentage > 90 ? "destructive" : percentage > 50 ? "warning" : "success"}>
        {percentage}%
      </Badge>
    )
  }

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
  const filteredRows = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return rows.filter((r) => {
      if (selectedCMEI && r.cmeis?.id !== selectedCMEI) return false
      if (!term) return true
      return (r.nome || "").toLowerCase().includes(term)
    })
  }, [debouncedSearch, rows, selectedCMEI])

  const totalItems = filteredRows.length
  const statCards = useMemo(() => {
    const instituicoes = new Set(filteredRows.map((r) => r.cmeis?.nome).filter(Boolean))
    const capacidade = filteredRows.reduce((acc, r) => acc + (r.capacidade ?? 0), 0)
    return { total: filteredRows.length, instituicoes: instituicoes.size, capacidade }
  }, [filteredRows])
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const paginated = filteredRows.slice(startIdx, startIdx + pageSize)
  const groupedTableData = useMemo(() => {
    const schools = new Map<string, TurmaRow[]>()
    paginated.forEach((r) => {
      const school = r.cmeis?.nome || "-"
      const arr = schools.get(school) || []
      arr.push(r)
      schools.set(school, arr)
    })
    return Array.from(schools.entries())
      .map(([school, turmas]) => ({
        school,
        turmas: turmas.slice().sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
      }))
      .sort((a, b) => a.school.localeCompare(b.school))
  }, [paginated])

  const setView = (mode: "grid" | "table") => {
    const next = new URLSearchParams(searchParams)
    next.set("view", mode)
    setSearchParams(next)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCMEI(undefined)
    const next = new URLSearchParams(searchParams)
    next.delete("search")
    next.delete("cmei")
    next.delete("tipo")
    next.delete("page")
    setSearchParams(next)
  }

  return (
    <VagouListShell
      title="Turmas"
      description={
        <div className="space-y-2">
          <div>Consulta de turmas com filtros idênticos ao VAGOU.</div>
          <div className="flex gap-2">
            <Badge variant="secondary">{totalItems} registros</Badge>
          </div>
        </div>
      }
      stats={[
        { title: "Total de turmas", value: statCards.total, subtitle: "Turmas ativas", icon: BookOpen, accent: "primary" },
        { title: "Instituições", value: statCards.instituicoes, subtitle: "Unidades distintas", icon: Building2, accent: "info" },
        { title: "Capacidade total", value: statCards.capacidade, subtitle: "Vagas somadas", icon: Layers, accent: "success" },
      ]}
      search={{
        value: searchTerm,
        onChange: setSearchTerm,
        placeholder: "Buscar por nome...",
      }}
      filters={
        <Select
          value={selectedCMEI}
          onValueChange={(v) => {
            setSelectedCMEI(v)
            const next = new URLSearchParams(searchParams)
            next.set("cmei", v)
            next.delete("page")
            setSearchParams(next)
          }}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Instituição (todas)" />
          </SelectTrigger>
          <SelectContent>
            {(cmeis || []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      onClear={clearFilters}
      showClear={!!searchTerm || !!selectedCMEI}
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
        <div className="text-sm text-destructive">Erro ao carregar turmas.</div>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum resultado.</p>
      ) : viewMode === "grid" ? (
        <div className="space-y-4">
          {groupedTableData.map((g) => (
            <Card key={g.school}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base flex items-center gap-2">
                    {g.school}
                    <Badge variant="secondary">{g.turmas.length}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {getTipoUnidadeLabel(g.turmas[0]?.cmeis?.tipo_unidade)}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.turmas.map((r) => {
                    const ocupadas = studentsCount?.[r.id] || 0
                    const cap = r.capacidade ?? 0
                    const pct = cap > 0 ? Math.round((ocupadas / cap) * 100) : 0
                    return (
                    <Card key={r.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 min-w-0">
                            <BookOpen className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">{r.nome || "-"}</span>
                          </span>
                          {getOccupationBadge(ocupadas, cap)}
                        </CardTitle>
                        <CardDescription className="space-y-2">
                          <div className="truncate">{r.turma_base || "-"}</div>
                          <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                            <span>{ocupadas} / {cap || "-"} alunos</span>
                            <span>Turno: {r.turno || "-"}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Turma</TableHead>
                <TableHead>Modelo Base</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Matriculados</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead>Turno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedTableData.map((g) => (
                <Fragment key={g.school}>
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/50">
                      <div className="flex items-center gap-2 font-semibold">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="truncate">{g.school}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {g.turmas.length} turmas
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {getTipoUnidadeLabel(g.turmas[0]?.cmeis?.tipo_unidade)}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  {g.turmas.map((r) => {
                    const ocupadas = studentsCount?.[r.id] || 0
                    const cap = r.capacidade ?? 0
                    return (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{r.nome || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.turma_base || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{cap || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ocupadas}</TableCell>
                      <TableCell>{getOccupationBadge(ocupadas, cap)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.turno || "-"}</TableCell>
                    </TableRow>
                    )
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </VagouListShell>
  )
}
