// @ts-nocheck
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams, Link } from "react-router-dom"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Skeleton } from "@ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { PaginationControls } from "@ui/PaginationControls"
import { Badge } from "@ui/badge"
import { Clock, Users, UserCheck, UserPlus, Check } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { VagouListShell } from "@root/components/common/VagouListShell"
import SexoIcon from "@root/components/common/SexoIcon"
import { Button } from "@ui/button"
import { useToast } from "@root/hooks/use-toast"
import { getSelectedStudentIds, selectStudent, unselectStudent } from "@sam/lib/actions/students-sam"

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
  
  const pageParam = Number(searchParams.get("page") || "1")
  const pageSizeParam = Number(searchParams.get("pageSize") || "25")
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const pageSize = [10, 25, 50, 100].includes(pageSizeParam) ? pageSizeParam : 25

  const [searchTerm, setSearchTerm] = useState(searchParam)
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam)
  const [sortBy, setSortBy] = useState<"nome" | "data_nascimento" | "created_at">("nome")
  const [tipoFilter, setTipoFilter] = useState<string>("all")
  const [unidadeFilter, setUnidadeFilter] = useState<string>("all")
  const [samFilter, setSamFilter] = useState<string>("all")



  useEffect(() => {
    if (searchParams.get("view")) return
    const next = new URLSearchParams(searchParams)
    next.set("view", "table")
    setSearchParams(next)
  }, [searchParams, setSearchParams])

  const { data, isLoading, error } = useQuery({
    queryKey: ["sam-consulta-criancas"],
    queryFn: async () => {
      const PAGE = 1000
      let from = 0
      const all: CriancaRow[] = []
      // Busca todos os alunos (CMEIs e escolas) paginando para passar do limite de 1000
      while (true) {
        const { data, error } = await supabase
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
          .range(from, from + PAGE - 1)
        if (error) throw error
        const batch = (data || []) as unknown as CriancaRow[]
        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }
      return all
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

  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)

  const refreshSelected = useMemo(
    () => async () => {
      const set = await getSelectedStudentIds()
      setSelectedIds(set)
    },
    []
  )

  useEffect(() => {
    refreshSelected()
  }, [refreshSelected])


  const handleToggleSelect = async (id: string, isSelected: boolean) => {
    setPendingId(id)
    const result = isSelected ? await unselectStudent(id) : await selectStudent(id)
    if (result?.success) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (isSelected) next.delete(id)
        else next.add(id)
        return next
      })
      toast({ title: isSelected ? "Aluno removido do SAM" : "Aluno selecionado para o SAM" })
    } else {
      toast({ title: "Não foi possível concluir", description: result?.error || "Tente novamente.", variant: "destructive" })
    }
    setPendingId(null)
  }


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
      const tipo = (r.cmei_atual?.tipo_unidade || "cmei_creche") === "escola" ? "escola" : "cmei"
      if (tipoFilter !== "all" && tipo !== tipoFilter) return false
      if (unidadeFilter !== "all" && (r.cmei_atual?.nome || "-") !== unidadeFilter) return false
      if (samFilter === "selected" && !selectedIds.has(r.id)) return false
      if (samFilter === "not_selected" && selectedIds.has(r.id)) return false
      if (!term) return true

      const nome = (r.nome || "").toLowerCase()
      const resp = (r.responsavel_nome || "").toLowerCase()
      const protocolo = (r.protocolo || "").toLowerCase()
      return nome.includes(term) || resp.includes(term) || protocolo.includes(term)
    })
  }, [debouncedSearch, rows, tipoFilter, unidadeFilter, samFilter, selectedIds])


  const unidadeOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      const tipo = (r.cmei_atual?.tipo_unidade || "cmei_creche") === "escola" ? "escola" : "cmei"
      if (tipoFilter !== "all" && tipo !== tipoFilter) return
      if (r.cmei_atual?.nome) set.add(r.cmei_atual.nome)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows, tipoFilter])


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
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const paginated = filteredRows.slice(startIdx, startIdx + pageSize)

  const matriculadas = rows.filter((r) => r.status === "Matriculado" || r.status === "Matriculada").length
  const filaEspera = rows.filter((r) => r.status === "Fila de Espera" || r.status === "Convocado").length

  const clearFilters = () => {
    setSearchTerm("")
    setSortBy("nome")
    setTipoFilter("all")
    setUnidadeFilter("all")
    setSamFilter("all")

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
          <div>Cadastro e gerenciamento dos alunos do sistema</div>
          <div className="flex gap-2">
            <Badge variant="secondary">{totalItems} registros</Badge>
          </div>
        </div>
      }
      stats={[
        { title: "Total", value: rows.length, subtitle: "no resultado atual", icon: Users, accent: "primary" },
        { title: "Matriculados", value: matriculadas, subtitle: "com matrícula ativa", icon: UserCheck, accent: "success" },
        { title: "Fila de Espera", value: filaEspera, subtitle: "na fila (inclui convocados)", icon: Clock, accent: "warning" },
      ]}
      search={{
        value: searchTerm,
        onChange: setSearchTerm,
        placeholder: "Buscar por nome, responsável ou protocolo...",
        widthClassName: "sm:w-96",
      }}
      filters={
        <>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome (A-Z)</SelectItem>
              <SelectItem value="data_nascimento">Data de Nascimento</SelectItem>
              <SelectItem value="created_at">Data de Cadastro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setUnidadeFilter("all") }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo de unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              <SelectItem value="cmei">CMEIs</SelectItem>
              <SelectItem value="escola">Escolas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              {unidadeOptions.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={samFilter} onValueChange={setSamFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="SAM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos (SAM)</SelectItem>
              <SelectItem value="selected">Selecionados no SAM</SelectItem>
              <SelectItem value="not_selected">Não selecionados</SelectItem>
            </SelectContent>
          </Select>
        </>

      }
      onClear={clearFilters}
      showClear={!!searchTerm || sortBy !== "nome" || tipoFilter !== "all" || unidadeFilter !== "all" || samFilter !== "all"}

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
        <div className="rounded-md border p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">Erro ao carregar crianças.</div>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum resultado.</p>
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
                <TableHead className="text-right">SAM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((r) => {
                const isSelected = selectedIds.has(r.id)
                return (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <Link to={isSelected ? `/modulo/sam/alunos/${r.id}/prontuario` : `/modulo/sam/alunos/${r.id}`} className="block">
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
                  <TableCell className="text-right">
                    <Button
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      disabled={pendingId === r.id}
                      onClick={() => handleToggleSelect(r.id, isSelected)}
                    >
                      {isSelected ? (
                        <><Check className="mr-1 h-3.5 w-3.5" />No SAM</>
                      ) : (
                        <><UserPlus className="mr-1 h-3.5 w-3.5" />Selecionar</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </VagouListShell>
  )
}
