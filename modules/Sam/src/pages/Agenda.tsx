"use client"

import { Link, useNavigate } from "react-router-dom"
import { Spinner } from "@/components/common/Spinner";
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@ui/button"
import { Card, CardContent } from "@ui/card"
import { Input } from "@ui/input"
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, AlertTriangle, X, Search, XCircle, LayoutList, CalendarDays } from "lucide-react"
import { addDays, format, startOfWeek, addWeeks, subWeeks, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@sam/lib/utils"
import { AppointmentActionsMenu } from "@sam/components/appointments/appointment-actions-menu"
import { cancelAppointmentsByProfessional, getAgendaAppointments, rescheduleAppointment } from "@sam/lib/actions/agenda"
import { getProfessionals } from "@sam/lib/actions/usuarios"
import { SpecialtyBadge } from "@sam/components/common/specialty-badge"
import { getSpecialtyBorderClass } from "@sam/components/common/specialty-utils"
import { PageHeader } from "@sam/components/common/page-header"
import { useCanAccess } from "@root/components/admin/PermissionGate"
import { useToast } from "@root/hooks/use-toast"
import { supabase } from "@sam/integrations/supabase/client"
import { Calendar } from "@ui/calendar"
import { useLocalStorageState } from "@sam/hooks/use-local-storage-state"
import { EmptyState } from "@sam/components/common/empty-state"

type AgendaAppointment = {
  id: string
  studentId: string | null
  professionalId: string | null
  student: string
  professional: string
  date: Date
  time: string
  duration: string
  school: string
  type: string
  status: string
}

export default function AgendaPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useLocalStorageState<"day" | "week" | "month" | "list">("agenda:viewMode", "week")
  const [currentDate, setCurrentDate] = useLocalStorageState<string>("agenda:currentDate", new Date().toISOString())
  const currentDateObj = useMemo(() => new Date(currentDate), [currentDate])
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([])
  const [professionals, setProfessionals] = useState<{ id: string; full_name: string }[]>([])
  const [isBulkCancelOpen, setIsBulkCancelOpen] = useState(false)
  const [isBulkPending, setIsBulkPending] = useState(false)
  const [bulkProfessionalId, setBulkProfessionalId] = useState("")
  const [bulkStartDate, setBulkStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [bulkEndDate, setBulkEndDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const { toast } = useToast()
  const canView = useCanAccess(["modulos.sam.acessar", "sam.atendimentos.visualizar"])
  const canManageAgenda = useCanAccess(["modulos.sam.acessar", "sam.atendimentos.criar"])
  const [search, setSearch] = useLocalStorageState("agenda:search", "")
  const [typeFilter, setTypeFilter] = useLocalStorageState("agenda:type", "")
  const [statusFilter, setStatusFilter] = useLocalStorageState("agenda:status", "")
  const [professionalFilter, setProfessionalFilter] = useLocalStorageState("agenda:professional", "")
  const [selectedDayIso, setSelectedDayIso] = useLocalStorageState("agenda:selectedDay", format(new Date(), "yyyy-MM-dd"))
  const selectedDay = useMemo(() => new Date(`${selectedDayIso}T00:00:00`), [selectedDayIso])
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const dragAppointmentIdRef = useRef<string | null>(null)
  const realtimeReloadRef = useRef<number | null>(null)

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const data = await getAgendaAppointments()
      const parsed: AgendaAppointment[] = data.map(app => ({
        ...app,
        date: new Date(app.date),
      }))
      setAppointments(parsed)
    } catch {
      toast({ title: "Erro ao carregar agenda", variant: "destructive" })
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  useEffect(() => {
    const loadProfessionals = async () => {
      const data = await getProfessionals()
      setProfessionals((data || []).map((p: any) => ({ id: p.id, full_name: p.full_name })))
    }
    loadProfessionals()
  }, [])

  async function handleBulkCancel() {
    if (!bulkProfessionalId) {
      toast({ title: "Selecione um profissional", variant: "destructive" })
      return
    }
    setIsBulkPending(true)
    const result = await cancelAppointmentsByProfessional({
      professionalId: bulkProfessionalId,
      startDate: bulkStartDate,
      endDate: bulkEndDate,
    })
    if (result?.success) {
      setIsBulkCancelOpen(false)
      toast({ title: "Agenda cancelada" })
      await loadAppointments()
    } else {
      toast({ title: "Erro ao cancelar agenda", description: result?.error || "Tente novamente.", variant: "destructive" })
    }
    setIsBulkPending(false)
  }

  const next = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDateObj, 1).toISOString())
    else if (viewMode === "day") {
      const d = addDays(selectedDay, 1)
      setSelectedDayIso(format(d, "yyyy-MM-dd"))
      setCurrentDate(d.toISOString())
    }
    else setCurrentDate(addWeeks(currentDateObj, 1).toISOString())
  }
  const prev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDateObj, 1).toISOString())
    else if (viewMode === "day") {
      const d = subDays(selectedDay, 1)
      setSelectedDayIso(format(d, "yyyy-MM-dd"))
      setCurrentDate(d.toISOString())
    }
    else setCurrentDate(subWeeks(currentDateObj, 1).toISOString())
  }
  const today = () => {
    const d = new Date()
    setCurrentDate(d.toISOString())
    setSelectedDayIso(format(d, "yyyy-MM-dd"))
  }

  const openAppointment = (appointmentId: string) => {
    if (!canManageAgenda) {
      toast({ title: "Você não tem permissão para iniciar atendimentos.", variant: "destructive" })
      return
    }
    navigate(`/modulo/sam/atendimentos/novo?appointmentId=${appointmentId}`)
  }

  const startDate = startOfWeek(currentDateObj, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(startDate, i))
  const types = useMemo(() => Array.from(new Set(appointments.map((a) => a.type))).sort(), [appointments])
  const statuses = useMemo(() => Array.from(new Set(appointments.map((a) => a.status))).sort(), [appointments])

  const filteredAppointments = useMemo(() => {
    const s = search.trim().toLowerCase()
    return appointments.filter((a) => {
      const matchSearch =
        !s ||
        a.student.toLowerCase().includes(s) ||
        a.professional.toLowerCase().includes(s) ||
        a.school.toLowerCase().includes(s)
      const matchType = !typeFilter || a.type === typeFilter
      const matchStatus = !statusFilter || a.status === statusFilter
      const matchProfessional = !professionalFilter || a.professionalId === professionalFilter
      return matchSearch && matchType && matchStatus && matchProfessional
    })
  }, [appointments, search, typeFilter, statusFilter, professionalFilter])

  const hasActiveFilters = !!(search.trim() || typeFilter || statusFilter || professionalFilter)

  const daysWithAppointments = useMemo(
    () => filteredAppointments.map((a) => new Date(a.date.getFullYear(), a.date.getMonth(), a.date.getDate())),
    [filteredAppointments]
  )

  useEffect(() => {
    const channel = supabase
      .channel("sam:agenda")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          if (realtimeReloadRef.current) window.clearTimeout(realtimeReloadRef.current)
          realtimeReloadRef.current = window.setTimeout(() => loadAppointments(), 500)
        }
      )
      .subscribe()

    return () => {
      if (realtimeReloadRef.current) window.clearTimeout(realtimeReloadRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleDrop(appointmentId: string, targetDay: string) {
    const appt = appointments.find((a) => a.id === appointmentId)
    if (!appt) return
    if (!canManageAgenda) return

    setLoading(true)
    const result = await rescheduleAppointment(appointmentId, targetDay, appt.time)
    if (result?.success) {
      toast({ title: "Agendamento remanejado" })
      await loadAppointments()
      setSelectedDayIso(targetDay)
    } else {
      toast({ title: "Erro ao remanejar", description: result?.error || "Tente novamente.", variant: "destructive" })
    }
    setLoading(false)
  }

  return (
    <>
      {!canView ? (
        <div className="rounded-2xl border border-border p-6 bg-muted/30 text-sm text-muted-foreground">
          Você não tem permissão para visualizar a agenda.
        </div>
      ) : (
      <div className="space-y-6 pb-8">
      <PageHeader
        title="Agenda"
        description="Gerencie os atendimentos semanais."
        actions={(
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setIsBulkCancelOpen(true)}
              disabled={!canManageAgenda}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Cancelar agenda
            </Button>
            {canManageAgenda ? (
              <Button asChild className="w-full sm:w-auto shadow-sm">
                <Link to="/modulo/sam/agenda/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Agendar Atendimento
                </Link>
              </Button>
            ) : (
              <Button className="w-full sm:w-auto shadow-sm" disabled>
                <Plus className="mr-2 h-4 w-4" />
                Agendar Atendimento
              </Button>
            )}
          </div>
        )}
      />

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por aluno, profissional ou instituição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-[260px]"
          value={professionalFilter}
          onChange={(e) => setProfessionalFilter(e.target.value)}
        >
          <option value="">Todos os profissionais</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>

        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-[220px]"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-[200px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <Button
          variant="outline"
          className="lg:w-[140px]"
          disabled={!hasActiveFilters}
          onClick={() => {
            setSearch("")
            setTypeFilter("")
            setStatusFilter("")
            setProfessionalFilter("")
          }}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between bg-card p-4 rounded-lg border shadow-sm gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <Button variant="outline" size="icon" onClick={prev} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium capitalize min-w-[180px] text-center text-lg">
            {format(currentDateObj, viewMode === "week" ? "MMMM yyyy" : viewMode === "month" ? "MMMM yyyy" : "dd 'de' MMMM", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={next} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={today} className="ml-2">Hoje</Button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button variant={viewMode === "day" ? "secondary" : "outline"} size="sm" className="h-8" onClick={() => setViewMode("day")}>Dia</Button>
          <Button variant={viewMode === "week" ? "secondary" : "outline"} size="sm" className="h-8" onClick={() => setViewMode("week")}>Semana</Button>
          <Button variant={viewMode === "month" ? "secondary" : "outline"} size="sm" className="h-8" onClick={() => setViewMode("month")}>Mês</Button>
          <Button variant={viewMode === "list" ? "secondary" : "outline"} size="sm" className="h-8" onClick={() => setViewMode("list")}><LayoutList className="mr-2 h-4 w-4" />Lista</Button>
        </div>
      </div>

      {viewMode === "week" ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, new Date())
            const dayIso = format(day, "yyyy-MM-dd")
            const dayAppointments = filteredAppointments.filter(app => isSameDay(app.date, day))

            return (
              <div key={i} className="flex flex-col gap-3">
                <div className={cn(
                  "relative p-3 rounded-lg border text-center transition-colors",
                  isToday
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card border-border hover:border-primary/50"
                )}>
                  <div className="text-xs font-medium uppercase opacity-80">
                    {format(day, "EEE", { locale: ptBR })}
                  </div>
                  <div className="text-2xl font-bold">
                    {format(day, "dd")}
                  </div>
                  {dayAppointments.length > 0 && (
                    <span className={cn(
                      "absolute right-2 top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                      isToday ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                    )}>
                      {dayAppointments.length}
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    "flex-1 space-y-3 min-h-[400px] bg-muted/30 rounded-lg p-2 border border-dashed border-border transition-colors",
                    dragOverDay === dayIso ? "bg-muted/60 border-primary/40" : null
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverDay(dayIso)
                  }}
                  onDragLeave={() => setDragOverDay(null)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverDay(null)
                    const id = dragAppointmentIdRef.current
                    dragAppointmentIdRef.current = null
                    if (id) handleDrop(id, dayIso)
                  }}
                >
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground/60 gap-2 p-4">
                      <Spinner className="h-5 w-5 animate-spin" />
                      <span className="text-xs">Carregando...</span>
                    </div>
                  ) : dayAppointments.length > 0 ? (
                    dayAppointments.map(app => {
                      const borderClass = getSpecialtyBorderClass(app.type)
                      return (
                        <Card
                          key={app.id}
                          draggable={canManageAgenda}
                          onDragStart={() => {
                            dragAppointmentIdRef.current = app.id
                            setSelectedDayIso(dayIso)
                          }}
                          role="button"
                          tabIndex={0}
                          onClick={() => openAppointment(app.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") openAppointment(app.id)
                          }}
                          className={cn("shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden bg-card border-l-4", borderClass)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <SpecialtyBadge specialty={app.type} className="text-[10px] px-1.5 py-0 h-5 font-normal shadow-sm" />
                              <AppointmentActionsMenu
                                appointmentId={app.id}
                                currentDate={app.date}
                                studentName={app.student}
                                status={app.status}
                                onUpdated={loadAppointments}
                                triggerClassName="h-5 w-5 -mr-1 -mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0"
                              />
                            </div>
                            <div className="font-semibold text-sm truncate mb-1" title={app.student}>
                              {app.student}
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                <span>{app.time} ({app.duration})</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[120px]" title={app.school}>{app.school}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate" title={app.professional}>{app.professional}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-2 p-4">
                      <CalendarIcon className="h-8 w-8" />
                      <span className="text-xs text-center">Sem agendamentos</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : viewMode === "month" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-3 flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={(d) => {
                  if (!d) return
                  setSelectedDayIso(format(d, "yyyy-MM-dd"))
                  setCurrentDate(d.toISOString())
                }}
                month={currentDateObj}
                onMonthChange={(m) => setCurrentDate(m.toISOString())}
                locale={ptBR}
                classNames={{
                  cell: "h-9 w-9 text-center text-sm p-0 relative first:rounded-l-md last:rounded-r-md focus-within:relative focus-within:z-20",
                  day_today: "ring-1 ring-primary/40 text-foreground rounded-md",
                }}
                modifiers={{ hasAppointments: daysWithAppointments }}
                modifiersClassNames={{ hasAppointments: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary aria-selected:after:bg-primary-foreground" }}
              />
              <div className="mt-3 flex items-center gap-2 px-1 text-xs text-muted-foreground self-start">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Dias com atendimentos
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{format(selectedDay, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
                  <div className="text-xs text-muted-foreground">Arraste um agendamento para outro dia na visão semanal.</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewMode("day")}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Ver dia
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                  <Spinner className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              ) : filteredAppointments.filter((a) => isSameDay(a.date, selectedDay)).length === 0 ? (
                <EmptyState icon={<CalendarIcon className="h-5 w-5" />} title="Sem agendamentos neste dia" />
              ) : (
                <div className="space-y-3">
                  {filteredAppointments
                    .filter((a) => isSameDay(a.date, selectedDay))
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((app) => {
                      const borderClass = getSpecialtyBorderClass(app.type)
                      return (
                        <Card
                          key={app.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openAppointment(app.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") openAppointment(app.id)
                          }}
                          className={cn("shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden bg-card border-l-4", borderClass)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <SpecialtyBadge specialty={app.type} className="text-[10px] px-1.5 py-0 h-5 font-normal shadow-sm" />
                                  <div className="text-xs text-muted-foreground">{app.time}</div>
                                </div>
                                <div className="mt-1 font-semibold text-sm truncate">{app.student}</div>
                                <div className="mt-1 text-xs text-muted-foreground truncate">{app.school} • {app.professional}</div>
                              </div>
                              <AppointmentActionsMenu appointmentId={app.id} currentDate={app.date} studentName={app.student} status={app.status} onUpdated={loadAppointments} />
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : viewMode === "day" ? (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="text-sm font-semibold">{format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}</div>
              <Button variant="outline" size="sm" onClick={() => setViewMode("week")}>Ver semana</Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Spinner className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              (() => {
                const dayList = filteredAppointments.filter((a) => isSameDay(a.date, selectedDay)).sort((a, b) => a.time.localeCompare(b.time))
                if (dayList.length === 0) return <EmptyState icon={<CalendarIcon className="h-5 w-5" />} title="Sem agendamentos" />
                return (
                  <div className="space-y-2">
                    {dayList.map((app) => (
                      <div key={app.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-medium text-muted-foreground">{app.time}</div>
                            <SpecialtyBadge specialty={app.type} className="text-[10px] px-1.5 py-0 h-5 font-normal shadow-sm" />
                          </div>
                          <div className="mt-0.5 truncate text-sm font-semibold">{app.student}</div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">{app.school} • {app.professional}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openAppointment(app.id)} disabled={!canManageAgenda}>Abrir</Button>
                          <AppointmentActionsMenu appointmentId={app.id} currentDate={app.date} studentName={app.student} status={app.status} onUpdated={loadAppointments} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Spinner className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              (() => {
                const interval = viewMode === "list"
                  ? { start: startOfMonth(currentDateObj), end: endOfMonth(currentDateObj) }
                  : null

                const list = filteredAppointments
                  .filter((a) => !interval || isWithinInterval(a.date, interval))
                  .slice()
                  .sort((a, b) => a.date.getTime() - b.date.getTime() || a.time.localeCompare(b.time))

                if (list.length === 0) return <EmptyState icon={<CalendarIcon className="h-5 w-5" />} title="Nenhum agendamento encontrado" />

                return (
                  <div className="space-y-2">
                    {list.map((app) => {
                      const day = format(app.date, "yyyy-MM-dd")
                      return (
                        <div key={app.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{format(app.date, "dd/MM", { locale: ptBR })}</span>
                              <span>•</span>
                              <span>{app.time}</span>
                              <span>•</span>
                              <SpecialtyBadge specialty={app.type} className="text-[10px] px-1.5 py-0 h-5 font-normal shadow-sm" />
                            </div>
                            <div className="mt-0.5 truncate text-sm font-semibold">{app.student}</div>
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">{app.school} • {app.professional}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setSelectedDayIso(day); openAppointment(app.id) }} disabled={!canManageAgenda}>Abrir</Button>
                            <AppointmentActionsMenu appointmentId={app.id} currentDate={app.date} studentName={app.student} status={app.status} onUpdated={loadAppointments} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()
            )}
          </CardContent>
        </Card>
      )}
    </div>
      )}

    {isBulkCancelOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-card text-card-foreground rounded-lg shadow-lg w-full max-w-lg overflow-hidden border border-border border-l-4 border-l-destructive">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-lg">Cancelar agenda do profissional</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsBulkCancelOpen(false)} disabled={isBulkPending}><X className="h-4 w-4" /></Button>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Profissional</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={bulkProfessionalId}
                onChange={(e) => setBulkProfessionalId(e.target.value)}
                disabled={isBulkPending}
              >
                <option value="">Selecione</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data inicial</label>
                <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} disabled={isBulkPending} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data final</label>
                <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" type="date" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} disabled={isBulkPending} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsBulkCancelOpen(false)} disabled={isBulkPending}>Fechar</Button>
              <Button variant="destructive" onClick={handleBulkCancel} disabled={isBulkPending}>
                {isBulkPending ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
