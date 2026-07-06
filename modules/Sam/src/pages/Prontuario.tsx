import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import DOMPurify from "dompurify"
import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
import { ArrowLeft, FileText, Calendar, User, Clock, Stethoscope, CalendarPlus, Eye, Printer, Upload, Download, Trash2, Loader2 } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { AnamnesisViewer } from "@sam/components/atendimentos/anamnesis-viewer"
import { ensureSamStudentFromPrincipal } from "@sam/lib/principalStudents"
import { fetchHistoricoSondagens, isSondagemAplicavel } from "@sam/lib/sondagem"
import { SpecialtyBadge } from "@sam/components/common/specialty-badge"
import {
  listStudentDocuments,
  uploadStudentDocument,
  getStudentDocumentUrl,
  deleteStudentDocument,
  type StudentDocument,
} from "@sam/lib/actions/students-sam"
import { useToast } from "@root/hooks/use-toast"

export default function Prontuario() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAnamnesis, setExpandedAnamnesis] = useState<string | null>(null)
  const [sondagemHistorico, setSondagemHistorico] = useState<any[]>([])
  const [loadingSondagem, setLoadingSondagem] = useState(false)
  const [sondagemAplicavel, setSondagemAplicavel] = useState<boolean | null>(null)
  const [sondagemErro, setSondagemErro] = useState(false)
  const [docsAtendimentos, setDocsAtendimentos] = useState<any[]>([])
  const [docsQueixas, setDocsQueixas] = useState<any[]>([])
  const [docsErro, setDocsErro] = useState(false)
  const { toast } = useToast()
  const [uploadDocs, setUploadDocs] = useState<StudentDocument[]>([])
  const [uploadMissing, setUploadMissing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState("")

  const refreshUploadDocs = async () => {
    const { data, missingTable } = await listStudentDocuments(id!)
    setUploadDocs(data)
    setUploadMissing(missingTable)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { data: userData } = await supabase.auth.getUser()
    const res = await uploadStudentDocument({
      studentId: id!,
      file,
      docType: docType || undefined,
      uploadedBy: userData?.user?.id || null,
    })
    setUploading(false)
    e.target.value = ""
    if (res.success) {
      toast({ title: "Documento enviado" })
      setDocType("")
      refreshUploadDocs()
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" })
    }
  }

  const handleOpenDoc = async (doc: StudentDocument) => {
    const url = await getStudentDocumentUrl(doc.file_path)
    if (url) window.open(url, "_blank")
    else toast({ title: "Erro", description: "Não foi possível abrir o documento.", variant: "destructive" })
  }

  const handleDeleteDoc = async (doc: StudentDocument) => {
    if (!confirm(`Excluir "${doc.file_name}"?`)) return
    const res = await deleteStudentDocument(doc)
    if (res.success) {
      toast({ title: "Documento excluído" })
      refreshUploadDocs()
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" })
    }
  }


  useEffect(() => {
    const load = async () => {
      await ensureSamStudentFromPrincipal(id!)
      let studentQ = supabase.from("students").select("id, full_name, birth_date, class_name").eq("id", id!)
      const [studentRes, recordsRes, apptDocsRes, complaintDocsRes] = await Promise.all([
        studentQ.single(),
        supabase
          .from("appointment_records")
          .select("*, profiles(full_name, registration_number)")
          .eq("student_id", id!)
          .order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("id, date, type, document_url")
          .eq("student_id", id!)
          .not("document_url", "is", null)
          .order("date", { ascending: false }),
        supabase
          .from("school_complaints")
          .select("id, protocol, laudo_type, created_at, document_url")
          .eq("student_id", id!)
          .not("document_url", "is", null)
          .order("created_at", { ascending: false }),
      ])
      const st = studentRes.data
      setStudent(st)
      setRecords(recordsRes.data || [])
      setDocsErro(false)
      if (apptDocsRes.error || complaintDocsRes.error) {
        setDocsErro(true)
        setDocsAtendimentos([])
        setDocsQueixas([])
      } else {
        setDocsAtendimentos(apptDocsRes.data || [])
        setDocsQueixas(complaintDocsRes.data || [])
      }
      const up = await listStudentDocuments(id!)
      setUploadDocs(up.data)
      setUploadMissing(up.missingTable)

      const aplicavel = isSondagemAplicavel(st?.birth_date)
      setSondagemAplicavel(aplicavel)
      if (aplicavel) {
        setLoadingSondagem(true)
        setSondagemErro(false)
        try {
          const hist = await fetchHistoricoSondagens(id!)
          setSondagemHistorico(hist)
        } catch {
          setSondagemErro(true)
          setSondagemHistorico([])
        } finally {
          setLoadingSondagem(false)
        }
      } else {
        setSondagemHistorico([])
      }
      setLoading(false)
    }
    if (id) load()
  }, [id])

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando prontuário...</div>

  return (
    <>
      <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full" asChild>
          <Link to={`/modulo/sam/alunos/${id}`}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Prontuário Eletrônico</h2>
          <p className="text-muted-foreground">{student?.full_name || "Aluno"}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline">{records.length} registro(s)</Badge>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to={`/modulo/sam/alunos/${id}/prontuario/relatorio`}>
              <Printer className="h-4 w-4" /> Relatório
            </Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-none ring-1 ring-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Sondagem</span>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to={`/modulo/sondar/aluno/${id}`}>
                <FileText className="h-4 w-4" /> Abrir ficha
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sondagemAplicavel === false ? (
            <p className="text-sm text-muted-foreground">Não aplicável para a faixa etária/turma atual.</p>
          ) : loadingSondagem ? (
            <p className="text-sm text-muted-foreground">Carregando dados da sondagem...</p>
          ) : sondagemErro ? (
            <p className="text-sm text-muted-foreground">Não foi possível carregar os dados da sondagem.</p>
          ) : sondagemHistorico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sondagem finalizada registrada.</p>
          ) : (() => {
            const ultimo = sondagemHistorico[sondagemHistorico.length - 1]
            const escrita = ultimo.respostas.find((r: any) => r.tipo === "escrita")
            const prod = ultimo.respostas.find((r: any) => r.tipo === "producao_texto")
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Último período</p>
                  <p className="font-medium">{ultimo.periodo}</p>
                  <p className="text-xs text-muted-foreground">
                    {ultimo.created_at ? new Date(ultimo.created_at).toLocaleDateString("pt-BR") : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Escrita</p>
                  <p className="font-medium">{escrita ? `${escrita.codigo} — ${escrita.descricao}` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Produção de texto</p>
                  <p className="font-medium">{prod ? `${prod.codigo} — ${prod.descricao}` : "—"}</p>
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none ring-1 ring-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Documentos (Receitas/Laudos)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {docsErro ? (
            <p className="text-sm text-muted-foreground">Não foi possível carregar os documentos.</p>
          ) : docsAtendimentos.length + docsQueixas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {docsAtendimentos.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">Atendimento — {d.type || "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.date ? new Date(d.date).toLocaleDateString("pt-BR") : "—"}</p>
                  </div>
                  <a href={d.document_url} target="_blank" rel="noreferrer" className="shrink-0 underline">Abrir</a>
                </div>
              ))}
              {docsQueixas.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">Queixa/Laudo — {d.protocol || d.laudo_type || "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : "—"}</p>
                  </div>
                  <a href={d.document_url} target="_blank" rel="noreferrer" className="shrink-0 underline">Abrir</a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none ring-1 ring-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-3">
            <span>Documentos e laudos da criança</span>
            <Button asChild size="sm" variant="default" className="gap-1.5" disabled={uploading}>
              <label className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Enviando..." : "Enviar arquivo"}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploadMissing ? (
            <p className="text-sm text-muted-foreground">
              O armazenamento de documentos ainda não está configurado no backend.
            </p>
          ) : uploadDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento enviado para esta criança.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {uploadDocs.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.doc_type ? `${d.doc_type} • ` : ""}
                      {d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDoc(d)} title="Abrir/baixar">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(d)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>



      {records.length === 0 ? (
        <Card className="shadow-sm border-none ring-1 ring-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum atendimento registrado para este aluno.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => {
            const dateObj = new Date(rec.created_at)
            const profile = (rec as any).profiles
            const anamnesisData = typeof rec.anamnesis_data === 'string'
              ? JSON.parse(rec.anamnesis_data)
              : rec.anamnesis_data || {}
            const hasAnamnesis = Object.keys(anamnesisData).length > 0

            return (
              <Card key={rec.id} className="shadow-sm border-none ring-1 ring-border">
                <CardContent className="p-5 space-y-3">
                  {/* Header row */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{dateObj.toLocaleDateString('pt-BR')}</span>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {rec.is_first_visit && (
                        <Badge variant="default" className="text-[10px]">1º Atendimento</Badge>
                      )}
                    <SpecialtyBadge specialty={rec.specialty} className="text-[10px]" />
                    {rec.appointment_id && (
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                        <Link to={`/modulo/sam/atendimentos/${rec.appointment_id}`}>
                          <Eye className="h-3 w-3" /> Ver atendimento
                        </Link>
                      </Button>
                    )}
                    </div>
                  </div>

                  {/* Professional info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {profile?.full_name || 'Profissional'}
                    </span>
                    {rec.registration_number && (
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-3.5 w-3.5" />
                        Reg: {rec.registration_number}
                      </span>
                    )}
                    {profile?.specialty && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{profile.specialty}</span>
                    )}
                  </div>

                  {/* Summary */}
                  {rec.summary && (
                    <div className="bg-muted/50 p-3 rounded-lg border border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Resumo do Atendimento</p>
                      <div
                        className="text-sm text-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rec.summary) }}
                      />
                    </div>
                  )}

                  {/* Return date */}
                  {rec.return_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarPlus className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Retorno:</span>
                      <span className="font-medium">{new Date(rec.return_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}

                  {/* Anamnesis toggle */}
                  {hasAnamnesis && (
                    <div className="pt-2 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setExpandedAnamnesis(expandedAnamnesis === rec.id ? null : rec.id)}
                      >
                        <Eye className="h-3 w-3" />
                        {expandedAnamnesis === rec.id ? "Ocultar Anamnese" : "Ver Anamnese Completa"}
                      </Button>
                      {expandedAnamnesis === rec.id && (
                        <div className="mt-3">
                          <AnamnesisViewer
                            data={anamnesisData}
                            specialty={rec.specialty || ""}
                            professionalName={profile?.full_name}
                            date={rec.created_at}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      </div>
    </>
  )
}
