// @ts-nocheck
import { useState, useEffect } from "react"
import { Spinner } from "@/components/common/Spinner";
import { useNavigate, Link, useLocation } from "react-router-dom"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Textarea } from "@ui/textarea"
import { Card, CardContent } from "@ui/card"
import { Badge } from "@ui/badge"
import { Switch } from "@ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { ArrowLeft, Save, Paperclip, Forward } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { createComplaint } from "@sam/lib/actions/queixas"
import { useAuth } from "@root/contexts/AuthContext"
import { toast } from "sonner"
import { fetchPrincipalStudents } from "@sam/lib/principalStudents"

const diagnosisOptions = [
  "Déficit de Atenção",
  "Hiperatividade",
  "Dislexia",
  "Discalculia",
  "Transtorno do Espectro Autista",
  "Atraso de Linguagem",
  "Dificuldade de Aprendizagem",
  "Problemas de Comportamento",
  "Ansiedade",
  "Outro",
]

const laudoTypeOptions = [
  "Laudo de TEA (Transtorno do Espectro Autista)",
  "Laudo de TDAH (Transtorno de Déficit de Atenção e Hiperatividade)",
  "Laudo de TOD (Transtorno Opositivo Desafiador)",
  "Laudo de Dislexia",
  "Laudo de Discalculia",
  "Laudo de Deficiência Intelectual",
  "Laudo de Deficiência Auditiva",
  "Laudo de Deficiência Visual",
  "Laudo de Transtorno de Ansiedade",
  "Laudo de Depressão",
  "Laudo Neurológico",
  "Laudo Psicológico",
  "Laudo Fonoaudiológico",
  "Outro",
]

export default function QueixaNova() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, userProfile } = useAuth()
  const modulePrefix = location.pathname.startsWith("/modulo/sam") ? "/modulo/sam" : ""
  const isSchoolPortal = location.pathname.startsWith(`${modulePrefix}/escola`) || location.pathname.startsWith("/escola")
  const basePath = `${modulePrefix}${isSchoolPortal ? "/escola/queixas" : "/queixas"}`
  const alunoIdFromQuery = new URLSearchParams(location.search).get("alunoId") || ""

  const [isPending, setIsPending] = useState(false)
  const [schools, setSchools] = useState<Array<{ id: string; nome: string }>>([])
  const [students, setStudents] = useState<Array<{ id: string; nome: string }>>([])
  const [selectedSchool, setSelectedSchool] = useState(profile?.school_id || "")
  const [selectedStudent, setSelectedStudent] = useState(alunoIdFromQuery)
  const [primaryComplaint, setPrimaryComplaint] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [impactLearning, setImpactLearning] = useState("")
  const [behaviorClassroom, setBehaviorClassroom] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [laudoFile, setLaudoFile] = useState<File | null>(null)
  const [laudoType, setLaudoType] = useState("")
  const [referralRequested, setReferralRequested] = useState(false)
  const [referralNotes, setReferralNotes] = useState("")

  useEffect(() => {
    const loadSchools = async () => {
      if (profile?.role === 'school_coord' && profile?.school_id) {
        let q: any = supabase.from("schools").select("id, name").eq("id", profile.school_id)
        const { data, error } = await q.single()
        if (!error && data) {
          setSchools([{ id: data.id, nome: data.name }])
          setSelectedSchool(profile.school_id)
          return
        }
      }
      let q: any = supabase.from("schools").select("id, name").eq("active", true).order("name")
      const { data, error } = await q
      if (!error) {
        const list = (data || []).map((r: any) => ({ id: r.id, nome: r.name }))
        setSchools(list)
      }
    }
    loadSchools()
  }, [])

  useEffect(() => {
    const loadStudents = async () => {
      if (selectedSchool) {
        const selectedSchoolRow = schools.find((school) => school.id === selectedSchool)
        const data = await fetchPrincipalStudents({ schoolName: selectedSchoolRow?.nome, limit: 500 })
        setStudents((data || []).map((student) => ({ id: student.id, nome: student.nome })))
      } else {
        setStudents([])
      }
    }
    loadStudents()
  }, [selectedSchool, schools])

  useEffect(() => {
    if (profile?.role === 'school_coord' && profile?.school_id) {
      setSelectedSchool(profile.school_id)
    }
  }, [profile])

  useEffect(() => {
    if (!alunoIdFromQuery) return
    if (selectedStudent) return
    setSelectedStudent(alunoIdFromQuery)
  }, [alunoIdFromQuery, selectedStudent])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSchool || !selectedStudent || !primaryComplaint.trim()) {
      toast.error("Preencha todos os campos obrigatórios.")
      return
    }
    if (laudoFile && !laudoType) {
      toast.error("Selecione o tipo do laudo anexado.")
      return
    }

    setIsPending(true)
    try {
      let documentUrl: string | undefined
      if (laudoFile) {
        const fileExt = laudoFile.name.split('.').pop()
        const fileName = `laudos/${selectedStudent}/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, laudoFile)
        if (uploadError) {
          toast.error('Erro ao fazer upload do laudo.')
          setIsPending(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName)
        documentUrl = publicUrl
      }

      const result = await createComplaint({
        schoolId: selectedSchool,
        studentId: selectedStudent,
        primaryComplaint,
        symptoms: symptoms || undefined,
        impactLearning: impactLearning || undefined,
        behaviorClassroom: behaviorClassroom || undefined,
        diagnosisTags: selectedTags.length > 0 ? selectedTags : undefined,
        documentUrl,
        laudoType: laudoType || undefined,
        referralRequested,
        referralNotes: referralNotes || undefined,
      })
      toast.success(`Queixa registrada! Protocolo: ${result.protocol}`)
      navigate(basePath)
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar queixa.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full" asChild>
          <Link to={basePath}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Nova Queixa</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm border-none ring-1 ring-border">
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Instituição *</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool} disabled={profile?.role === 'school_coord'}>
                  <SelectTrigger><SelectValue placeholder="Selecione a instituição..." /></SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aluno *</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger><SelectValue placeholder="Selecione o aluno..." /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Queixa Principal *</Label>
              <Textarea
                value={primaryComplaint}
                onChange={(e) => setPrimaryComplaint(e.target.value)}
                placeholder="Descreva a queixa principal reportada pela instituição..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Diagnósticos / Tags</Label>
              <div className="flex flex-wrap gap-2">
                {diagnosisOptions.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sintomas Observados</Label>
              <Textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Descreva os sintomas observados em sala de aula..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Impacto no Aprendizado</Label>
                <Textarea
                  value={impactLearning}
                  onChange={(e) => setImpactLearning(e.target.value)}
                  placeholder="Como afeta o aprendizado do aluno..."
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Comportamento em Sala</Label>
                <Textarea
                  value={behaviorClassroom}
                  onChange={(e) => setBehaviorClassroom(e.target.value)}
                  placeholder="Descreva o comportamento em sala de aula..."
                  className="min-h-[80px]"
                />
              </div>
            </div>

            {/* Upload de Laudo */}
            <div className="space-y-3 border-t pt-5">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Paperclip className="h-4 w-4 text-primary" />
                Anexar Laudo Médico
              </Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setLaudoFile(e.target.files?.[0])}
                className="file:mr-3 file:px-3 file:py-1.5 file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. 20MB)
              </p>

              {laudoFile && (
                <div className="space-y-2">
                  <Label>Tipo do Laudo *</Label>
                  <Select value={laudoType} onValueChange={setLaudoType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo do laudo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {laudoTypeOptions.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Encaminhamento */}
            <div className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Forward className="h-4 w-4 text-primary" />
                  Solicitar Encaminhamento para Atendimento
                </Label>
                <Switch checked={referralRequested} onCheckedChange={setReferralRequested} />
              </div>
              <p className="text-xs text-muted-foreground">
                Marque para encaminhar o aluno diretamente ao atendimento com profissional especializado.
              </p>
              {referralRequested && (
                <div className="space-y-2">
                  <Label>Observações do Encaminhamento</Label>
                  <Textarea
                    value={referralNotes}
                    onChange={(e) => setReferralNotes(e.target.value)}
                    placeholder="Descreva o motivo do encaminhamento e qual tipo de atendimento seria indicado..."
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" asChild>
            <Link to={basePath}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <><Spinner className="mr-2 h-4 w-4 animate-spin" /> Registrando...</> : <><Save className="mr-2 h-4 w-4" /> Registrar Queixa</>}
          </Button>
        </div>
      </form>
    </div>
    </>
  )
}
