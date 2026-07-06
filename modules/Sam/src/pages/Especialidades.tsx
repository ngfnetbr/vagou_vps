// @ts-nocheck
import { useState, useEffect, useMemo } from "react"
import { Badge } from "@ui/badge"
import { Card, CardContent } from "@ui/card"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Plus, Activity, Trash2, CheckCircle2, XCircle, Search } from "lucide-react"
import { Skeleton } from "@ui/skeleton"
import { createSpecialty, deleteSpecialty, getSpecialties, toggleSpecialty, type Specialty } from "@sam/lib/actions/especialidades"
import { useCanAccess } from "@root/components/admin/PermissionGate"
import { VagouReportShell } from "@root/components/common/VagouReportShell"
import { EmptyState } from "@sam/components/common/empty-state"
import { toast } from "sonner"

export default function EspecialidadesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const canManage = useCanAccess(["sam.cadastros.especialidades.gerir"])

  const reload = () => getSpecialties().then(data => setSpecialties(data || []))

  useEffect(() => { reload().then(() => setLoading(false)) }, [])

  const stats = useMemo(() => ({
    total: specialties.length,
    ativas: specialties.filter(s => s.active).length,
    inativas: specialties.filter(s => !s.active).length,
  }), [specialties])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return specialties
    return specialties.filter(sp => sp.name.toLowerCase().includes(s))
  }, [specialties, search])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const result = await createSpecialty(formData)
    if (!result?.success) {
      toast.error(result?.error || "Não foi possível criar a especialidade.")
      return
    }
    toast.success("Especialidade criada.")
    e.currentTarget.reset()
    reload()
  }

  async function handleToggle(id: string) {
    const fd = new FormData()
    fd.set("id", id)
    const result = await toggleSpecialty(fd)
    if (!result?.success) {
      toast.error(result?.error || "Não foi possível atualizar a especialidade.")
      return
    }
    reload()
  }

  async function handleDelete(id: string) {
    const fd = new FormData()
    fd.set("id", id)
    const result = await deleteSpecialty(fd)
    if (!result?.success) {
      toast.error(result?.error || "Não foi possível excluir a especialidade.")
      return
    }
    toast.success("Especialidade excluída.")
    reload()
  }

  if (loading) return <div className="space-y-6 pb-10"><Skeleton className="h-10 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>

  return (
    <VagouReportShell
      title="Especialidades"
      description="Gerencie quais especialidades estão disponíveis para atendimento."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Activity} label="Total" value={stats.total} accent="text-primary" bg="bg-primary/10" />
        <StatCard icon={CheckCircle2} label="Ativas" value={stats.ativas} accent="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard icon={XCircle} label="Inativas" value={stats.inativas} accent="text-muted-foreground" bg="bg-muted" />
      </div>

      {canManage && (
        <Card className="shadow-sm border-none ring-1 ring-border">
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input name="name" placeholder="Nome da nova especialidade..." className="h-10 flex-1" required />
              <Button type="submit" className="h-10 px-4 gap-1.5"><Plus className="h-4 w-4" />Adicionar</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-none ring-1 ring-border">
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar especialidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title={search ? "Nenhuma especialidade encontrada" : "Nenhuma especialidade cadastrada"}
              description={search ? "Tente ajustar a busca." : "Adicione a primeira especialidade acima."}
            />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${s.active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                    <span className="font-medium text-sm truncate">{s.name}</span>
                    <Badge variant={s.active ? "default" : "outline"} className="text-[10px] shrink-0">{s.active ? "Ativa" : "Inativa"}</Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={() => handleToggle(s.id)} disabled={!canManage}>
                      {s.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s.id)} disabled={!canManage}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </VagouReportShell>
  )
}

function StatCard({ icon: Icon, label, value, accent, bg }: { icon: any; label: string; value: number; accent: string; bg: string }) {
  return (
    <Card className="shadow-sm border-none ring-1 ring-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${bg} ${accent}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}
