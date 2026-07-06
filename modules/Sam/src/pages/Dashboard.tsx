import { useEffect, useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent } from "@ui/card"
import { Users, ClipboardList, Clock, UserCheck, BarChart3, Activity, Building2 } from "lucide-react"
import { Button } from "@ui/button"
import { Badge } from "@ui/badge"
import { Link } from "react-router-dom"
import { supabase } from "@sam/integrations/supabase/client"
import { DashboardCharts } from "@sam/components/dashboard/charts"
import { StatCard } from "@sam/components/dashboard/stat-card"
import { DashboardView } from "@sam/components/dashboard/dashboard-view"
import { AppointmentActionsMenu } from "@sam/components/appointments/appointment-actions-menu"
import { Avatar, AvatarFallback } from "@ui/avatar"
import { startOfWeek, endOfWeek, startOfDay, endOfDay, format } from "date-fns"
import { ptBR } from "date-fns/locale"


const APPOINTMENTS_TABLE = "appointments"
const APPOINTMENT_SPECIALTY_NOTES_TABLE = "appointment_specialty_notes"
const SCHOOL_COMPLAINTS_TABLE = "school_complaints"

const statusLabels: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "bg-info/10 text-info border-info/20" },
  completed: { label: "Concluído", className: "bg-success/10 text-success border-success/20" },
  missed: { label: "Faltou", className: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [totalStudents, setTotalStudents] = useState(0)
  const [waitingStudents, setWaitingStudents] = useState(0)
  const [appointmentsToday, setAppointmentsToday] = useState(0)
  const [totalProfessionals, setTotalProfessionals] = useState(0)
  const [totalSchools, setTotalSchools] = useState(0)
  const [chartDataDays, setChartDataDays] = useState<any[]>([])
  const [chartDataMonths, setChartDataMonths] = useState<any[]>([])
  const [chartDataEspecialidades, setChartDataEspecialidades] = useState<any[]>([])
  const [dificuldadesData, setDificuldadesData] = useState<any[]>([])
  const [tiposQueixaData, setTiposQueixaData] = useState<any[]>([])
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [waitingList, setWaitingList] = useState<any[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("vagou_preferred_module", "sam");
  }, []);

  useEffect(() => {
    async function loadData() {
      const today = new Date()
      const sToday = startOfDay(today).toISOString()
      const eToday = endOfDay(today).toISOString()
      const sWeek = startOfWeek(today, { weekStartsOn: 1 })
      const eWeek = endOfWeek(today, { weekStartsOn: 1 })

      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString()
      const studentsQ = supabase.from("students").select("*", { count: "exact", head: true })
      const waitingQ = supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "waiting")
      const todayQ = supabase.from(APPOINTMENTS_TABLE).select("*", { count: "exact", head: true }).gte("date", sToday).lte("date", eToday)
      let professionalsQ = supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active")
      const schoolsQ = supabase.from("schools").select("*", { count: "exact", head: true }).eq("active", true)
      const weekQ = supabase.from(APPOINTMENTS_TABLE).select("date, type, status").gte("date", sWeek.toISOString()).lte("date", eWeek.toISOString())
      const recentQ = supabase.from(APPOINTMENTS_TABLE).select("id, date, type, status, student_id, professional_id").order("date", { ascending: false }).limit(5)
      const waitingListQ = supabase.from("students").select("id, full_name, school_id, created_at, schools(name)").eq("status", "waiting").order("created_at", { ascending: true }).limit(5)
      const notesQ = supabase.from(APPOINTMENT_SPECIALTY_NOTES_TABLE).select("anamnese, avaliacao_especifica, observacoes_comportamentais, historico_escolar")
      const monthlyQ = supabase.from(APPOINTMENTS_TABLE).select("date, type").gte("date", sixMonthsAgo)
      const complaintsQ = supabase.from(SCHOOL_COMPLAINTS_TABLE).select("primary_complaint, diagnosis_tags, laudo_type")

      const [
        studentsRes,
        waitingRes,
        todayRes,
        professionalsRes,
        schoolsRes,
        weekRes,
        recentRes,
        waitingListRes,
        notesRes,
        monthlyRes,
        complaintsRes,
      ] = await Promise.all([studentsQ, waitingQ, todayQ, professionalsQ, schoolsQ, weekQ, recentQ, waitingListQ, notesQ, monthlyQ, complaintsQ])

      setTotalStudents(studentsRes.count || 0)
      setWaitingStudents(waitingRes.count || 0)
      setAppointmentsToday(todayRes.count || 0)
      setTotalProfessionals(professionalsRes.count || 0)
      setTotalSchools(schoolsRes.count || 0)
      setWaitingList(waitingListRes.data || [])

      // Charts - days of week
      const daysOfWeek = ["Seg", "Ter", "Qua", "Qui", "Sex"]
      const days = daysOfWeek.map((d) => ({ name: d, total: 0 }))
      weekRes.data?.forEach((app: any) => {
        const idx = new Date(app.date).getDay()
        if (idx >= 1 && idx <= 5) days[idx - 1].total += 1
      })
      setChartDataDays(days)

      // Charts - by month (last 6 months)
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
      const monthMap = new Map<string, number>()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
        monthMap.set(key, 0)
      }
      monthlyRes.data?.forEach((app: any) => {
        const d = new Date(app.date)
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
        if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) || 0) + 1)
      })
      setChartDataMonths(Array.from(monthMap.entries()).map(([name, total]) => ({ name, total })))

      // Charts - by specialty/type (all time from monthly data)
      const specMap = new Map<string, number>()
      monthlyRes.data?.forEach((app: any) => {
        const t = app.type || "Outros"
        specMap.set(t, (specMap.get(t) || 0) + 1)
      })
      const specData = Array.from(specMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
      setChartDataEspecialidades(specData.length > 0 ? specData : [{ name: "Sem dados", value: 0 }])

      // Classify transtornos from notes + complaints diagnosis_tags + laudo_type
      const classifyCounts: Record<string, number> = {}
      const typeCounts: Record<string, number> = {}
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const rules: [string, string[]][] = [
        ['TEA', ['tea', 'transtorno do espectro autista', 'autismo', 'autista']],
        ['TDAH', ['tdah', 'deficit de atencao', 'hiperatividade']],
        ['Dislexia', ['dislexia']],
        ['Discalculia', ['discalculia']],
        ['TOD', ['tod', 'transtorno opositor', 'desafiador']],
        ['Def. Intelectual', ['deficiencia intelectual']],
        ['Ansiedade', ['ansiedade']],
        ['Atraso Linguagem', ['atraso de linguagem', 'atraso linguagem']],
      ]

      // From specialty notes
      for (const note of (notesRes.data || [])) {
        const allText = normalize(
          [note.anamnese, note.avaliacao_especifica, note.observacoes_comportamentais, note.historico_escolar]
            .filter(Boolean).join(' ')
        )
        if (!allText.trim()) continue
        for (const [category, terms] of rules) {
          if (terms.some((t) => allText.includes(t))) {
            classifyCounts[category] = (classifyCounts[category] || 0) + 1
          }
        }
      }

      // From complaints diagnosis_tags and laudo_type
      for (const complaint of (complaintsRes.data || [])) {
        const primaryComplaint = String((complaint as any).primary_complaint || "").trim()
        const complaintKey = primaryComplaint || "Não informado"
        typeCounts[complaintKey] = (typeCounts[complaintKey] || 0) + 1

        const tags: string[] = (complaint as any).diagnosis_tags || []
        const laudoType: string = (complaint as any).laudo_type || ''
        const allText = normalize([...tags, laudoType].join(' '))
        if (!allText.trim()) continue
        for (const [category, terms] of rules) {
          if (terms.some((t) => allText.includes(t))) {
            classifyCounts[category] = (classifyCounts[category] || 0) + 1
          }
        }
      }

      const diffData = Object.entries(classifyCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
      setDificuldadesData(diffData)

      const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
      const top = typeEntries.slice(0, 8).map(([name, value]) => ({ name, value }))
      const others = typeEntries.slice(8).reduce((acc, [, v]) => acc + v, 0)
      setTiposQueixaData(others > 0 ? [...top, { name: "Outros", value: others }] : top)

      // Recent appointments with names
      if (recentRes.data && recentRes.data.length > 0) {
        const studentIds = [...new Set(recentRes.data.map((a: any) => a.student_id).filter(Boolean))]
        const profIds = [...new Set(recentRes.data.map((a: any) => a.professional_id).filter(Boolean))]

        const [studentsRes, profilesRes] = await Promise.all([
          studentIds.length
            ? supabase.from("students").select("id, full_name").in("id", studentIds)
            : { data: [] as any[] },
          profIds.length
            ? supabase.from("profiles").select("id, full_name").in("id", profIds)
            : { data: [] as any[] },
        ])

        const nameMap = new Map((studentsRes.data || []).map((c: any) => [c.id, c.full_name]))
        const profMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.full_name]))

        setRecentAppointments(
          recentRes.data.map((a: any) => ({
            ...a,
            studentName: nameMap.get(a.student_id) || "-",
            professionalName: profMap.get(a.professional_id) || "-",
          }))
        )
      }

      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const overviewContent = (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Alunos Cadastrados"
          value={totalStudents}
          subtitle="Total no sistema (cache)"
          icon={Users}
          accentColor="border-l-primary"
          iconClassName="text-primary"
        />
        <StatCard
          title="Fila de Espera"
          value={waitingStudents}
          subtitle="Aguardando atendimento"
          icon={Clock}
          accentColor="border-l-warning"
          iconClassName="text-warning"
        />
        <StatCard
          title="Atendimentos Hoje"
          value={appointmentsToday}
          subtitle={format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          icon={ClipboardList}
          accentColor="border-l-success"
          iconClassName="text-success"
        />
        <StatCard
          title="Profissionais Ativos"
          value={totalProfessionals}
          subtitle={`${totalSchools} instituição(ões) cadastrada(s)`}
          icon={UserCheck}
          accentColor="border-l-info"
          iconClassName="text-info"
        />
      </div>

      {/* Bottom cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Waiting list */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Fila de Espera</h3>
                  <p className="text-xs text-muted-foreground">Próximos alunos aguardando</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">{waitingStudents} total</Badge>
            </div>
            <div className="mt-6 space-y-3">
              {waitingList.length > 0 ? (
                waitingList.map((student: any) => (
                  <Link
                    key={student.id}
                    to={`/modulo/sam/alunos/${student.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-warning/10 text-warning text-xs">
                        {student.full_name?.substring(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(student.schools as any)?.name || "Sem instituição"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(student.created_at), "dd/MM/yy")}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border-t border-dashed">
                  Nenhum aluno em espera
                </div>
              )}
            </div>
            {waitingStudents > 5 && (
              <div className="mt-4 pt-4 border-t flex justify-end">
                <Link to="/modulo/sam/alunos?status=waiting">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver fila completa <BarChart3 className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent appointments */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Últimos Atendimentos</h3>
                  <p className="text-xs text-muted-foreground">Registros mais recentes</p>
                </div>
              </div>
              <Link to="/modulo/sam/atendimentos">
                <Button variant="ghost" size="sm" className="text-xs">Ver todos</Button>
              </Link>
            </div>
            <div className="mt-6 space-y-3">
              {recentAppointments.length > 0 ? (
                recentAppointments.map((app: any) => {
                  const st = statusLabels[app.status] || statusLabels.scheduled
                  const studentName = app.studentName || "–"
                  return (
                    <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {studentName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(app.date), "dd/MM/yy HH:mm")} · {app.type}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${st.className}`}>
                        {st.label}
                      </Badge>
                      <AppointmentActionsMenu appointmentId={app.id} currentDate={app.date} studentName={studentName} />
                    </div>
                  )
                })
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border-t border-dashed">
                  Nenhum atendimento registrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const chartsContent = (
    <DashboardCharts
      atendimentosPorDia={chartDataDays}
      atendimentosPorMes={chartDataMonths}
      atendimentosPorEspecialidade={chartDataEspecialidades}
      dificuldadesData={dificuldadesData}
      tiposQueixaData={tiposQueixaData}
    />
  )

  return (
    <>
      <DashboardView overview={overviewContent} charts={chartsContent} />
    </>
  )
}
