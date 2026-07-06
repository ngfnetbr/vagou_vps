import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AppointmentActionsMenu } from "@sam/components/appointments/appointment-actions-menu"
import { Button } from "@ui/button"
import { Card, CardContent } from "@ui/card"
import { Input } from "@ui/input"
import { Plus, FileText, Clock, Calendar, LayoutGrid, LayoutList, Download } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { Skeleton } from "@ui/skeleton"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@sam/lib/utils"
import { useAuth } from "@root/contexts/AuthContext"
import { useCanAccess } from "@root/components/admin/PermissionGate"
import { SpecialtyBadge } from "@sam/components/common/specialty-badge"
import { getSpecialtyBorderClass } from "@sam/components/common/specialty-utils"
import { VagouListShell } from "@root/components/common/VagouListShell"
import { useDebouncedValue } from "@sam/hooks/use-debounced-value"
import { useLocalStorageState } from "@sam/hooks/use-local-storage-state"
import { EmptyState } from "@sam/components/common/empty-state"
import { PaginationControls } from "@ui/PaginationControls"
import html2pdf from "html2pdf.js"
import { Badge } from "@ui/badge"

const APPOINTMENTS_TABLE = "appointments"

type AttendanceItem = {
  id: string
  studentId: string | null
  professionalId: string | null
  studentName: string
  professionalName: string
  type: string
  status: string
  date: string
  time: string
  description: string | null
  dateISO: string
}

export default function AtendimentosPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AttendanceItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useLocalStorageState("atendimentos:search", "")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [typeFilter, setTypeFilter] = useLocalStorageState("atendimentos:type", "")
  const [statusFilter, setStatusFilter] = useLocalStorageState("atendimentos:status", "all")
  const { user } = useAuth()
  const canView = useCanAccess(["modulos.sam.acessar", "sam.atendimentos.visualizar"])
  const canCreate = useCanAccess(["modulos.sam.acessar", "sam.atendimentos.criar"])
  const [professionalFilter, setProfessionalFilter] = useLocalStorageState("atendimentos:professional", "")
  const [dateFrom, setDateFrom] = useLocalStorageState("atendimentos:dateFrom", "")
  const [dateTo, setDateTo] = useLocalStorageState("atendimentos:dateTo", "")
  const [viewMode, setViewMode] = useLocalStorageState<"list" | "grid">("atendimentos:viewMode", "list")
  const [sortDir, setSortDir] = useLocalStorageState<"desc" | "asc">("atendimentos:sortDir", "desc")
  const [currentPage, setCurrentPage] = useLocalStorageState<number>("atendimentos:page", 1)
  const [pageSize, setPageSize] = useLocalStorageState<number>("atendimentos:pageSize", 25)

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Todos" },
      { value: "scheduled", label: "Agendado", variant: "secondary" as const },
      { value: "in_progress", label: "Em andamento", variant: "default" as const },
      { value: "completed", label: "Finalizado", variant: "outline" as const },
      { value: "cancelled", label: "Cancelado", variant: "destructive" as const },
      { value: "missed", label: "Falta", variant: "warning" as const },
    ],
    []
  )

  const statusVariant = useMemo(() => {
    const map = new Map(statusOptions.map((s) => [s.value, (s as any).variant || "secondary"]))
    return (st: string) => map.get(st) || "secondary"
  }, [statusOptions])

  const statusLabel = useMemo(() => {
    const map = new Map(statusOptions.map((s) => [s.value, s.label]))
    return (st: string) => map.get(st) || st
  }, [statusOptions])

  async function loadPage() {
    setLoading(true)

    const from = (Math.max(1, currentPage) - 1) * pageSize
    const to = from + pageSize - 1

    let q: any = supabase
      .from(APPOINTMENTS_TABLE)
      .select(
        "id, date, type, description, student_id, professional_id, status, students:student_id(full_name), profiles:professional_id(full_name)",
        { count: "exact" }
      )
      .order("date", { ascending: sortDir === "asc" })

    if (statusFilter !== "all") q = q.eq("status", statusFilter)
    if (typeFilter) q = q.eq("type", typeFilter)
    if (professionalFilter) q = q.eq("professional_id", professionalFilter)
    if (dateFrom) q = q.gte("date", `${dateFrom}T00:00:00`)
    if (dateTo) q = q.lte("date", `${dateTo}T23:59:59`)

    const term = debouncedSearch.trim()
    if (term) {
      const [studentsRes, profsRes] = await Promise.all([
        supabase.from("students").select("id").ilike("full_name", `%${term}%`).limit(200),
        supabase.from("profiles").select("id").ilike("full_name", `%${term}%`).limit(200),
      ])

      const studentIds = (studentsRes.data || []).map((r: any) => r.id)
      const profIds = (profsRes.data || []).map((r: any) => r.id)
      const clauses: string[] = []
      if (studentIds.length) clauses.push(`student_id.in.(${studentIds.join(",")})`)
      if (profIds.length) clauses.push(`professional_id.in.(${profIds.join(",")})`)

      if (!clauses.length) {
        setItems([])
        setTotalItems(0)
        setLoading(false)
        return
      }

      q = q.or(clauses.join(","))
    }

    q = q.range(from, to)
    const { data, error, count } = await q

    if (error) {
      setItems([])
      setTotalItems(0)
      setLoading(false)
      return
    }

    const mapped: AttendanceItem[] = (data || []).map((a: any) => {
      const d = new Date(a.date)
      return {
        id: a.id,
        studentId: a.student_id || null,
        professionalId: a.professional_id || null,
        studentName: a.students?.full_name || "Aluno",
        professionalName: a.profiles?.full_name || "Profissional",
        type: a.type,
        status: a.status,
        date: format(d, "dd/MM/yyyy", { locale: ptBR }),
        time: format(d, "HH:mm"),
        description: a.description,
        dateISO: a.date,
      }
    })

    setItems(mapped)
    setTotalItems(count || 0)
    setLoading(false)
  }

  useEffect(() => {
    loadPage()
  }, [currentPage, dateFrom, dateTo, debouncedSearch, pageSize, professionalFilter, sortDir, statusFilter, typeFilter])

  const filtered = useMemo(() => items, [items])

  const types = useMemo(() => [...new Set(items.map(i => i.type))], [items])
  const professionals = useMemo(() => {
    const map = new Map<string, string>()
    for (const i of items) {
      if (i.professionalId) map.set(i.professionalId, i.professionalName)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  const groupedByDate = useMemo(() => {
    const map = new Map<string, AttendanceItem[]>()
    for (const i of filtered) {
      const key = i.date
      const list = map.get(key) || []
      list.push(i)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  const hasActiveFilters = !!(search.trim() || typeFilter || professionalFilter || dateFrom || dateTo || statusFilter !== "all")

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const hasNextPage = safePage < totalPages
  const hasPreviousPage = safePage > 1

  async function handleExportPdf() {
    const term = debouncedSearch.trim()
    let q: any = supabase
      .from(APPOINTMENTS_TABLE)
      .select("id, date, type, description, status, students:student_id(full_name), profiles:professional_id(full_name)")
      .order("date", { ascending: sortDir === "asc" })
      .limit(1000)

    if (statusFilter !== "all") q = q.eq("status", statusFilter)
    if (typeFilter) q = q.eq("type", typeFilter)
    if (professionalFilter) q = q.eq("professional_id", professionalFilter)
    if (dateFrom) q = q.gte("date", `${dateFrom}T00:00:00`)
    if (dateTo) q = q.lte("date", `${dateTo}T23:59:59`)

    if (term) {
      const [studentsRes, profsRes] = await Promise.all([
        supabase.from("students").select("id").ilike("full_name", `%${term}%`).limit(200),
        supabase.from("profiles").select("id").ilike("full_name", `%${term}%`).limit(200),
      ])

      const studentIds = (studentsRes.data || []).map((r: any) => r.id)
      const profIds = (profsRes.data || []).map((r: any) => r.id)
      const clauses: string[] = []
      if (studentIds.length) clauses.push(`student_id.in.(${studentIds.join(",")})`)
      if (profIds.length) clauses.push(`professional_id.in.(${profIds.join(",")})`)
      if (!clauses.length) return
      q = q.or(clauses.join(","))
    }

    const { data } = await q
    const rows = (data || []).map((r: any) => {
      const d = new Date(r.date)
      return {
        data: format(d, "dd/MM/yyyy", { locale: ptBR }),
        hora: format(d, "HH:mm"),
        aluno: r.students?.full_name || "-",
        profissional: r.profiles?.full_name || "-",
        tipo: r.type || "-",
        status: statusLabel(r.status),
        descricao: r.description || "",
      }
    })

    const title = `Relatório de Atendimentos (${dateFrom || "início"} a ${dateTo || "hoje"})`
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 16px;">
        <h1 style="font-size: 16px; margin: 0 0 8px 0;">${title}</h1>
        <p style="font-size: 10px; color: #666; margin: 0 0 16px 0;">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Data</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Hora</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Aluno</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Profissional</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Tipo</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 6px;">${r.data}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${r.hora}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${r.aluno}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${r.profissional}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${r.tipo}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${r.status}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `

    const element = document.createElement("div")
    element.innerHTML = html
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `relatorio_atendimentos_${new Date().getTime()}.pdf`,
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: "avoid-all" as const },
    }
    await html2pdf().set(opt).from(element).save()
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-border p-6 bg-muted/30 text-sm text-muted-foreground">
        Você não tem permissão para visualizar atendimentos.
      </div>
    )
  }

  return (
    <VagouListShell
      title="Atendimentos"
      description="Histórico de atendimentos realizados."
      actions={
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportPdf} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          {canCreate ? (
            <Button asChild className="w-full sm:w-auto shadow-sm">
              <Link to="/modulo/sam/atendimentos/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Registro
              </Link>
            </Button>
          ) : (
            <Button className="w-full sm:w-auto shadow-sm" disabled>
              <Plus className="mr-2 h-4 w-4" />
              Novo Registro
            </Button>
          )}
        </div>
      }
      search={{
        value: search,
        onChange: (v) => { setSearch(v); setCurrentPage(1) },
        placeholder: "Buscar por aluno ou profissional...",
      }}
      filters={
        <>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full sm:w-44"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
          >
            {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full sm:w-56"
            value={professionalFilter}
            onChange={e => { setProfessionalFilter(e.target.value); setCurrentPage(1) }}
          >
            <option value="">Todos os profissionais</option>
            {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full sm:w-48"
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1) }}
          >
            <option value="">Todos os tipos</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex gap-2 w-full sm:w-auto">
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }} />
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }} />
          </div>
        </>
      }
      onClear={() => {
        setSearch("")
        setTypeFilter("")
        setProfessionalFilter("")
        setDateFrom("")
        setDateTo("")
        setStatusFilter("all")
        setSortDir("desc")
        setCurrentPage(1)
      }}
      showClear={hasActiveFilters}
      pagination={
        !loading && totalItems > 0 ? (
          <PaginationControls
            currentPage={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1) }}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
          />
        ) : null
      }
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalItems}</span> registros
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="mr-2 h-4 w-4" />
            Lista
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Grade
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!user?.id}
            onClick={() => { setProfessionalFilter(user?.id || ""); setCurrentPage(1) }}
          >
            Meus
          </Button>
        </div>
      </div>


      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="Nenhum atendimento encontrado" />
      ) : (
        viewMode === "list" ? (
          <div className="space-y-4">
            {groupedByDate.map(([date, list]) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="text-sm font-semibold">{date}</div>
                  <div className="text-xs text-muted-foreground">{list.length} atendimentos</div>
                </div>
                <div className="space-y-2">
                  {list.map((item) => {
                    const borderClass = getSpecialtyBorderClass(item.type)
                    return (
                      <Card
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/modulo/sam/atendimentos/${item.id}`)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/modulo/sam/atendimentos/${item.id}`) }}
                        className={cn("hover:shadow-md transition-all cursor-pointer border-l-4", borderClass)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-sm truncate" title={item.studentName}>
                                  {item.studentName}
                                </span>
                                <SpecialtyBadge specialty={item.type} className="text-[10px]" />
                                <Badge variant={statusVariant(item.status)} className="text-[10px]">{statusLabel(item.status)}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground truncate" title={item.professionalName}>
                                {item.professionalName}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1">
                              <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                <Clock className="h-3 w-3" />
                                {item.time}
                              </div>
                              {canCreate && (
                                <AppointmentActionsMenu
                                  appointmentId={item.id}
                                  currentDate={item.dateISO}
                                  studentName={item.studentName}
                                  status={item.status}
                                  onUpdated={loadPage}
                                />
                              )}
                            </div>
                          </div>

                          {item.description ? (
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-2">{item.description}</div>
                          ) : null}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((item) => {
              const borderClass = getSpecialtyBorderClass(item.type)
              return (
                <Card
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/modulo/sam/atendimentos/${item.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/modulo/sam/atendimentos/${item.id}`) }}
                  className={cn("hover:shadow-md transition-all cursor-pointer border-l-4 h-full", borderClass)}
                >
                  <CardContent className="p-4 h-full flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate" title={item.studentName}>{item.studentName}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.professionalName}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <SpecialtyBadge specialty={item.type} className="text-[10px]" />
                        {canCreate && (
                          <AppointmentActionsMenu
                            appointmentId={item.id}
                            currentDate={item.dateISO}
                            studentName={item.studentName}
                            status={item.status}
                            onUpdated={loadPage}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(item.status)} className="text-[10px]">{statusLabel(item.status)}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{item.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.time}</span>
                    </div>
                    {item.description ? (
                      <div className="text-xs text-muted-foreground line-clamp-3">{item.description}</div>
                    ) : null}
                  </CardContent>
                </Card>
                )
            })}
          </div>
        )
      )}
    </VagouListShell>
  )
}

