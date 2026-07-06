// @ts-nocheck
import { useEffect, useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { ArrowLeft, Send, Calendar, User, FileText, MessageSquare, Tag, Paperclip, ExternalLink, Forward, CalendarPlus, Clock, CheckCircle2 } from "lucide-react"
import { getComplaintById, getComplaintMessages, sendComplaintMessage, updateComplaintReferralStatus, updateComplaintStatus } from "@sam/lib/actions/queixas"
import { supabase } from "@sam/integrations/supabase/client"
import { useAuth } from "@root/contexts/AuthContext"
import { useCanAccess } from "@root/components/admin/PermissionGate"
import { toast } from "sonner"
import {
  getComplaintStatusLabel,
  getComplaintStatusVariant,
  getReferralStatusLabel,
  getReferralStatusVariant,
  normalizeComplaintStatus,
  normalizeReferralStatus,
  type ComplaintStatus,
  type ReferralStatus,
} from "@sam/lib/complaintsStatus"

const APPOINTMENTS_TABLE = "appointments"

const appointmentStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  scheduled: { label: "Agendado", variant: "secondary" },
  completed: { label: "Realizado", variant: "default" },
  missed: { label: "Faltou", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
}

const selectableStatus: Array<{ value: ComplaintStatus; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "in_review", label: "Em Análise" },
  { value: "scheduled", label: "Agendado" },
  { value: "completed", label: "Concluído" },
  { value: "rejected", label: "Rejeitado" },
]

const selectableReferral: Array<{ value: ReferralStatus; label: string }> = [
  { value: "none", label: "Sem encaminhamento" },
  { value: "requested", label: "Solicitado" },
  { value: "accepted", label: "Aceito" },
  { value: "rejected", label: "Rejeitado" },
]

export default function QueixaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { profile, userProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const modulePrefix = location.pathname.startsWith("/modulo/sam") ? "/modulo/sam" : ""
  const isSchoolPortal = location.pathname.startsWith(`${modulePrefix}/escola`) || location.pathname.startsWith("/escola")
  const basePath = `${modulePrefix}${isSchoolPortal ? "/escola/queixas" : "/queixas"}`

  const [complaint, setComplaint] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [linkedAppointments, setLinkedAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)

  // Scheduling form state
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [professionals, setProfessionals] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [schedProfessional, setSchedProfessional] = useState("")
  const [schedType, setSchedType] = useState("")
  const [schedDate, setSchedDate] = useState("")
  const [schedTime, setSchedTime] = useState("")
  const [schedDuration, setSchedDuration] = useState("45")
  const [scheduling, setScheduling] = useState(false)

  const canChangeStatus = profile?.role === 'admin' || profile?.role === 'professional'
  const canView = useCanAccess(["modulos.sam.acessar", "sam.queixas.visualizar"])

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  async function loadData() {
    const [c, m] = await Promise.all([
      getComplaintById(id!),
      getComplaintMessages(id!),
    ])
    if (c) {
      const normalizedStatus = normalizeComplaintStatus(c.status)
      const normalizedReferral = normalizeReferralStatus((c as any).referral_status, (c as any).referral_requested)
      setComplaint({ ...c, status: normalizedStatus, referral_status: normalizedReferral })
    } else {
      setComplaint(c)
    }
    setMessages(m)

    // Load linked appointments
    let apptsQ: any = supabase.from(APPOINTMENTS_TABLE).select('id, date, status, type, duration_minutes, professional_id').eq('complaint_id', id!).order('date', { ascending: true })
    const { data: appts } = await apptsQ
    
    // Enrich with professional names
    if (appts && appts.length > 0) {
      const profIds = [...new Set(appts.map((a: any) => a.professional_id).filter(Boolean))]
      if (profIds.length > 0) {
        let profsQ: any = supabase.from('profiles').select('id, full_name').in('id', profIds as string[])
        const { data: profs } = await profsQ
        const profMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]))
        appts.forEach((a: any) => { a._professional_name = profMap.get(a.professional_id) || 'Profissional' })
      }
    }
    setLinkedAppointments(appts || [])

    setLoading(false)
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !id) return
    setSending(true)
    try {
      await sendComplaintMessage(id, newMessage.trim())
      setNewMessage("")
      const msgs = await getComplaintMessages(id)
      setMessages(msgs)
      toast.success("Mensagem enviada.")
    } catch {
      toast.error("Erro ao enviar mensagem.")
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(status: string) {
    if (!id) return
    try {
      await updateComplaintStatus(id, status)
      const normalizedStatus = normalizeComplaintStatus(status)
      setComplaint((prev: any) => ({ ...prev, status: normalizedStatus }))
      toast.success("Status atualizado.")
    } catch {
      toast.error("Erro ao atualizar status.")
    }
  }

  async function handleReferralStatusChange(status: ReferralStatus) {
    if (!id) return
    try {
      await updateComplaintReferralStatus(id, status)
      const normalized = normalizeReferralStatus(status)
      setComplaint((prev: any) => ({
        ...prev,
        referral_status: normalized,
        referral_requested: normalized !== "none",
      }))
      toast.success("Encaminhamento atualizado.")
    } catch {
      toast.error("Erro ao atualizar encaminhamento.")
    }
  }

  async function openScheduleForm() {
    let profsQ: any = supabase.from("profiles").select("id, full_name, specialty").eq("status", "active")
    const [profsRes, typesRes] = await Promise.all([profsQ, supabase.from("specialties").select("id, name, active").eq("active", true)])
    setProfessionals(profsRes.data || [])
    setTypes(typesRes.data || [])
    setShowScheduleForm(true)
  }

  async function handleScheduleAppointment() {
    if (!schedProfessional || !schedType || !schedDate || !schedTime) {
      toast.error("Preencha todos os campos do agendamento.")
      return
    }
    setScheduling(true)
    try {
      const dateTimeString = `${schedDate}T${schedTime}:00`
      const { error } = await supabase
        .from(APPOINTMENTS_TABLE)
        .insert({
          student_id: complaint.student_id,
          professional_id: schedProfessional,
          type: schedType,
          date: dateTimeString,
          duration_minutes: parseInt(schedDuration) || 45,
          status: 'scheduled',
          complaint_id: id,
        } as any)

      if (error) throw error

      // Auto-update complaint status to scheduled
      await updateComplaintStatus(id!, 'scheduled')
      setComplaint((prev: any) => ({ ...prev, status: 'scheduled' }))

      toast.success("Atendimento agendado com sucesso!")
      setShowScheduleForm(false)
      
      // Reload linked appointments
      let apptsQ2: any = supabase.from(APPOINTMENTS_TABLE).select('id, date, status, type, duration_minutes, professional_id').eq('complaint_id', id!).order('date', { ascending: true })
      const { data: appts } = await apptsQ2
      setLinkedAppointments(appts || [])
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar atendimento.")
    } finally {
      setScheduling(false)
    }
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>
  if (!complaint) return <div className="text-center py-8 text-muted-foreground">Queixa não encontrada.</div>

  if (!canView) {
    return (
      <div className="rounded-2xl border p-6 bg-muted/30 text-sm text-muted-foreground">
        Você não tem permissão para visualizar esta queixa.
      </div>
    )
  }

  const normalizedStatus = normalizeComplaintStatus(complaint.status)
  const st = { label: getComplaintStatusLabel(normalizedStatus), variant: getComplaintStatusVariant(normalizedStatus) }
  const referral = normalizeReferralStatus(complaint.referral_status, complaint.referral_requested)

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full" asChild>
          <Link to={basePath}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-primary">Queixa Escolar</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="font-mono text-xs">{complaint.protocol}</Badge>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canChangeStatus && (
            <>
              <Button onClick={openScheduleForm} variant="default" size="sm" className="gap-1.5">
                <CalendarPlus className="h-4 w-4" /> Agendar Atendimento
              </Button>
              <Select value={normalizedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectableStatus.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      {/* Schedule form (inline) */}
      {showScheduleForm && canChangeStatus && (
        <Card className="shadow-sm border-2 border-primary/20 ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <CalendarPlus className="h-4 w-4" /> Agendar Atendimento para {(complaint as any).students?.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Profissional *</Label>
                <Select value={schedProfessional} onValueChange={setSchedProfessional}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name} {p.specialty ? `(${p.specialty})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Atendimento *</Label>
                <Select value={schedType} onValueChange={setSchedType}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input type="number" value={schedDuration} onChange={(e) => setSchedDuration(e.target.value)} step="15" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowScheduleForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleScheduleAppointment} disabled={scheduling}>
                {scheduling ? <><Spinner className="mr-2 h-4 w-4 animate-spin" /> Agendando...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Agendamento</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Appointments (visible to everyone) */}
      {linkedAppointments.length > 0 && (
        <Card className="shadow-sm border-none ring-1 ring-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Atendimentos Vinculados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {linkedAppointments.map((appt) => {
                const apptSt = appointmentStatusMap[appt.status] || { label: appt.status, variant: "outline" as const }
                const dateObj = new Date(appt.date)
                return (
                  <div key={appt.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={apptSt.variant} className="text-xs">{apptSt.label}</Badge>
                        <span className="text-sm font-medium">{appt.type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dateObj.toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isSchoolPortal && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {appt._professional_name || 'Profissional'}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isSchoolPortal && canChangeStatus && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/atendimentos/${appt.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complaint details */}
      <Card className="shadow-sm border-none ring-1 ring-border">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div><span className="text-muted-foreground">Aluno:</span><p className="font-medium">{(complaint as any).students?.full_name}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div><span className="text-muted-foreground">Instituição:</span><p className="font-medium">{(complaint as any).schools?.name}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div><span className="text-muted-foreground">Data:</span><p className="font-medium">{new Date(complaint.created_at).toLocaleDateString('pt-BR')}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div><span className="text-muted-foreground">Relatado por:</span><p className="font-medium">{(complaint as any).reporter?.full_name || '-'}</p></div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Queixa Principal</h3>
            <p className="whitespace-pre-wrap">{complaint.primary_complaint}</p>
          </div>

          {complaint.diagnosis_tags?.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Diagnósticos</h3>
              <div className="flex flex-wrap gap-1.5">
                {complaint.diagnosis_tags.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {complaint.symptoms && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Sintomas</h3>
              <p className="text-sm whitespace-pre-wrap">{complaint.symptoms}</p>
            </div>
          )}

          {complaint.impact_learning && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Impacto no Aprendizado</h3>
              <p className="text-sm whitespace-pre-wrap">{complaint.impact_learning}</p>
            </div>
          )}

          {complaint.behavior_classroom && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Comportamento em Sala</h3>
              <p className="text-sm whitespace-pre-wrap">{complaint.behavior_classroom}</p>
            </div>
          )}

          {/* Laudo attachment */}
          {complaint.document_url && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" /> Laudo Anexado
              </h3>
              {complaint.laudo_type && (
                <Badge variant="secondary" className="mb-2 text-xs">{complaint.laudo_type}</Badge>
              )}
              <a
                href={complaint.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline bg-primary/5 px-3 py-2 rounded-lg border border-primary/10"
              >
                <FileText className="h-4 w-4" />
                Visualizar Laudo
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Encaminhamento */}
          {(referral !== "none" || complaint.referral_requested) && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Forward className="h-3.5 w-3.5" /> Encaminhamento
              </h3>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Badge variant={getReferralStatusVariant(referral)} className="mb-2">
                  {getReferralStatusLabel(referral)}
                </Badge>
                {canChangeStatus && (
                  <Select value={referral} onValueChange={(v) => handleReferralStatusChange(v as ReferralStatus)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableReferral.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {complaint.referral_notes && (
                <p className="text-sm whitespace-pre-wrap mt-1">{complaint.referral_notes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none ring-1 ring-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Andamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Registrada</span>
            <Badge variant="outline">{new Date(complaint.created_at).toLocaleString("pt-BR")}</Badge>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Encaminhamento</span>
            <Badge variant={getReferralStatusVariant(referral)}>{getReferralStatusLabel(referral)}</Badge>
          </div>
          {linkedAppointments.length > 0 && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Atendimentos vinculados</span>
              <Badge variant="secondary">{linkedAppointments.length}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages / Communication */}
      <Card className="shadow-sm border-none ring-1 ring-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Comunicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem ainda.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className="bg-muted/50 rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{(m as any).profiles?.full_name || 'Usuário'}</span>
                    <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim() || !canView} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  )
}
