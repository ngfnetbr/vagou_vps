// @ts-nocheck
import { useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { useNavigate } from "react-router-dom"
import { Button } from "@ui/button"
import { MoreVertical, Calendar, Trash2, X, AlertTriangle, CheckCircle2, UserX, PlayCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/popover"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { format } from "date-fns"
import { cancelAppointment, markAppointmentMissed, rescheduleAppointment, startAppointment } from "@sam/lib/actions/agenda"
import { useToast } from "@root/hooks/use-toast"

interface AppointmentActionsMenuProps {
  appointmentId: string
  currentDate?: string | Date
  studentName?: string
  status?: string
  triggerClassName?: string
  onUpdated?: () => void
}

export function AppointmentActionsMenu({ appointmentId, currentDate, studentName, status, triggerClassName, onUpdated }: AppointmentActionsMenuProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isMissedOpen, setIsMissedOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")

  const canStart = status !== "completed" && status !== "cancelled"
  const isFinished = status === "completed" || status === "cancelled" || status === "missed"

  async function handleStart() {
    setIsPending(true)
    const result = await startAppointment(appointmentId)
    if (result?.success) {
      setIsMenuOpen(false)
      toast({ title: "Atendimento iniciado" })
      onUpdated?.()
      navigate(`/modulo/sam/atendimentos/novo?appointmentId=${appointmentId}`)
    } else {
      toast({ title: "Erro ao iniciar", description: result?.error || "Tente novamente.", variant: "destructive" })
    }
    setIsPending(false)
  }

  async function handleCancel() {
    setIsPending(true)
    const result = await cancelAppointment(appointmentId)
    if (result?.success) {
      setIsCancelOpen(false)
      setIsMenuOpen(false)
      toast({ title: "Agendamento cancelado" })
      onUpdated?.()
    } else {
      toast({ title: "Erro ao cancelar", description: result?.error || "Tente novamente.", variant: "destructive" })
    }
    setIsPending(false)
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    const result = await rescheduleAppointment(appointmentId, newDate, newTime)
    if (result?.success) {
      setIsRescheduleOpen(false)
      setIsMenuOpen(false)
      toast({ title: "Agendamento reagendado" })
      onUpdated?.()
    } else {
      toast({ title: "Erro ao reagendar", description: result?.error || "Tente novamente.", variant: "destructive" })
    }
    setIsPending(false)
  }

  async function handleMarkMissed() {
    setIsPending(true)
    const result = await markAppointmentMissed(appointmentId)
    if (result?.success) {
      setIsMissedOpen(false)
      setIsMenuOpen(false)
      toast({ title: "Falta registrada" })
      onUpdated?.()
    } else {
      toast({ title: "Erro ao marcar falta", description: result?.error || "Tente novamente.", variant: "destructive" })
    }
    setIsPending(false)
  }

  return (
    <>
      <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={triggerClassName || "h-8 w-8 hover:bg-slate-100 rounded-full"}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4 text-slate-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1 bg-white border border-slate-200 shadow-md rounded-md" align="end">
          <div className="flex flex-col text-sm">
            {canStart && (
              <button
                onClick={handleStart}
                disabled={isPending}
                className="flex items-center gap-2 px-3 py-2 text-left hover:bg-emerald-50 rounded-sm text-emerald-700 font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? <Spinner className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 text-emerald-600" />}
                {status === "in_progress" ? "Continuar atendimento" : "Iniciar atendimento"}
              </button>
            )}
            <button
              onClick={() => {
                setIsMenuOpen(false)
                navigate(`/modulo/sam/atendimentos/novo?appointmentId=${appointmentId}`)
              }}
              className="flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 rounded-sm text-slate-700 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Finalizar atendimento
            </button>
            {!isFinished && (
              <button onClick={() => { setIsRescheduleOpen(true); setIsMenuOpen(false); if (currentDate) { const d = new Date(currentDate); setNewDate(format(d, "yyyy-MM-dd")); setNewTime(format(d, "HH:mm")); } }} className="flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 rounded-sm text-slate-700 transition-colors">
                <Calendar className="h-4 w-4 text-blue-600" />Reagendar
              </button>
            )}
            <button onClick={() => { setIsCancelOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-left hover:bg-red-50 text-red-600 rounded-sm transition-colors">
              <Trash2 className="h-4 w-4" />Cancelar agendamento
            </button>
            {!isFinished && (
              <button onClick={() => { setIsMissedOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-50 text-amber-700 rounded-sm transition-colors">
                <UserX className="h-4 w-4" />Marcar falta
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">Reagendar Atendimento</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsRescheduleOpen(false)} disabled={isPending}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleReschedule} className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">Nova data para <strong>{studentName}</strong>.</p>
              <div className="space-y-2"><Label htmlFor="new-date">Nova Data</Label><Input id="new-date" type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="new-time">Novo Horário</Label><Input id="new-time" type="time" required value={newTime} onChange={(e) => setNewTime(e.target.value)} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsRescheduleOpen(false)} disabled={isPending}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isPending}>{isPending ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}Confirmar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden border-l-4 border-l-red-600">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
                <div><h3 className="font-semibold text-lg text-slate-900">Cancelar Agendamento?</h3><p className="text-sm text-muted-foreground mt-1">Esta ação não pode ser desfeita.</p></div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsCancelOpen(false)} disabled={isPending}>Manter</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCancel} disabled={isPending}>{isPending ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}Sim, Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMissedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden border-l-4 border-l-amber-600">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-full"><UserX className="h-6 w-6 text-amber-700" /></div>
                <div><h3 className="font-semibold text-lg text-slate-900">Marcar Falta?</h3><p className="text-sm text-muted-foreground mt-1">O horário será liberado na agenda.</p></div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsMissedOpen(false)} disabled={isPending}>Cancelar</Button>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleMarkMissed} disabled={isPending}>{isPending ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}Confirmar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
