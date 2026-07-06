// @ts-nocheck
import { useEffect, useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { Link, useLocation } from "react-router-dom"
import { supabase } from "@sam/integrations/supabase/client"
import { useAuth } from "@root/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
import { Button } from "@ui/button"
import { StatCard } from "@sam/components/dashboard/stat-card"
import { AlertTriangle, FileText, Clock, CheckCircle, ArrowRight, TrendingUp, Send } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { normalizeComplaintStatus, normalizeReferralStatus } from "@sam/lib/complaintsStatus"

const APPOINTMENTS_TABLE = "appointments"
const SCHOOL_COMPLAINTS_TABLE = "school_complaints"

const COLORS = [
  'hsl(217, 71%, 45%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 65%, 55%)',
]

const tooltipStyle = {
  background: 'hsl(0, 0%, 100%)',
  border: '1px solid hsl(214, 32%, 91%)',
  borderRadius: '0.75rem',
  fontSize: '0.875rem',
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-warning/10 text-warning border-warning/20" },
  in_review: { label: "Em Análise", color: "bg-info/10 text-info border-info/20" },
  scheduled: { label: "Agendado", color: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Concluído", color: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive border-destructive/20" },
}

export default function EscolaDashboardPage() {
  const { profile } = useAuth()
  const location = useLocation()
  const modulePrefix = location.pathname.startsWith("/modulo/sam") ? "/modulo/sam" : ""
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0, pending: 0, inReview: 0, scheduled: 0, completed: 0, withReferral: 0,
  })
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([])
  const [monthlyData, setMonthlyData] = useState<{ name: string; total: number }[]>([])
  const [diagnosisData, setDiagnosisData] = useState<{ name: string; value: number }[]>([])
  const [recentComplaints, setRecentComplaints] = useState<any[]>([])
  const [linkedAppointments, setLinkedAppointments] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const schoolId = profile?.school_id
      if (!schoolId) { setLoading(false); return }

      const complaintsQuery: any = supabase
        .from(SCHOOL_COMPLAINTS_TABLE)
        .select("id, status, protocol, primary_complaint, referral_requested, referral_status, diagnosis_tags, laudo_type, created_at, students(full_name)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })

      const appointmentsQuery: any = supabase
        .from(APPOINTMENTS_TABLE)
        .select("id, date, status, type, complaint_id")
        .not("complaint_id", "is", null)

      const [complaintsRes0, appointmentsRes] = await Promise.all([complaintsQuery, appointmentsQuery])

      let complaintsRes: any = complaintsRes0
      if (complaintsRes?.error) {
        const msg = String(complaintsRes.error?.message || "")
        const code = String(complaintsRes.error?.code || "")
        const missingReferralColumn = code === "42703" || /referral_status/i.test(msg)
        if (missingReferralColumn) {
          complaintsRes = await supabase
            .from(SCHOOL_COMPLAINTS_TABLE)
            .select("id, status, protocol, primary_complaint, referral_requested, diagnosis_tags, laudo_type, created_at, students(full_name)")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
        }
      }

      const complaints = complaintsRes.data || []
      const appointments = appointmentsRes.data || []

      const normalizedComplaints = complaints.map((c: any) => ({
        ...c,
        status: normalizeComplaintStatus(c.status),
        referral_status: normalizeReferralStatus(c.referral_status, c.referral_requested),
      }))

      // Filter appointments linked to this school's complaints
      const complaintIds = new Set(normalizedComplaints.map((c: any) => c.id))
      const linked = appointments.filter((a: any) => complaintIds.has(a.complaint_id))
      setLinkedAppointments(linked.slice(0, 5))

      // Stats
      const pending = normalizedComplaints.filter((c: any) => c.status === "pending").length
      const inReview = normalizedComplaints.filter((c: any) => c.status === "in_review").length
      const scheduled = normalizedComplaints.filter((c: any) => c.status === "scheduled").length
      const completed = normalizedComplaints.filter((c: any) => c.status === "completed").length
      const withReferral = normalizedComplaints.filter((c: any) => c.referral_status !== "none").length

      setStats({ total: normalizedComplaints.length, pending, inReview, scheduled, completed, withReferral })

      // Status pie
      const statusCounts = [
        { name: "Pendente", value: pending },
        { name: "Em Análise", value: inReview },
        { name: "Agendado", value: scheduled },
        { name: "Concluído", value: completed },
      ].filter((s) => s.value > 0)
      setStatusData(statusCounts)

      // Monthly bar chart (last 6 months)
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
      const today = new Date()
      const monthMap = new Map<string, number>()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        monthMap.set(`${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, 0)
      }
      normalizedComplaints.forEach((c: any) => {
        const d = new Date(c.created_at)
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
        if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) || 0) + 1)
      })
      setMonthlyData(Array.from(monthMap.entries()).map(([name, total]) => ({ name, total })))

      // Diagnosis tags aggregation
      const tagCounts: Record<string, number> = {}
      normalizedComplaints.forEach((c: any) => {
        const tags: string[] = (c.diagnosis_tags || [])
        tags.forEach((tag: string) => {
          const t = tag.trim()
          if (t) tagCounts[t] = (tagCounts[t] || 0) + 1
        })
        if (c.laudo_type) {
          tagCounts[c.laudo_type] = (tagCounts[c.laudo_type] || 0) + 1
        }
      })
      setDiagnosisData(
        Object.entries(tagCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      )

      setRecentComplaints(normalizedComplaints.slice(0, 5))
      setLoading(false)
    }
    load()
  }, [profile])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const appointmentStatusLabel: Record<string, string> = {
    scheduled: "Agendado",
    completed: "Realizado",
    missed: "Faltou",
    cancelled: "Cancelado",
  }

  return (
    <>
      <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Painel da Escola</h2>
        <p className="text-xs text-muted-foreground mt-1">Acompanhe suas queixas e encaminhamentos.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Queixas"
          value={stats.total}
          subtitle="Registradas pela escola"
          icon={FileText}
          accentColor="border-l-primary"
          iconClassName="text-primary"
        />
        <StatCard
          title="Pendentes"
          value={stats.pending}
          subtitle="Aguardando análise"
          icon={Clock}
          accentColor="border-l-warning"
          iconClassName="text-warning"
        />
        <StatCard
          title="Encaminhamentos"
          value={stats.withReferral}
          subtitle="Com pedido de atendimento"
          icon={Send}
          accentColor="border-l-info"
          iconClassName="text-info"
        />
        <StatCard
          title="Concluídos"
          value={stats.completed}
          subtitle="Queixas finalizadas"
          icon={CheckCircle}
          accentColor="border-l-success"
          iconClassName="text-success"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Monthly bar */}
        <Card className="col-span-4 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground">Queixas por Mês</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" stroke="hsl(215, 15%, 47%)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(215, 15%, 47%)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'hsl(210, 20%, 95%)' }} contentStyle={tooltipStyle} />
                <Bar dataKey="total" name="Queixas" fill="hsl(217, 71%, 45%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card className="col-span-3 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground">Status das Queixas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {statusData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {statusData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Nenhuma queixa registrada</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diagnosis tags + Recent complaints */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Diagnosis tags */}
        <Card className="rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Diagnósticos / Transtornos</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Baseado nas tags e laudos das queixas</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {diagnosisData.length > 0 ? (
              <div className="space-y-3">
                {diagnosisData.map((item, i) => {
                  const max = diagnosisData[0]?.value || 1
                  const pct = Math.round((item.value / max) * 100)
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">{item.name}</span>
                        <Badge variant="secondary" className="text-xs font-semibold">{item.value}</Badge>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                Nenhum diagnóstico registrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent complaints */}
        <Card className="rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <CardTitle className="text-sm font-semibold text-foreground">Queixas Recentes</CardTitle>
              </div>
              <Link to={`${modulePrefix}/escola/queixas`}>
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {recentComplaints.length > 0 ? (
              <div className="space-y-3">
                {recentComplaints.map((c: any) => {
                  const st = statusMap[c.status] || statusMap.pending
                  return (
                    <Link
                      key={c.id}
                      to={`${modulePrefix}/escola/queixas/${c.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {(c.students as any)?.full_name || "Aluno"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.protocol} · {c.primary_complaint?.substring(0, 40)}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${st.color}`}>
                        {st.label}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Nenhuma queixa registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linked appointments */}
      {linkedAppointments.length > 0 && (
        <Card className="rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-success/10 text-success rounded-lg">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Atendimentos Vinculados</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Sessões clínicas agendadas a partir das queixas</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {linkedAppointments.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {appointmentStatusLabel[a.status] || a.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  )
}
