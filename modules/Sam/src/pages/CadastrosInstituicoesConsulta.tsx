import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Skeleton } from "@ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { PaginationControls } from "@ui/PaginationControls"
import { Badge } from "@ui/badge"
import { Building2, CheckCircle2, MapPin, XCircle } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { VagouListShell } from "@root/components/common/VagouListShell"

type CmeiRow = {
  id: string
  nome: string | null
  tipo_unidade: string | null
  tipo_gestao: string | null
  endereco: string | null
  bairro: string | null
  telefone: string | null
  ativo: boolean
}

function getTipoUnidadeLabel(tipo: string | null | undefined) {
  return (tipo || "cmei_creche") === "escola" ? "Escola" : "CMEI"
}

export default function CadastrosInstituicoesConsulta() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParam = searchParams.get("search") || ""
  const viewMode = (searchParams.get("view") || "table") === "grid" ? "grid" : "table"
  const pageParam = Number(searchParams.get("page") || "1")
  const pageSizeParam = Number(searchParams.get("pageSize") || "25")
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const pageSize = [10, 25, 50, 100].includes(pageSizeParam) ? pageSizeParam : 25

  const [searchTerm, setSearchTerm] = useState(searchParam)
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam)
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active")

  useEffect(() => {
    if (!searchParams.get("tipo")) return
    const next = new URLSearchParams(searchParams)
    next.delete("tipo")
    setSearchParams(next)
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (searchParams.get("view")) return
    const next = new URLSearchParams(searchParams)
    next.set("view", "table")
    setSearchParams(next)
  }, [searchParams, setSearchParams])

  const { data, isLoading, error } = useQuery({
    queryKey: ["sam-consulta-cmeis"],
    queryFn: async () => {
      let q: any = supabase
        .from("cmeis")
        .select("id, nome, tipo_unidade, tipo_gestao, endereco, bairro, telefone, ativo")
        .order("nome")
        .limit(500)

      const { data, error } = await q
      if (error) throw error
      return (data || []) as CmeiRow[]
    },
  })

  const { data: occupationStats } = useQuery({
    queryKey: ["sam-consulta-cmeis-occupation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("cmei_id, capacidade, criancas:criancas(count)")
        .eq("ativo", true)
      if (error) throw error
      const stats: Record<string, { capacidade: number; ocupadas: number }> = {}
      ;(data || []).forEach((t: any) => {
        const id = t.cmei_id
        if (!id) return
        if (!stats[id]) stats[id] = { capacidade: 0, ocupadas: 0 }
        stats[id].capacidade += t.capacidade || 0
        stats[id].ocupadas += t.criancas?.[0]?.count || 0
      })
      return stats
    },
  })

  const getOccupation = (cmeiId: string) => {
    const s = occupationStats?.[cmeiId]
    if (!s || s.capacidade === 0) return { percentage: 0, capacidade: s?.capacidade || 0, ocupadas: s?.ocupadas || 0 }
    return { percentage: Math.round((s.ocupadas / s.capacidade) * 100), capacidade: s.capacidade, ocupadas: s.ocupadas }
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

  const activeCount = useMemo(() => rows.filter((r) => r.ativo !== false).length, [rows])
  const inactiveCount = useMemo(() => rows.filter((r) => r.ativo === false).length, [rows])

  const filteredRows = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return rows.filter((r) => {
      const statusOk =
        statusFilter === "all" ? true : statusFilter === "active" ? r.ativo !== false : r.ativo === false

      if (!statusOk) return false

      if (!term) return true

      const nome = (r.nome || "").toLowerCase()
      const endereco = (r.endereco || "").toLowerCase()
      const bairro = (r.bairro || "").toLowerCase()
      return nome.includes(term) || endereco.includes(term) || bairro.includes(term)
    })
  }, [debouncedSearch, rows, statusFilter])

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const paginated = filteredRows.slice(startIdx, startIdx + pageSize)

  const setView = (mode: "grid" | "table") => {
    const next = new URLSearchParams(searchParams)
    next.set("view", mode)
    setSearchParams(next)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("active")
    const next = new URLSearchParams(searchParams)
    next.delete("search")
    next.delete("page")
    setSearchParams(next)
  }

  return (
    <VagouListShell
      title="Instituições"
      description={
        <div className="space-y-2">
          <div>Consulta de instituições com o tipo real cadastrado no município.</div>
          <div className="flex gap-2">
            <Badge variant="default">{activeCount} ativos</Badge>
            {inactiveCount > 0 ? <Badge variant="secondary">{inactiveCount} inativos</Badge> : null}
          </div>
        </div>
      }
      stats={[
        { title: "Total de Instituições", value: rows.length, subtitle: "unidades cadastradas", icon: Building2, accent: "primary" },
        { title: "Ativos", value: activeCount, subtitle: "em funcionamento", icon: CheckCircle2, accent: "success" },
        { title: "Inativos", value: inactiveCount, subtitle: "desativados", icon: XCircle, accent: "muted" },
      ]}
      search={{
        value: searchTerm,
        onChange: setSearchTerm,
        placeholder: "Buscar por nome ou endereço...",
      }}
      filters={
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      }
      onClear={clearFilters}
      showClear={!!searchTerm || statusFilter !== "active"}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">Erro ao carregar instituições.</div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma instituição encontrada</p>
          ) : (
            paginated.map((r) => (
              <Card key={r.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="truncate">{r.nome || "-"}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                      {getTipoUnidadeLabel(r.tipo_unidade)}
                    </Badge>
                    <Badge variant={r.tipo_gestao === "privado" ? "warning" : "info"} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                      {r.tipo_gestao === "privado" ? "Privado" : "Municipal"}
                    </Badge>
                  </CardTitle>
                  {r.endereco ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {r.endereco}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={r.ativo !== false ? "default" : "secondary"}>
                      {r.ativo !== false ? "Ativo" : "Inativo"}
                    </Badge>
                    {r.bairro ? <Badge variant="outline">{r.bairro}</Badge> : null}
                  </div>
                  {(() => {
                    const occ = getOccupation(r.id)
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{occ.ocupadas} / {occ.capacidade} alunos</span>
                          <Badge variant={occ.percentage > 90 ? "destructive" : occ.percentage > 50 ? "warning" : "success"}>
                            {occ.percentage}% ocupado
                          </Badge>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(occ.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Gestão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma instituição encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((r) => {
                  const occ = getOccupation(r.id)
                  return (
                  <TableRow key={r.id} className={r.ativo === false ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{r.nome || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={r.ativo !== false ? "default" : "secondary"}>
                        {r.ativo !== false ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={occ.percentage > 90 ? "destructive" : occ.percentage > 50 ? "warning" : "success"}>
                          {occ.percentage}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">{occ.ocupadas}/{occ.capacidade}</span>
                      </div>
                    </TableCell>
                    <TableCell>{r.endereco || "-"}</TableCell>
                    <TableCell>{r.bairro || "-"}</TableCell>
                    <TableCell>{r.telefone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {getTipoUnidadeLabel(r.tipo_unidade)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.tipo_gestao === "privado" ? "warning" : "info"} className="text-[10px]">
                        {r.tipo_gestao === "privado" ? "Privado" : "Municipal"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </VagouListShell>
  )
}
