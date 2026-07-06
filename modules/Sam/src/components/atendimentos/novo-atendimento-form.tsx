"use client"

import { useState, useEffect, useCallback } from "react"
import { Spinner } from "@/components/common/Spinner";
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Textarea } from "@ui/textarea"
import { Card, CardContent } from "@ui/card"
import { Badge } from "@ui/badge"
import { Save, FileText, User, Cake, MapPin, School, Calendar, Paperclip, Eye, CalendarPlus } from "lucide-react"
import { createAppointment, checkFirstVisit, createAppointmentRecord, getStudentAnamnesis } from "@sam/lib/actions/atendimentos"
import { supabase } from "@sam/integrations/supabase/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ui/alert-dialog"
import { CriancaAutocomplete, type Crianca } from "@sam/components/atendimentos/crianca-autocomplete"
import { AnamnesisViewer } from "@sam/components/atendimentos/anamnesis-viewer"
import { RichTextEditor } from "@sam/components/atendimentos/rich-text-editor"
import { cn } from "@sam/lib/utils"

function safeToPtBRDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("pt-BR")
}

interface NovoAtendimentoFormProps {
  currentUserId: string
  currentUserName: string
  currentUserSpecialty?: string
  currentUserRegistration?: string
  appointmentId?: string
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function toLocalDateParts(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: "", time: "" }
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  }
}

export function NovoAtendimentoForm({ currentUserId, currentUserName, currentUserSpecialty, currentUserRegistration, appointmentId }: NovoAtendimentoFormProps) {
  const navigate = useNavigate()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCrianca, setSelectedCrianca] = useState<Crianca | null>(null)
  const [idade, setIdade] = useState<{ anos: number; meses: number; dias: number } | null>(null)
  const [isAniversario, setIsAniversario] = useState(false)
  const [tipoAtendimento, setTipoAtendimento] = useState<string>("")
  const [attendanceDate, setAttendanceDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [attendanceTime, setAttendanceTime] = useState<string>(() => {
    const d = new Date()
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  })
  const [durationMinutes, setDurationMinutes] = useState<string>("30")
  const [loadingAppointment, setLoadingAppointment] = useState(false)
  
  // First visit detection
  const [showFirstVisitDialog, setShowFirstVisitDialog] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null)
  const [checkingFirstVisit, setCheckingFirstVisit] = useState(false)
  const [previousAnamnesis, setPreviousAnamnesis] = useState<any>(null)
  const [showAnamnesis, setShowAnamnesis] = useState(false)
  
  // Subsequent visit fields
  const [summaryHtml, setSummaryHtml] = useState("")
  const [returnDate, setReturnDate] = useState("")

  useEffect(() => {
    if (!appointmentId) return
    setLoadingAppointment(true)
    supabase
      .from("appointments")
      .select("id, date, duration_minutes, type, description, student_id, status")
      .eq("id", appointmentId)
      .single()
      .then(async ({ data: appt, error: apptErr }) => {
        if (apptErr || !appt) {
          setError("Agendamento não encontrado.")
          return
        }
        if (appt.status !== "scheduled" && appt.status !== "in_progress") {
          setError("Este agendamento não está ativo para finalizar.")
          return
        }
        if (appt.status === "scheduled") {
          await supabase.from("appointments").update({ status: "in_progress" }).eq("id", appointmentId)
        }
        const parts = toLocalDateParts(appt.date)
        if (parts.date) setAttendanceDate(parts.date)
        if (parts.time) setAttendanceTime(parts.time)
        if (appt.duration_minutes) setDurationMinutes(String(appt.duration_minutes))
        if (appt.type) setTipoAtendimento(appt.type)

        const { data: student } = await supabase
          .from("students")
          .select("id, full_name, birth_date, guardian_name, class_name, school_id, schools(name)")
          .eq("id", appt.student_id)
          .single()

        if (student) {
          const schoolName = (student as any).schools?.name
          setSelectedCrianca({
            id: student.id,
            nome: student.full_name,
            data_nascimento: student.birth_date,
            nome_responsavel: student.guardian_name,
            cmei_atual_nome: schoolName || null,
            turma_atual_nome: student.class_name,
          })
        }
      })
      .then(() => setLoadingAppointment(false))
  }, [appointmentId])

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    
    let anos = hoje.getFullYear() - nascimento.getFullYear()
    let meses = hoje.getMonth() - nascimento.getMonth()
    let dias = hoje.getDate() - nascimento.getDate()

    if (meses < 0 || (meses === 0 && dias < 0)) {
      anos--
      meses += 12
    }
    
    if (dias < 0) {
      const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate()
      dias += ultimoDiaMesAnterior
      meses--
    }

    // Verificar se é aniversário hoje
    const ehAniversario = hoje.getDate() === nascimento.getDate() && 
                         hoje.getMonth() === nascimento.getMonth()
    
    setIsAniversario(ehAniversario)
    return { anos, meses, dias }
  }

  useEffect(() => {
    const raw = selectedCrianca?.data_nascimento
    if (!raw) {
      setIdade(null)
      setIsAniversario(false)
      return
    }
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) {
      setIdade(null)
      setIsAniversario(false)
      return
    }
    setIdade(calcularIdade(raw))
  }, [selectedCrianca])

  // First visit detection - triggers when student is selected
  useEffect(() => {
    if (selectedCrianca && currentUserId) {
      setCheckingFirstVisit(true)
      setIsFirstVisit(null)
      setPreviousAnamnesis(null)
      setShowAnamnesis(false)
      checkFirstVisit(selectedCrianca.id, currentUserId).then((first) => {
        if (first) {
          setShowFirstVisitDialog(true)
        } else {
          setIsFirstVisit(false)
          // Load previous anamnesis for "Relembrar" button
          getStudentAnamnesis(selectedCrianca.id, currentUserId).then((data) => {
            if (data) setPreviousAnamnesis(data)
          })
        }
        setCheckingFirstVisit(false)
      })
    }
  }, [selectedCrianca, currentUserId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (appointmentId && loadingAppointment) return
    if (!selectedCrianca) {
      setError("Por favor, selecione uma criança.")
      return
    }
    if (!tipoAtendimento) {
      setError("Selecione o tipo de atendimento.")
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.append('student_id', selectedCrianca.id)
    formData.set('type', tipoAtendimento)
    formData.set('duration_minutes', durationMinutes)
    formData.set('time', attendanceTime)
    formData.set('date', attendanceDate)
    if (appointmentId) formData.set('appointment_id', appointmentId)
    
    // For subsequent visits, add summary HTML as description
    if (isFirstVisit === false && summaryHtml) {
      formData.set('description', summaryHtml)
    }
    
    if (isFirstVisit === false && !summaryHtml.replace(/<[^>]*>/g, '').trim()) {
      setError("O campo 'Resumo do Atendimento' é obrigatório.")
      return
    }
    
    setIsPending(true)
    try {
      const result = await createAppointment(formData)
      if (result?.error) {
        const msg = typeof result.error === "string" ? result.error : "Falha ao criar atendimento"
        setError(msg)
      } else if (result?.appointmentId) {
        // Collect anamnesis data for the record
        const anamnesisData: Record<string, any> = {}
        if (isFirstVisit) {
          const allFields = Array.from(formData.entries())
          for (const [key, value] of allFields) {
            if (key.startsWith('fono_') || key.startsWith('psico_') || key.startsWith('psicope_') || key === 'anamnese' ||
                key.startsWith('avaliacao_') || key.startsWith('observacoes_') || key.startsWith('historico_') ||
                key.startsWith('desenvolvimento_') || key.startsWith('aspectos_')) {
              if (value) anamnesisData[key] = value
            }
          }
        }

        // Create the appointment record for prontuario
        try {
          await createAppointmentRecord({
            appointmentId: result.appointmentId,
            studentId: selectedCrianca.id,
            professionalId: currentUserId,
            specialty: tipoAtendimento || currentUserSpecialty || '',
            registrationNumber: currentUserRegistration || '',
            isFirstVisit: isFirstVisit === true,
            anamnesisData,
            summary: isFirstVisit ? (formData.get('description') as string) : summaryHtml,
            returnDate: returnDate || null,
          })
        } catch (err) {
          console.error('Error creating appointment record:', err)
        }
        
        navigate("/modulo/sam/atendimentos")
      }
    } finally {
      setIsPending(false)
    }
  }



  return (
    <>
      {/* First Visit Dialog */}
      <AlertDialog open={showFirstVisitDialog} onOpenChange={setShowFirstVisitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Primeiro Atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Este é o primeiro atendimento deste aluno com você. Deseja preencher a anamnese completa?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsFirstVisit(false); setShowFirstVisitDialog(false) }}>
              Não
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => { setIsFirstVisit(true); setShowFirstVisitDialog(false) }}>
              Sim, preencher anamnese
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md flex items-center gap-2">
          <span className="font-semibold">Erro:</span> {error}
        </div>
      )}

      {/* First visit badge indicator */}
      {selectedCrianca && isFirstVisit !== null && (
        <div className="flex items-center gap-2">
          <Badge variant={isFirstVisit ? "default" : "secondary"} className="text-xs">
            {isFirstVisit ? "Primeiro Atendimento — Anamnese Completa" : "Atendimento Subsequente"}
          </Badge>
          {!isFirstVisit && previousAnamnesis && (
            <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowAnamnesis(!showAnamnesis)}>
              <Eye className="h-3 w-3" /> {showAnamnesis ? "Ocultar Anamnese" : "Relembrar Anamnese"}
            </Button>
          )}
        </div>
      )}

      {/* Read-only anamnesis viewer for subsequent visits */}
      {showAnamnesis && previousAnamnesis && (
        <AnamnesisViewer
          data={previousAnamnesis.anamnesis_data || {}}
          specialty={previousAnamnesis.specialty || tipoAtendimento}
          professionalName={(previousAnamnesis as any).profiles?.full_name}
          date={previousAnamnesis.created_at}
        />
      )}
      
      {/* Seção: Identificação da Criança */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-blue-800 border-b pb-1.5">
          <User className="h-5 w-5" />
          <h3 className="text-base font-semibold">Identificação da Criança</h3>
        </div>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardContent className="p-4 space-y-4">
            {appointmentId ? (
              <div className="space-y-2">
                <Label className="text-slate-600 font-medium">Agendamento</Label>
                <Input
                  value={selectedCrianca?.nome || (loadingAppointment ? "Carregando..." : "")}
                  readOnly
                  className="h-9 border-slate-300 focus-visible:ring-blue-600"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-slate-600 font-medium">Buscar Criança</Label>
                <CriancaAutocomplete onSelect={setSelectedCrianca} />
              </div>
            )}

            {selectedCrianca && (
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-lg border transition-all",
                isAniversario 
                  ? "bg-amber-50 border-amber-200 ring-1 ring-amber-200 shadow-sm" 
                  : "bg-slate-50 border-slate-100"
              )}>
                {isAniversario && (
                  <div className="col-span-full flex items-center gap-2 text-amber-700 font-bold mb-2 animate-bounce">
                    <Cake className="h-5 w-5" />
                    <span>🎉 Hoje é aniversário! Parabéns!</span>
                  </div>
                )}
                
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase font-bold">Nome Completo</Label>
                  <p className="text-slate-900 font-medium">{selectedCrianca.nome}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase font-bold">Data de Nascimento</Label>
                  <p className="text-slate-900 font-medium">
                    {safeToPtBRDate(selectedCrianca.data_nascimento) ?? "Não informada"}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase font-bold">Idade Atual</Label>
                  <p className="text-slate-900 font-medium">
                    {idade ? `${idade.anos} anos, ${idade.meses} meses e ${idade.dias} dias` : 'Calculando...'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase font-bold">Responsável</Label>
                  <p className="text-slate-900 font-medium">{selectedCrianca.nome_responsavel || 'Não informado'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><School className="h-3.5 w-3.5 text-blue-600" /> CMEI</Label>
                  <p className="text-slate-900 font-medium">{selectedCrianca.cmei_atual_nome || "Não informada"}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase font-bold">Turma Atual</Label>
                  <p className="text-slate-900 font-medium">{selectedCrianca.turma_atual_nome || "Não informada"}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-blue-600" /> Endereço</Label>
                  <p className="text-slate-900 font-medium">
                    {(selectedCrianca.logradouro || selectedCrianca.numero)
                      ? `${selectedCrianca.logradouro || ''}${selectedCrianca.logradouro && selectedCrianca.numero ? ', ' : ''}${selectedCrianca.numero || ''}`
                      : 'Não informado'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase font-bold">Contato</Label>
                  <p className="text-slate-900 font-medium">{selectedCrianca.responsavel_telefone || '-'}</p>
                </div>

                
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seção: Dados do Atendimento */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-blue-800 border-b pb-1.5">
          <FileText className="h-5 w-5" />
          <h3 className="text-base font-semibold">Dados do Atendimento</h3>
        </div>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-slate-600 font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" /> Data do Atendimento
              </Label>
              <Input 
                id="date" 
                name="date" 
                type="date" 
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                required 
                className="h-9 border-slate-300 focus-visible:ring-blue-600"
                disabled={!!appointmentId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-slate-600 font-medium">Horário</Label>
              <Input
                id="time"
                name="time"
                type="time"
                value={attendanceTime}
                onChange={(e) => setAttendanceTime(e.target.value)}
                required
                className="h-9 border-slate-300 focus-visible:ring-blue-600"
                disabled={!!appointmentId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_minutes" className="text-slate-600 font-medium">Duração</Label>
              <select
                id="duration_minutes"
                name="duration_minutes"
                className="h-9 w-full rounded-md border border-slate-300 bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                disabled={!!appointmentId}
              >
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="type" className="text-slate-600 font-medium">Tipo de Atendimento</Label>
              <Select value={tipoAtendimento} onValueChange={(value) => setTipoAtendimento(value)}>
                <SelectTrigger className="h-9 border-slate-300 focus:ring-blue-600">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fonoaudiologia">Fonoaudiologia</SelectItem>
                  <SelectItem value="Psicologia">Psicologia</SelectItem>
                  <SelectItem value="Psicopedagogia">Psicopedagogia</SelectItem>
                  <SelectItem value="Avaliação">Avaliação</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description" className="text-slate-600 font-medium">Resumo do Atendimento</Label>
              <Textarea 
                id="description" 
                name="description"
                placeholder="Descreva de forma geral o objetivo e o foco desta sessão..." 
                className="min-h-[90px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                required
              />
            </div>

            {(tipoAtendimento === "Fonoaudiologia" ||
              tipoAtendimento === "Psicologia" ||
              tipoAtendimento === "Psicopedagogia") && (
              <>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="anamnese" className="text-slate-600 font-medium">
                    {tipoAtendimento === "Psicopedagogia"
                      ? "Anamnese Psicopedagógica"
                      : tipoAtendimento === "Psicologia"
                      ? "Anamnese Psicológica"
                      : "Anamnese"}
                  </Label>
                  <Textarea
                    id="anamnese"
                    name="anamnese"
                    placeholder={
                      tipoAtendimento === "Psicopedagogia"
                        ? "Síntese geral da anamnese psicopedagógica, se necessário, complementando os campos estruturados abaixo."
                        : tipoAtendimento === "Psicologia"
                        ? "Síntese geral da anamnese psicológica, se necessário, complementando os campos estruturados abaixo."
                        : "Registre histórico clínico, queixas principais, antecedentes familiares e escolares relevantes..."
                    }
                    className="min-h-[90px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                  />
                </div>

                {tipoAtendimento === "Fonoaudiologia" && (
                  <div className="space-y-4 md:col-span-2 border-t pt-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">
                        Seção 1 – Queixa Fonoaudiológica
                      </Label>
                      <Textarea
                        id="fono_queixa"
                        name="fono_queixa"
                        placeholder="Detalhe a queixa principal, descrevendo se envolve atraso de linguagem, distorções fonêmicas, disfluência, alterações vocais, dificuldades de leitura/escrita, disfagia, entre outras."
                        className="min-h-[90px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="fono_queixa_tempo_e_impacto"
                        name="fono_queixa_tempo_e_impacto"
                        placeholder="Registre tempo de evolução da queixa e impacto funcional nas atividades de vida diária, comunicação, interação social e desempenho escolar."
                        className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 2 – Histórico Gestacional e Perinatal
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="fono_hist_gestacao_intercorrencias"
                          name="fono_hist_gestacao_intercorrencias"
                          placeholder="Intercorrências na gestação (infecções, sangramentos, riscos gestacionais, outras condições clínicas maternas)."
                          className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_hist_gestacao_substancias_medicamentos"
                          name="fono_hist_gestacao_substancias_medicamentos"
                          placeholder="Uso de substâncias/medicamentos durante a gestação (álcool, tabaco, drogas ilícitas, psicofármacos, etc.)."
                          className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Input
                          id="fono_hist_parto_tipo"
                          name="fono_hist_parto_tipo"
                          placeholder="Tipo de parto (normal, cesárea, fórceps, outras observações)."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                        <div className="grid grid-cols-1 gap-3">
                          <Input
                            id="fono_hist_prematuridade"
                            name="fono_hist_prematuridade"
                            placeholder="Prematuridade (se presente, idade gestacional ao nascer)."
                            className="border-slate-300 focus-visible:ring-blue-600"
                          />
                          <Input
                            id="fono_hist_peso_nascer"
                            name="fono_hist_peso_nascer"
                            placeholder="Peso ao nascer."
                            className="border-slate-300 focus-visible:ring-blue-600"
                          />
                        </div>
                      </div>
                      <Textarea
                        id="fono_hist_uti_neonatal"
                        name="fono_hist_uti_neonatal"
                        placeholder="Internação em UTI neonatal (tempo, motivo, procedimentos realizados)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 3 – Desenvolvimento da Linguagem
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          id="fono_desenvol_vocalizacoes_idade"
                          name="fono_desenvol_vocalizacoes_idade"
                          placeholder="Idade das primeiras vocalizações."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                        <Input
                          id="fono_desenvol_primeiras_palavras_idade"
                          name="fono_desenvol_primeiras_palavras_idade"
                          placeholder="Idade das primeiras palavras."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                        <Input
                          id="fono_desenvol_frases_idade"
                          name="fono_desenvol_frases_idade"
                          placeholder="Idade de formação de frases."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                      </div>
                      <Textarea
                        id="fono_desenvol_compreensao_verbal"
                        name="fono_desenvol_compreensao_verbal"
                        placeholder="Descreva a compreensão verbal (ordens simples/complexas, compreensão em diferentes contextos)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="fono_desenvol_fonologia_trocas_omissoes"
                        name="fono_desenvol_fonologia_trocas_omissoes"
                        placeholder="Registro de trocas, omissões ou distorções fonológicas observadas."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="fono_desenvol_inteligibilidade_fala"
                          name="fono_desenvol_inteligibilidade_fala"
                          placeholder="Inteligibilidade de fala (percentual estimado de compreensão por familiares e por terceiros)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_desenvol_disfluencia"
                          name="fono_desenvol_disfluencia"
                          placeholder="Presença de disfluências (tipo, frequência, situações desencadeantes)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 4 – Histórico Auditivo
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="fono_hist_auditivo_triagem_neonatal"
                          name="fono_hist_auditivo_triagem_neonatal"
                          placeholder="Resultados da triagem auditiva neonatal (passou, falhou, repetição de exame)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_hist_auditivo_exames"
                          name="fono_hist_auditivo_exames"
                          placeholder="Exames audiológicos realizados (audiometria, BERA, emissões otoacústicas, outros) e resultados."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_hist_auditivo_otites_recorrentes"
                          name="fono_hist_auditivo_otites_recorrentes"
                          placeholder="Histórico de otites médias recorrentes (frequência, tratamentos, complicações)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_hist_auditivo_suspeita_perda"
                          name="fono_hist_auditivo_suspeita_perda"
                          placeholder="Suspeita de perda auditiva por parte da família ou escola."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_hist_auditivo_protese"
                          name="fono_hist_auditivo_protese"
                          placeholder="Uso de prótese auditiva ou implante coclear (tempo de uso, adaptação)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 5 – Motricidade Orofacial e Alimentação
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="fono_motricidade_amamentacao"
                          name="fono_motricidade_amamentacao"
                          placeholder="Histórico de amamentação (tempo de aleitamento materno, dificuldades na sucção, introdução de mamadeira)."
                          className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_motricidade_chupeta_mamadeira"
                          name="fono_motricidade_chupeta_mamadeira"
                          placeholder="Uso prolongado de chupeta/mamadeira (frequência, idade de retirada, observações)."
                          className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_motricidade_respiracao"
                          name="fono_motricidade_respiracao"
                          placeholder="Padrão respiratório predominante (oral, nasal, misto) e observações clínicas."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_motricidade_mastigacao"
                          name="fono_motricidade_mastigacao"
                          placeholder="Padrão mastigatório (unilateral/bilateral, eficiência, aceitação de consistências)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_motricidade_degluticao"
                          name="fono_motricidade_degluticao"
                          placeholder="Características da deglutição (presença de escape, engasgos, tosse, recusa alimentar)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_motricidade_bruxismo"
                          name="fono_motricidade_bruxismo"
                          placeholder="Presença de bruxismo (horário, intensidade, queixas associadas)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_motricidade_habitos_orais"
                          name="fono_motricidade_habitos_orais"
                          placeholder="Hábitos orais deletérios (onicofagia, sucção de dedo, morder objetos, outros)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 6 – Desempenho Escolar
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="fono_escolar_dificuldades_leitura"
                          name="fono_escolar_dificuldades_leitura"
                          placeholder="Dificuldades em leitura (decodificação, compreensão, fluência)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_escolar_dificuldades_escrita"
                          name="fono_escolar_dificuldades_escrita"
                          placeholder="Dificuldades em escrita (ortografia, organização textual, caligrafia)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_escolar_consciencia_fonologica"
                          name="fono_escolar_consciencia_fonologica"
                          placeholder="Habilidades de consciência fonológica (rimas, segmentação silábica, manipulação de sons)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="fono_escolar_relato_escolar"
                          name="fono_escolar_relato_escolar"
                          placeholder="Relato escolar (observações da escola quanto ao desempenho e comportamento)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                      <Textarea
                        id="fono_escolar_impacto_academico"
                        name="fono_escolar_impacto_academico"
                        placeholder="Impacto acadêmico global das alterações de linguagem, fala e/ou alimentação."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fono_impressao_clinica_inicial" className="text-slate-700 font-semibold">
                        Seção 7 – Impressão Clínica Inicial
                      </Label>
                      <Textarea
                        id="fono_impressao_clinica_inicial"
                        name="fono_impressao_clinica_inicial"
                        placeholder="Registre a hipótese diagnóstica fonoaudiológica inicial, justificativas clínicas e proposta de plano terapêutico."
                        className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {tipoAtendimento === "Psicopedagogia" && (
                  <div className="space-y-4 md:col-span-2 border-t pt-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">
                        Seção 1 – Queixa Principal
                      </Label>
                      <Textarea
                        id="psicope_queixa"
                        name="psicope_queixa"
                        placeholder="Descreva a queixa apresentada pela família e/ou escola, com foco na dificuldade principal."
                        className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psicope_queixa_detalhamento"
                        name="psicope_queixa_detalhamento"
                        placeholder="Registre início das dificuldades, duração, frequência, intensidade e contextos em que ocorrem."
                        className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 2 – Histórico Gestacional e Perinatal
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="psicope_hist_gestacao_planejamento"
                          name="psicope_hist_gestacao_planejamento"
                          placeholder="Planejamento da gestação e contexto em que ocorreu."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_hist_gestacao_intercorrencias"
                          name="psicope_hist_gestacao_intercorrencias"
                          placeholder="Intercorrências gestacionais (infecções, sangramentos, riscos etc.)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_hist_gestacao_medicacoes"
                          name="psicope_hist_gestacao_medicacoes"
                          placeholder="Uso de medicações ou substâncias durante a gestação."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Input
                          id="psicope_hist_parto_tipo"
                          name="psicope_hist_parto_tipo"
                          placeholder="Tipo de parto (normal, cesárea, fórceps, outros)."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                        <Input
                          id="psicope_hist_parto_idade_gestacional"
                          name="psicope_hist_parto_idade_gestacional"
                          placeholder="Idade gestacional ao nascer."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                        <Input
                          id="psicope_hist_peso_nascer"
                          name="psicope_hist_peso_nascer"
                          placeholder="Peso ao nascer."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                        <Input
                          id="psicope_hist_apgar"
                          name="psicope_hist_apgar"
                          placeholder="Apgar (se disponível)."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                      </div>
                      <Textarea
                        id="psicope_hist_complicacoes_neonatais"
                        name="psicope_hist_complicacoes_neonatais"
                        placeholder="Complicações neonatais relevantes (internações, icterícia, convulsões, etc.)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 3 – Desenvolvimento Neuropsicomotor
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          id="psicope_desenvol_sentou_idade"
                          name="psicope_desenvol_sentou_idade"
                          placeholder="Idade em que sentou."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                        <Input
                          id="psicope_desenvol_engatinhou_idade"
                          name="psicope_desenvol_engatinhou_idade"
                          placeholder="Idade em que engatinhou."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                        <Input
                          id="psicope_desenvol_andou_idade"
                          name="psicope_desenvol_andou_idade"
                          placeholder="Idade em que andou."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                      </div>
                      <Textarea
                        id="psicope_desenvol_esfincteriano"
                        name="psicope_desenvol_esfincteriano"
                        placeholder="Controle esfincteriano (idade, dificuldades, regressões)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="psicope_desenvol_linguagem_primeiras_palavras"
                          name="psicope_desenvol_linguagem_primeiras_palavras"
                          placeholder="Desenvolvimento da linguagem – primeiras palavras (idade e qualidade)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_desenvol_linguagem_frases"
                          name="psicope_desenvol_linguagem_frases"
                          placeholder="Desenvolvimento da linguagem – formação de frases."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                      <Textarea
                        id="psicope_desenvol_atrasos_regressoes"
                        name="psicope_desenvol_atrasos_regressoes"
                        placeholder="Registro de atrasos ou regressões no desenvolvimento neuropsicomotor."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 4 – Histórico Escolar
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          id="psicope_escolar_idade_ingresso"
                          name="psicope_escolar_idade_ingresso"
                          placeholder="Idade de ingresso escolar."
                          className="border-slate-300 focus-visible:ring-blue-600"
                        />
                        <Textarea
                          id="psicope_escolar_reprovacoes"
                          name="psicope_escolar_reprovacoes"
                          placeholder="Histórico de reprovações (séries, motivos)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_escolar_transferencias"
                          name="psicope_escolar_transferencias"
                          placeholder="Transferências escolares (frequência, motivos)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_escolar_rendimento"
                          name="psicope_escolar_rendimento"
                          placeholder="Rendimento acadêmico geral ao longo dos anos."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="psicope_escolar_dificuldades_leitura"
                          name="psicope_escolar_dificuldades_leitura"
                          placeholder="Dificuldades em leitura."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_escolar_dificuldades_escrita"
                          name="psicope_escolar_dificuldades_escrita"
                          placeholder="Dificuldades em escrita."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_escolar_dificuldades_interpretacao"
                          name="psicope_escolar_dificuldades_interpretacao"
                          placeholder="Dificuldades em interpretação textual."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_escolar_dificuldades_matematica"
                          name="psicope_escolar_dificuldades_matematica"
                          placeholder="Dificuldades em raciocínio lógico-matemático."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                      <Textarea
                        id="psicope_escolar_dificuldades_atencao_organizacao"
                        name="psicope_escolar_dificuldades_atencao_organizacao"
                        placeholder="Dificuldades em atenção e organização nas atividades escolares."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psicope_escolar_reforco_atendimento_especializado"
                        name="psicope_escolar_reforco_atendimento_especializado"
                        placeholder="Histórico de reforço escolar ou atendimento especializado (psicopedagogia, AEE, etc.)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 5 – Aspectos Cognitivos e Comportamentais
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="psicope_cognitivo_atencao"
                          name="psicope_cognitivo_atencao"
                          placeholder="Atenção sustentada em atividades acadêmicas e lúdicas."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_cognitivo_memoria_operacional"
                          name="psicope_cognitivo_memoria_operacional"
                          placeholder="Memória operacional (retenção e manipulação de informações)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_cognitivo_organizacao"
                          name="psicope_cognitivo_organizacao"
                          placeholder="Organização de materiais, tarefas e tempo."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_cognitivo_autonomia"
                          name="psicope_cognitivo_autonomia"
                          placeholder="Autonomia na realização de atividades escolares e de rotina."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea
                          id="psicope_comportamental_tolerancia_frustracao"
                          name="psicope_comportamental_tolerancia_frustracao"
                          placeholder="Tolerância à frustração e resposta a erros e fracassos."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_comportamental_relacionamento_interpessoal"
                          name="psicope_comportamental_relacionamento_interpessoal"
                          placeholder="Relacionamento interpessoal com colegas, professores e familiares."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_comportamental_comportamento_escolar"
                          name="psicope_comportamental_comportamento_escolar"
                          placeholder="Comportamento em ambiente escolar (agitação, inibição, oposição, etc.)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                        <Textarea
                          id="psicope_comportamental_postura_academica"
                          name="psicope_comportamental_postura_academica"
                          placeholder="Postura frente a demandas acadêmicas (iniciativa, persistência, evitação)."
                          className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 6 – Contexto Familiar
                      </Label>
                      <Textarea
                        id="psicope_familiar_composicao"
                        name="psicope_familiar_composicao"
                        placeholder="Composição familiar (quem mora na mesma casa, vínculos)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psicope_familiar_dinamica"
                        name="psicope_familiar_dinamica"
                        placeholder="Dinâmica relacional entre os membros da família."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psicope_familiar_rotina_diaria"
                        name="psicope_familiar_rotina_diaria"
                        placeholder="Rotina diária da criança/adolescente e da família."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psicope_familiar_acompanhamento_escolar"
                        name="psicope_familiar_acompanhamento_escolar"
                        placeholder="Acompanhamento das atividades escolares pela família."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psicope_familiar_praticas_educativas"
                        name="psicope_familiar_praticas_educativas"
                        placeholder="Práticas educativas, limites e regras estabelecidas em casa."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psicope_familiar_eventos_estressores"
                        name="psicope_familiar_eventos_estressores"
                        placeholder="Eventos estressores ou mudanças significativas (separações, perdas, mudanças de cidade/escola, etc.)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="psicope_observacoes_tecnicas" className="text-slate-700 font-semibold">
                        Seção 7 – Observações Técnicas
                      </Label>
                      <Textarea
                        id="psicope_observacoes_tecnicas"
                        name="psicope_observacoes_tecnicas"
                        placeholder="Registre hipóteses psicopedagógicas iniciais, análise funcional das dificuldades e possíveis encaminhamentos."
                        className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {tipoAtendimento === "Psicologia" && (
                  <div className="space-y-4 md:col-span-2 border-t pt-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">
                        Seção 1 – Queixa Principal
                      </Label>
                      <Textarea
                        id="psico_queixa"
                        name="psico_queixa"
                        placeholder="Descreva o motivo da busca por atendimento psicológico e principais queixas."
                        className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_queixa_e_prejuizos"
                        name="psico_queixa_e_prejuizos"
                        placeholder="Detalhe início dos sintomas, curso temporal, intensidade, fatores desencadeantes e prejuízos funcionais."
                        className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 2 – Histórico Psicológico e Psiquiátrico
                      </Label>
                      <Textarea
                        id="psico_hist_psicologico_psicoterapia"
                        name="psico_hist_psicologico_psicoterapia"
                        placeholder="Histórico de psicoterapia prévia (frequência, duração, foco)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_hist_psicologico_diagnosticos"
                        name="psico_hist_psicologico_diagnosticos"
                        placeholder="Diagnósticos psicológicos/psiquiátricos anteriores (se houver)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_hist_psicologico_psicofarmacos"
                        name="psico_hist_psicologico_psicofarmacos"
                        placeholder="Uso atual ou passado de psicofármacos (tipo, dose, adesão)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_hist_psicologico_internacoes"
                        name="psico_hist_psicologico_internacoes"
                        placeholder="Internações psiquiátricas prévias (motivo, duração)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_hist_psicologico_acompanhamento_medico"
                        name="psico_hist_psicologico_acompanhamento_medico"
                        placeholder="Acompanhamento com psiquiatria ou outros profissionais de saúde mental."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 3 – Histórico Familiar
                      </Label>
                      <Textarea
                        id="psico_hist_familiar_dinamica"
                        name="psico_hist_familiar_dinamica"
                        placeholder="Dinâmica familiar e qualidade das interações entre os membros."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_hist_familiar_vinculos"
                        name="psico_hist_familiar_vinculos"
                        placeholder="Qualidade dos vínculos afetivos com figuras de referência."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_hist_familiar_eventos_traumaticos"
                        name="psico_hist_familiar_eventos_traumaticos"
                        placeholder="Eventos traumáticos, separações, perdas significativas."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_hist_familiar_transtornos_mentais"
                        name="psico_hist_familiar_transtornos_mentais"
                        placeholder="Histórico familiar de transtornos mentais."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 4 – Relacionamentos Interpessoais
                      </Label>
                      <Textarea
                        id="psico_relacionamentos_vinculos_afetivos"
                        name="psico_relacionamentos_vinculos_afetivos"
                        placeholder="Vínculos afetivos (familiares, amorosos, amizades)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_relacionamentos_suporte_social"
                        name="psico_relacionamentos_suporte_social"
                        placeholder="Rede de suporte social disponível."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_relacionamentos_padroes_dificuldades"
                        name="psico_relacionamentos_padroes_dificuldades"
                        placeholder="Padrão de relacionamento e principais dificuldades interpessoais."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 5 – Vida Acadêmica e Profissional
                      </Label>
                      <Textarea
                        id="psico_vida_acad_prof_desempenho"
                        name="psico_vida_acad_prof_desempenho"
                        placeholder="Desempenho acadêmico e/ou profissional atual."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_vida_acad_prof_satisfacao_estresse"
                        name="psico_vida_acad_prof_satisfacao_estresse"
                        placeholder="Satisfação, estresse ocupacional e conflitos relacionados ao estudo/trabalho."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_vida_acad_prof_conflitos_afastamentos"
                        name="psico_vida_acad_prof_conflitos_afastamentos"
                        placeholder="Histórico de conflitos, afastamentos ou mudanças recorrentes."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 6 – Condições Gerais de Saúde
                      </Label>
                      <Textarea
                        id="psico_saude_doencas_clinicas"
                        name="psico_saude_doencas_clinicas"
                        placeholder="Doenças clínicas atuais ou pregressas relevantes."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_saude_medicacoes"
                        name="psico_saude_medicacoes"
                        placeholder="Uso de medicações em geral (não apenas psicofármacos)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_saude_sono"
                        name="psico_saude_sono"
                        placeholder="Qualidade do sono (latência, despertares, pesadelos)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_saude_alimentacao"
                        name="psico_saude_alimentacao"
                        placeholder="Padrão alimentar (apetite, restrições, compulsões)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_saude_atividade_fisica"
                        name="psico_saude_atividade_fisica"
                        placeholder="Prática de atividade física (frequência, tipo)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_saude_substancias"
                        name="psico_saude_substancias"
                        placeholder="Uso de substâncias psicoativas (álcool, tabaco, drogas ilícitas, outras)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 7 – Avaliação do Estado Emocional
                      </Label>
                      <Textarea
                        id="psico_estado_emocional_humor"
                        name="psico_estado_emocional_humor"
                        placeholder="Humor predominante (tristeza, irritabilidade, euforia, labilidade)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_estado_emocional_ansiedade_irritabilidade"
                        name="psico_estado_emocional_ansiedade_irritabilidade"
                        placeholder="Nível de ansiedade, irritabilidade e sintomas associados."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_estado_emocional_pensamentos_crencas"
                        name="psico_estado_emocional_pensamentos_crencas"
                        placeholder="Pensamentos recorrentes, crenças disfuncionais ou ruminativos."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_estado_emocional_apetite_sono"
                        name="psico_estado_emocional_apetite_sono"
                        placeholder="Alterações de apetite e sono relacionadas ao estado emocional."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-semibold">
                        Seção 8 – Avaliação de Risco
                      </Label>
                      <Textarea
                        id="psico_risco_ideacao_suicida"
                        name="psico_risco_ideacao_suicida"
                        placeholder="Presença de ideação suicida (conteúdo, frequência, fatores desencadeantes)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_risco_plano_tentativa"
                        name="psico_risco_plano_tentativa"
                        placeholder="Existência de plano estruturado, tentativa prévia ou preparação para autoextermínio."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                      <Textarea
                        id="psico_risco_automutilacao"
                        name="psico_risco_automutilacao"
                        placeholder="Automutilação ou comportamentos autolesivos (frequência, função)."
                        className="min-h-[52px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="psico_impressao_clinica_plano" className="text-slate-700 font-semibold">
                        Seção 9 – Impressão Clínica e Plano Terapêutico
                      </Label>
                      <Textarea
                        id="psico_impressao_clinica_plano"
                        name="psico_impressao_clinica_plano"
                        placeholder="Formulação clínica inicial, hipótese diagnóstica (quando aplicável) e plano terapêutico."
                        className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {tipoAtendimento !== "Fonoaudiologia" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                      <div className="space-y-2">
                        <Label htmlFor="avaliacao_especifica" className="text-slate-600 font-medium">
                          Avaliações específicas
                        </Label>
                        <Textarea
                          id="avaliacao_especifica"
                          name="avaliacao_especifica"
                          placeholder="Descreva os instrumentos e procedimentos de avaliação utilizados, bem como os principais resultados."
                          className="min-h-[90px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="observacoes_comportamentais" className="text-slate-600 font-medium">
                          Observações comportamentais
                        </Label>
                        <Textarea
                          id="observacoes_comportamentais"
                          name="observacoes_comportamentais"
                          placeholder="Registre aspectos de atenção, postura, interação, iniciativa, organização, entre outros."
                          className="min-h-[90px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                      <div className="space-y-2">
                        <Label htmlFor="historico_escolar" className="text-slate-600 font-medium">
                          Histórico escolar
                        </Label>
                        <Textarea
                          id="historico_escolar"
                          name="historico_escolar"
                          placeholder="Informe percurso escolar, rendimento, dificuldades relatadas pela escola e família."
                          className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                        />
                      </div>
                      {tipoAtendimento === "Psicologia" && (
                        <div className="space-y-2">
                          <Label htmlFor="desenvolvimento_neuropsicomotor" className="text-slate-600 font-medium">
                            Desenvolvimento neuropsicomotor
                          </Label>
                          <Textarea
                            id="desenvolvimento_neuropsicomotor"
                            name="desenvolvimento_neuropsicomotor"
                            placeholder="Registre marcos do desenvolvimento, aquisições, atrasos e aspectos motores relevantes."
                            className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
                      {tipoAtendimento === "Psicopedagogia" && (
                        <div className="space-y-2">
                          <Label htmlFor="aspectos_comunicativos" className="text-slate-600 font-medium">
                            Aspectos comunicativos
                          </Label>
                          <Textarea
                            id="aspectos_comunicativos"
                            name="aspectos_comunicativos"
                            placeholder="Descreva linguagem oral, escrita, compreensão, expressão, fluência e uso funcional da comunicação."
                            className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                          />
                        </div>
                      )}
                      {(tipoAtendimento === "Psicologia" || tipoAtendimento === "Psicopedagogia") && (
                        <div className="space-y-2">
                          <Label htmlFor="aspectos_emocionais" className="text-slate-600 font-medium">
                            Aspectos emocionais
                          </Label>
                          <Textarea
                            id="aspectos_emocionais"
                            name="aspectos_emocionais"
                            placeholder="Registre humor, vínculos, autoimagem, sinais de ansiedade, medos, entre outros."
                            className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                          />
                        </div>
                      )}
                      {(tipoAtendimento === "Psicologia" || tipoAtendimento === "Psicopedagogia") && (
                        <div className="space-y-2">
                          <Label htmlFor="aspectos_sociais" className="text-slate-600 font-medium">
                            Aspectos sociais
                          </Label>
                          <Textarea
                            id="aspectos_sociais"
                            name="aspectos_sociais"
                            placeholder="Descreva relações familiares, escolares e comunitárias, participação em grupos e interações."
                            className="min-h-[80px] resize-y border-slate-300 focus-visible:ring-blue-600 leading-relaxed"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label className="text-slate-600 font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" /> Profissional Responsável
              </Label>
              <Input value={currentUserName} disabled className="h-9 bg-slate-50 border-slate-300" />
              <input type="hidden" name="professional_id" value={currentUserId} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="document" className="text-slate-600 font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-blue-600" />
                Anexos do atendimento
              </Label>
              <Input
                id="document"
                name="document"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="h-9 border-slate-300 file:mr-3 file:px-3 file:py-1.5 file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-muted-foreground">
                Utilize este campo para anexar laudos, relatórios ou resultados de avaliações.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subsequent visit: Summary + Return Date */}
      {selectedCrianca && isFirstVisit === false && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-foreground border-b pb-1.5">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Resumo do Atendimento</h3>
            <Badge variant="destructive" className="text-[10px] ml-1">Obrigatório</Badge>
          </div>
          <Card className="shadow-sm rounded-2xl">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Observações, evolução, prescrições e recomendações</Label>
                <RichTextEditor
                  value={summaryHtml}
                  onChange={setSummaryHtml}
                  placeholder="Detalhe as observações do atendimento atual, evolução do caso, prescrições e recomendações..."
                  minHeight="180px"
                />
              </div>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="return_date" className="text-sm font-medium flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4 text-primary" /> Data de Retorno (opcional)
                </Label>
                <Input
                  id="return_date"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">Se informado, um agendamento será criado automaticamente.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end gap-4 pt-4">
        <Button variant="outline" type="button" asChild>
          <Link to="/modulo/sam/atendimentos">Cancelar</Link>
        </Button>
        <Button 
          type="submit" 
          disabled={isPending || !selectedCrianca} 
        >
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Atendimento
            </>
          )}
        </Button>
      </div>
    </form>
    </>
  )
}
