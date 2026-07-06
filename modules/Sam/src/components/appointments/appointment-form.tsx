// @ts-nocheck
"use client"

import { useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Textarea } from "@ui/textarea"
import { Card, CardContent } from "@ui/card"
import { ArrowLeft, Calendar, User, Clock, CheckCircle2, FileText, AlertCircle } from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@ui/select"
import { createAgendaAppointment as createAppointment } from "@sam/lib/actions/agenda"
import { CriancaAutocomplete, type Crianca } from "@sam/components/atendimentos/crianca-autocomplete"

interface Professional { id: string; nome_completo?: string | null; full_name?: string | null; specialty?: string | null }
interface AppointmentFormProps {
  professionals: Professional[]
  types: { id: string; name: string; active?: boolean }[]
}

export function AppointmentForm({ professionals, types }: AppointmentFormProps) {
  const navigate = useNavigate()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCrianca, setSelectedCrianca] = useState<Crianca | null>(null)
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!selectedCrianca) { setError("Por favor, selecione um aluno."); return }
    const formData = new FormData(e.currentTarget)
    formData.set("student_id", selectedCrianca.id)
    setIsPending(true)
    try {
      const result = await createAppointment(formData)
      if (result?.error) {
        const msg = typeof result.error === "string" ? result.error : "Falha ao criar agendamento"
        setError(msg)
      }
      else navigate("/modulo/sam/agenda")
    } finally { setIsPending(false) }
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="grid gap-6">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary border-b pb-2">
              <Calendar className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Detalhes da Sessão</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="student_id">Aluno</Label>
                <CriancaAutocomplete onSelect={setSelectedCrianca} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="professional_id">Profissional</Label>
                <Select name="professional_id" onValueChange={(value) => {
                  const prof = professionals.find((p) => p.id === value)
                  setSelectedSpecialty(prof?.specialty || null)
                }}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o profissional..." /></SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {(prof.nome_completo || prof.full_name) ?? ""}
                        {prof.specialty ? ` (${prof.specialty})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSpecialty && <div className="text-xs text-muted-foreground">Especialidade: <span className="font-medium">{selectedSpecialty}</span></div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Atendimento</Label>
                <Select name="type" required>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                  <SelectContent>{types.map((t) => (<SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input id="data" name="date" type="date" required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario">Horário</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input id="horario" name="time" type="time" required className="pl-10 h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duracao">Duração (min)</Label>
                <Input id="duracao" name="duration" type="number" defaultValue="45" step="15" className="h-11" />
              </div>
            </div>
          </div>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 text-primary border-b pb-2">
              <FileText className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Observações</h3>
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="observacoes">Notas Adicionais</Label>
              <Textarea id="observacoes" name="observations" placeholder="Observações sobre o agendamento..." className="min-h-[100px] resize-y" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button variant="outline" className="h-11 px-6" asChild>
              <Link to="/modulo/sam/agenda">Cancelar</Link>
            </Button>
            <Button type="submit" className="h-11 px-6 font-semibold shadow-sm" disabled={isPending}>
              {isPending ? (<><Spinner className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : (<><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar Agendamento</>)}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
