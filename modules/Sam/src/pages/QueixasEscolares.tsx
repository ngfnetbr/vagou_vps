import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Badge } from "@ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table"
import { Plus, MessageSquare, FileText, Forward, Tag, CheckCircle2, Clock } from "lucide-react"
import { getComplaints } from "@sam/lib/actions/queixas"
import { useAuth } from "@root/contexts/AuthContext"
import { useCanAccess } from "@root/components/admin/PermissionGate"
import { useDebouncedValue } from "@sam/hooks/use-debounced-value"
import { useLocalStorageState } from "@sam/hooks/use-local-storage-state"
import { EmptyState } from "@sam/components/common/empty-state"
import { VagouListShell } from "@root/components/common/VagouListShell"
import {
  getComplaintStatusLabel,
  getComplaintStatusVariant,
  getReferralStatusLabel,
  getReferralStatusVariant,
  normalizeComplaintStatus,
  normalizeReferralStatus,
  type ComplaintStatus,
} from "@sam/lib/complaintsStatus"

const selectableStatus: Array<{ value: ComplaintStatus; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "in_review", label: "Em Análise" },
  { value: "scheduled", label: "Agendado" },
  { value: "completed", label: "Concluído" },
  { value: "rejected", label: "Rejeitado" },
]

export default function QueixasEscolares() {
  const { profile } = useAuth()
  const location = useLocation()
  const modulePrefix = location.pathname.startsWith("/modulo/sam") ? "/modulo/sam" : ""
  const isSchoolPortal = location.pathname.startsWith(`${modulePrefix}/escola`) || location.pathname.startsWith("/escola")
  const basePath = `${modulePrefix}${isSchoolPortal ? "/escola/queixas" : "/queixas"}`
  const schoolId = profile?.school_id || ""

  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useLocalStorageState("queixas:search", "")
  const debouncedSearch = useDebouncedValue(search, 250)
  const [tagFilter, setTagFilter] = useLocalStorageState("queixas:tag", "")
  const [statusFilter, setStatusFilter] = useLocalStorageState("queixas:status", "all")
  const [sortBy, setSortBy] = useLocalStorageState<"created_at_desc" | "created_at_asc" | "protocol">("queixas:sortBy", "created_at_desc")
  const canView = useCanAccess(["modulos.sam.acessar", "sam.queixas.visualizar"])
  const canCreate = useCanAccess(["modulos.sam.acessar", "sam.queixas.criar"])
  const canCreateComplaint = canCreate && (!isSchoolPortal || !!schoolId)

  useEffect(() => {
    if (isSchoolPortal && !schoolId) {
      setComplaints([])
      setLoading(false)
      return
    }

    const filters: any = {}
    if (isSchoolPortal) filters.schoolId = schoolId
    if (statusFilter !== "all") filters.status = statusFilter

    setLoading(true)
    getComplaints(filters).then((data) => {
      setComplaints(data)
      setLoading(false)
    })
  }, [isSchoolPortal, schoolId, statusFilter])

  const filtered = useMemo(() => {
    const s = debouncedSearch.trim().toLowerCase()
    const tag = tagFilter.trim().toLowerCase()
    const list = complaints.filter((c) => {
      if (s) {
        const text = `${(c as any).students?.full_name || ''} ${(c as any).schools?.name || ''} ${c.protocol} ${c.primary_complaint}`.toLowerCase()
        if (!text.includes(s)) return false
      }

      if (tag) {
        const tags = ((c as any).diagnosis_tags || []) as string[]
        const ok = tags.some((t) => String(t).toLowerCase().includes(tag))
        if (!ok) return false
      }

      return true
    })

    const sorted = list.slice()
    if (sortBy === "protocol") sorted.sort((a, b) => String(a.protocol || "").localeCompare(String(b.protocol || "")))
    else if (sortBy === "created_at_asc") sorted.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")))
    else sorted.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    return sorted
  }, [complaints, debouncedSearch, sortBy, tagFilter])

  const stats = useMemo(() => {
    const total = complaints.length
    const pendentes = complaints.filter((c) => {
      const n = normalizeComplaintStatus(c.status)
      return n === "pending" || n === "in_review"
    }).length
    const concluidas = complaints.filter((c) => normalizeComplaintStatus(c.status) === "completed").length
    return { total, pendentes, concluidas }
  }, [complaints])

  if (!canView) {
    return (
      <div className="rounded-2xl border p-6 bg-muted/30 text-sm text-muted-foreground">
        Você não tem permissão para visualizar queixas.
      </div>
    )
  }

  return (
    <VagouListShell
      title="Queixas Escolares"
      description="Registro e acompanhamento de solicitações de atendimento"
      actions={
        canCreateComplaint ? (
          <Button asChild className="gap-2">
            <Link to={`${basePath}/nova`}><Plus className="h-4 w-4" /> Nova Queixa</Link>
          </Button>
        ) : (
          <Button disabled className="gap-2">
            <Plus className="h-4 w-4" /> Nova Queixa
          </Button>
        )
      }
      stats={[
        { title: "Total de queixas", value: stats.total, subtitle: "registros", icon: FileText, accent: "primary" },
        { title: "Pendentes", value: stats.pendentes, subtitle: "aguardando análise", icon: Clock, accent: "warning" },
        { title: "Concluídas", value: stats.concluidas, subtitle: "atendidas", icon: CheckCircle2, accent: "success" },
      ]}
      search={{
        value: search,
        onChange: setSearch,
        placeholder: isSchoolPortal ? "Buscar por aluno ou protocolo..." : "Buscar por aluno, instituição ou protocolo...",
      }}
      filters={
        <>
          <div className="relative w-full sm:w-[200px]">
            <Tag className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por tag..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {selectableStatus.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">Mais recentes</SelectItem>
              <SelectItem value="created_at_asc">Mais antigas</SelectItem>
              <SelectItem value="protocol">Protocolo</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
      onClear={() => {
        setSearch("")
        setTagFilter("")
        setStatusFilter("all")
        setSortBy("created_at_desc")
      }}
      showClear={!!search || !!tagFilter || statusFilter !== "all" || sortBy !== "created_at_desc"}
    >
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : isSchoolPortal && !schoolId ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="Escola não vinculada a este usuário"
          description="Solicite ao administrador para vincular o Portal da Escola a uma unidade."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="Nenhuma queixa encontrada" />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead>Aluno</TableHead>
                {!isSchoolPortal ? <TableHead>Instituição</TableHead> : null}
                <TableHead>Queixa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Encam.</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const normalized = normalizeComplaintStatus(c.status)
                const st = { label: getComplaintStatusLabel(normalized), variant: getComplaintStatusVariant(normalized) }
                const referral = normalizeReferralStatus((c as any).referral_status, (c as any).referral_requested)
                const referralBadge = referral !== "none"
                return (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{c.protocol}</TableCell>
                    <TableCell>{(c as any).students?.full_name || '-'}</TableCell>
                    {!isSchoolPortal ? <TableCell className="text-sm">{(c as any).schools?.name || '-'}</TableCell> : null}
                    <TableCell className="max-w-[200px] truncate text-sm">{c.primary_complaint}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell>
                      {referralBadge ? (
                        <Badge variant={getReferralStatusVariant(referral)} className="gap-1 text-xs">
                          <Forward className="h-3 w-3" /> {getReferralStatusLabel(referral)}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`${basePath}/${c.id}`}><MessageSquare className="h-4 w-4" /></Link>
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
