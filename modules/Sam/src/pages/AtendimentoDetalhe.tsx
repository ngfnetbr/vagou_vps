import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import DOMPurify from "dompurify"
import { Button } from "@ui/button"
import { Card, CardContent } from "@ui/card"
import { Badge } from "@ui/badge"
import { ArrowLeft, Calendar, Clock, User, FileText, Stethoscope, CalendarPlus, Eye } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { AnamnesisViewer } from "@sam/components/atendimentos/anamnesis-viewer"
import { SpecialtyBadge } from "@sam/components/common/specialty-badge"

const APPOINTMENTS_TABLE = "appointments"
const APPOINTMENT_RECORDS_TABLE = "appointment_records"

export default function AtendimentoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [apt, setApt] = useState<any>(null)
  const [record, setRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAnamnesis, setShowAnamnesis] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [aptRes, recRes] = await Promise.all([
        supabase
          .from(APPOINTMENTS_TABLE)
          .select("*, profiles(full_name, registration_number), students(full_name)")
          .eq("id", id!)
          .single(),
        supabase
          .from(APPOINTMENT_RECORDS_TABLE)
          .select("*, profiles(full_name, registration_number)")
          .eq("appointment_id", id!)
          .limit(1)
          .maybeSingle(),
      ])
      setApt(aptRes.data)
      setRecord(recRes.data)
      setLoading(false)
    }
    if (id) load()
  }, [id])

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>
  if (!apt) return <div className="text-center py-8 text-muted-foreground">Atendimento não encontrado.</div>

  const dateObj = new Date(apt.date)
  const anamnesisData = record?.anamnesis_data
    ? (typeof record.anamnesis_data === 'string' ? JSON.parse(record.anamnesis_data) : record.anamnesis_data)
    : {}
  const hasAnamnesis = Object.keys(anamnesisData).length > 0

  return (
    <>
      <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full" asChild>
          <Link to="/modulo/sam/atendimentos"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Detalhes do Atendimento</h2>
          <div className="flex items-center gap-2 mt-1">
            <SpecialtyBadge specialty={apt.type} className="text-[10px]" />
            <Badge variant="outline">{apt.status}</Badge>
            {record?.is_first_visit && <Badge variant="default" className="text-[10px]">1º Atendimento</Badge>}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div><span className="text-sm text-muted-foreground">Data:</span><p className="font-medium">{dateObj.toLocaleDateString('pt-BR')}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div><span className="text-sm text-muted-foreground">Horário:</span><p className="font-medium">{dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div><span className="text-sm text-muted-foreground">Aluno:</span><p className="font-medium">{(apt as any).students?.full_name || '-'}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Profissional:</span>
                <p className="font-medium">{(apt as any).profiles?.full_name || '-'}</p>
                {record?.registration_number && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Stethoscope className="h-3 w-3" /> Reg: {record.registration_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          {apt.description && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h3>
              <p className="whitespace-pre-wrap">{apt.description}</p>
            </div>
          )}

          {/* Appointment record summary (rich text) */}
          {record?.summary && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Resumo do Prontuário</h3>
              <div className="bg-muted/50 p-3 rounded-lg border border-border prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(record.summary) }} />
            </div>
          )}

          {apt.evolution && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Evolução</h3>
              <p className="whitespace-pre-wrap">{apt.evolution}</p>
            </div>
          )}
          {apt.action_plan && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Plano de Ação</h3>
              <p className="whitespace-pre-wrap">{apt.action_plan}</p>
            </div>
          )}

          {/* Return date */}
          {record?.return_date && (
            <div className="border-t pt-4 flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Retorno agendado:</span>
              <span className="font-medium">{new Date(record.return_date).toLocaleDateString('pt-BR')}</span>
            </div>
          )}

          {/* Anamnesis section */}
          {hasAnamnesis && (
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => setShowAnamnesis(!showAnamnesis)}
              >
                <Eye className="h-3 w-3" />
                {showAnamnesis ? "Ocultar Anamnese" : "Ver Anamnese Completa"}
              </Button>
              {showAnamnesis && (
                <div className="mt-3">
                  <AnamnesisViewer
                    data={anamnesisData}
                    specialty={record.specialty || apt.type}
                    professionalName={(record as any).profiles?.full_name}
                    date={record.created_at}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  )
}
