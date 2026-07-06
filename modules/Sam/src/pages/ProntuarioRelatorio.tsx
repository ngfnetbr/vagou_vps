// @ts-nocheck
import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import DOMPurify from "dompurify"
import { Button } from "@ui/button"
import { Badge } from "@ui/badge"
import { ArrowLeft, Printer, Calendar, User, Stethoscope, Clock, CalendarPlus, Tag, Paperclip, Forward, FileText } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ensureSamStudentFromPrincipal } from "@sam/lib/principalStudents"
import { getPrincipalReportConfig } from "@sam/lib/reportConfig"
import { fetchHistoricoSondagens, isSondagemAplicavel } from "@sam/lib/sondagem"
import { SpecialtyBadge } from "@sam/components/common/specialty-badge"

const statusMap: Record<string, string> = {
  active: "Em Acompanhamento",
  waiting: "Aguardando Avaliação",
  finished: "Finalizado",
}

const APPOINTMENTS_TABLE = "appointments"
const APPOINTMENT_RECORDS_TABLE = "appointment_records"
const SCHOOL_COMPLAINTS_TABLE = "school_complaints"

// Anamnesis sections (simplified labels for report)
const fonoSections = [
  { label: "Queixa Fonoaudiológica", keys: ["fono_queixa", "fono_queixa_tempo_e_impacto"] },
  { label: "Histórico Gestacional e Perinatal", keys: ["fono_hist_gestacao_intercorrencias", "fono_hist_gestacao_substancias_medicamentos", "fono_hist_parto_tipo", "fono_hist_prematuridade", "fono_hist_peso_nascer", "fono_hist_uti_neonatal"] },
  { label: "Desenvolvimento da Linguagem", keys: ["fono_desenvol_vocalizacoes_idade", "fono_desenvol_primeiras_palavras_idade", "fono_desenvol_frases_idade", "fono_desenvol_compreensao_verbal", "fono_desenvol_fonologia_trocas_omissoes", "fono_desenvol_inteligibilidade_fala", "fono_desenvol_disfluencia"] },
  { label: "Histórico Auditivo", keys: ["fono_hist_auditivo_triagem_neonatal", "fono_hist_auditivo_exames", "fono_hist_auditivo_otites_recorrentes", "fono_hist_auditivo_suspeita_perda", "fono_hist_auditivo_protese"] },
  { label: "Motricidade Orofacial e Alimentação", keys: ["fono_motricidade_amamentacao", "fono_motricidade_chupeta_mamadeira", "fono_motricidade_respiracao", "fono_motricidade_mastigacao", "fono_motricidade_degluticao", "fono_motricidade_bruxismo", "fono_motricidade_habitos_orais"] },
  { label: "Desempenho Escolar", keys: ["fono_escolar_dificuldades_leitura", "fono_escolar_dificuldades_escrita", "fono_escolar_consciencia_fonologica", "fono_escolar_relato_escolar", "fono_escolar_impacto_academico"] },
  { label: "Impressão Clínica", keys: ["fono_impressao_clinica_inicial"] },
]

const psicoSections = [
  { label: "Queixa Principal", keys: ["psico_queixa", "psico_queixa_e_prejuizos"] },
  { label: "Histórico Psicológico", keys: ["psico_hist_psicologico_psicoterapia", "psico_hist_psicologico_diagnosticos", "psico_hist_psicologico_psicofarmacos", "psico_hist_psicologico_internacoes", "psico_hist_psicologico_acompanhamento_medico"] },
  { label: "Histórico Familiar", keys: ["psico_hist_familiar_dinamica", "psico_hist_familiar_vinculos", "psico_hist_familiar_eventos_traumaticos", "psico_hist_familiar_transtornos_mentais"] },
  { label: "Estado Emocional", keys: ["psico_estado_emocional_humor", "psico_estado_emocional_ansiedade_irritabilidade", "psico_estado_emocional_pensamentos_crencas"] },
  { label: "Avaliação de Risco", keys: ["psico_risco_ideacao_suicida", "psico_risco_plano_tentativa", "psico_risco_automutilacao"] },
  { label: "Impressão Clínica e Plano", keys: ["psico_impressao_clinica_plano"] },
]

const psicopeSections = [
  { label: "Queixa Principal", keys: ["psicope_queixa", "psicope_queixa_detalhamento"] },
  { label: "Histórico Gestacional", keys: ["psicope_hist_gestacao_planejamento", "psicope_hist_gestacao_intercorrencias", "psicope_hist_gestacao_medicacoes", "psicope_hist_parto_tipo"] },
  { label: "Desenvolvimento Neuropsicomotor", keys: ["psicope_desenvol_sentou_idade", "psicope_desenvol_engatinhou_idade", "psicope_desenvol_andou_idade", "psicope_desenvol_esfincteriano", "psicope_desenvol_atrasos_regressoes"] },
  { label: "Histórico Escolar", keys: ["psicope_escolar_idade_ingresso", "psicope_escolar_reprovacoes", "psicope_escolar_rendimento", "psicope_escolar_dificuldades_leitura", "psicope_escolar_dificuldades_escrita", "psicope_escolar_dificuldades_matematica"] },
  { label: "Aspectos Cognitivos e Comportamentais", keys: ["psicope_cognitivo_atencao", "psicope_cognitivo_memoria_operacional", "psicope_cognitivo_organizacao", "psicope_cognitivo_autonomia"] },
  { label: "Contexto Familiar", keys: ["psicope_familiar_composicao", "psicope_familiar_dinamica", "psicope_familiar_eventos_estressores"] },
  { label: "Observações Técnicas", keys: ["psicope_observacoes_tecnicas"] },
]

function getSections(specialty: string) {
  if (specialty === "Fonoaudiologia") return fonoSections
  if (specialty === "Psicologia") return psicoSections
  if (specialty === "Psicopedagogia") return psicopeSections
  return []
}

function formatLabel(key: string) {
  return key.replace(/^(fono|psico|psicope)_/, "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
}

export default function ProntuarioRelatorio() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [complaints, setComplaints] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [sondagemHistorico, setSondagemHistorico] = useState<any[]>([])
  const [sondagemAplicavel, setSondagemAplicavel] = useState<boolean | null>(null)
  const [sondagemErro, setSondagemErro] = useState(false)
  const [reportConfig, setReportConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadAll()
  }, [id])

  async function loadAll() {
    await ensureSamStudentFromPrincipal(id!)
    let studentQ = supabase.from("students").select("*, schools(name)").eq("id", id!)
    let recordsQ = supabase.from(APPOINTMENT_RECORDS_TABLE).select("*, profiles(full_name, registration_number)").eq("student_id", id!).order("created_at", { ascending: true })
    let complaintsQ = supabase.from(SCHOOL_COMPLAINTS_TABLE).select("*, schools(name)").eq("student_id", id!).order("created_at", { ascending: true })
    let appointmentsQ = supabase.from(APPOINTMENTS_TABLE).select("id, date, status, type, duration_minutes, professional_id, document_url").eq("student_id", id!).order("date", { ascending: true })
    const [studentRes, recordsRes, complaintsRes, appointmentsRes, principalReport] = await Promise.all([
      studentQ.single(),
      recordsQ,
      complaintsQ,
      appointmentsQ,
      getPrincipalReportConfig(),
    ])
    setStudent(studentRes.data)
    setRecords(recordsRes.data || [])
    setComplaints(complaintsRes.data || [])
    setAppointments(appointmentsRes.data || [])
    setReportConfig(principalReport)

    const aplicavel = isSondagemAplicavel(studentRes.data?.birth_date)
    setSondagemAplicavel(aplicavel)
    setSondagemErro(false)
    if (aplicavel) {
      try {
        const hist = await fetchHistoricoSondagens(id!)
        setSondagemHistorico(hist)
      } catch {
        setSondagemErro(true)
        setSondagemHistorico([])
      }
    } else {
      setSondagemHistorico([])
    }

    // Enrich appointments with prof names
    const appts = appointmentsRes.data || []
    if (appts.length > 0) {
      const profIds = [...new Set(appts.map((a: any) => a.professional_id).filter(Boolean))]
      if (profIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", profIds as string[])
        const profMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]))
        appts.forEach((a: any) => { a._prof_name = profMap.get(a.professional_id) || "Profissional" })
      }
      setAppointments([...appts])
    }

    setLoading(false)
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando relatório...</div>
  if (!student) return <div className="text-center py-8 text-muted-foreground">Aluno não encontrado.</div>

  const statusLabel = statusMap[student.status] || student.status

  return (
    <>
      <div className="max-w-4xl mx-auto pb-8">
        {/* Screen-only controls */}
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Button variant="outline" size="icon" className="rounded-full" asChild>
          <Link to={`/modulo/sam/alunos/${id}/prontuario`}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-primary">Relatório de Prontuário</h2>
          <p className="text-sm text-muted-foreground">{student.full_name}</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Printable content */}
      <div className="print-report space-y-6">
        {/* Header */}
        <div className="text-center border-b-2 border-foreground/20 pb-4">
          {reportConfig?.brasaoBase64 && (
            <div className="mb-3 flex justify-center">
              <img src={reportConfig.brasaoBase64} alt="Brasão" className="h-16 w-16 object-contain" />
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground">{reportConfig?.headerLine1 || "Município"}</h1>
          {reportConfig?.headerLine2 && <p className="text-sm text-muted-foreground">{reportConfig.headerLine2}</p>}
          {reportConfig?.headerLine3 && <p className="text-xs text-muted-foreground">{reportConfig.headerLine3}</p>}
          <h2 className="text-lg font-semibold mt-3 text-primary">PRONTUÁRIO DO ALUNO</h2>
          <p className="text-xs text-muted-foreground">Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>

        {/* Student info */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-1 mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Dados do Aluno
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="text-muted-foreground">Nome:</span> <strong>{student.full_name}</strong></div>
            <div><span className="text-muted-foreground">Data de Nascimento:</span> <strong>{student.birth_date ? format(new Date(student.birth_date), "dd/MM/yyyy") : "—"}</strong></div>
            <div><span className="text-muted-foreground">Instituição:</span> <strong>{(student as any).schools?.name || "—"}</strong></div>
            <div><span className="text-muted-foreground">Turma:</span> <strong>{student.class_name || "—"}</strong></div>
            <div><span className="text-muted-foreground">Responsável:</span> <strong>{student.guardian_name || "—"}</strong></div>
            <div><span className="text-muted-foreground">Status:</span> <strong>{statusLabel}</strong></div>
          </div>
          {student.reason && (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Motivo do encaminhamento:</span>
              <p className="mt-0.5">{student.reason}</p>
            </div>
          )}
          {student.observations && (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Observações:</span>
              <p className="mt-0.5">{student.observations}</p>
            </div>
          )}
        </section>

        {/* Sondagem */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-1 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Sondagem
          </h3>
          {sondagemAplicavel === false ? (
            <p className="text-sm text-muted-foreground">Não aplicável para a faixa etária/turma atual.</p>
          ) : sondagemErro ? (
            <p className="text-sm text-muted-foreground">Não foi possível carregar os dados da sondagem.</p>
          ) : sondagemHistorico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sondagem finalizada registrada.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1.5 font-semibold text-muted-foreground">Período</th>
                  <th className="py-1.5 font-semibold text-muted-foreground">Data</th>
                  <th className="py-1.5 font-semibold text-muted-foreground">Escrita</th>
                  <th className="py-1.5 font-semibold text-muted-foreground">Produção</th>
                  <th className="py-1.5 font-semibold text-muted-foreground">Observações</th>
                </tr>
              </thead>
              <tbody>
                {sondagemHistorico.map((s: any) => {
                  const escrita = s.respostas.find((r: any) => r.tipo === "escrita")
                  const prod = s.respostas.find((r: any) => r.tipo === "producao_texto")
                  return (
                    <tr key={s.id} className="border-b border-muted">
                      <td className="py-1.5">{s.periodo}</td>
                      <td className="py-1.5">{s.created_at ? format(new Date(s.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</td>
                      <td className="py-1.5">{escrita ? `${escrita.codigo} — ${escrita.descricao}` : "—"}</td>
                      <td className="py-1.5">{prod ? `${prod.codigo} — ${prod.descricao}` : "—"}</td>
                      <td className="py-1.5">{s.observacoes || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Complaints */}
        {complaints.length > 0 && (
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-1 mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" /> Queixas Escolares ({complaints.length})
            </h3>
            <div className="space-y-3">
              {complaints.map((c, i) => (
                <div key={c.id} className="text-sm border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{c.protocol}</span>
                    <span className="text-xs">•</span>
                    <span className="text-xs">{format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    <span className="text-xs">•</span>
                    <span className="text-xs font-medium">{(c as any).schools?.name}</span>
                  </div>
                  <p>{c.primary_complaint}</p>
                  {c.diagnosis_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.diagnosis_tags.map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[10px] print:border print:border-foreground/20">{t}</Badge>
                      ))}
                    </div>
                  )}
                  {(c as any).laudo_type && (
                    <p className="text-xs mt-1 text-muted-foreground flex items-center gap-1"><Paperclip className="h-3 w-3" /> Laudo: {(c as any).laudo_type}</p>
                  )}
                  {(c as any).document_url && (
                    <p className="text-xs mt-1 text-muted-foreground flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      <a href={(c as any).document_url} target="_blank" rel="noreferrer" className="underline break-all">
                        Documento anexado
                      </a>
                    </p>
                  )}
                  {(c as any).referral_requested && (
                    <p className="text-xs mt-1 text-muted-foreground flex items-center gap-1"><Forward className="h-3 w-3" /> Encaminhamento solicitado</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Appointments timeline */}
        {appointments.length > 0 && (
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-1 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Histórico de Agendamentos ({appointments.length})
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1.5 font-semibold text-muted-foreground">Data</th>
                  <th className="py-1.5 font-semibold text-muted-foreground">Horário</th>
                  <th className="py-1.5 font-semibold text-muted-foreground">Tipo</th>
                  <th className="py-1.5 font-semibold text-muted-foreground">Profissional</th>
                  <th className="py-1.5 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => {
                  const d = new Date(a.date)
                  const statusLabels: Record<string, string> = { scheduled: "Agendado", completed: "Realizado", missed: "Faltou", cancelled: "Cancelado" }
                  return (
                    <tr key={a.id} className="border-b border-muted">
                      <td className="py-1.5">{format(d, "dd/MM/yyyy")}</td>
                      <td className="py-1.5">{format(d, "HH:mm")}</td>
                      <td className="py-1.5">{a.type}</td>
                      <td className="py-1.5">{a._prof_name || "—"}</td>
                      <td className="py-1.5">{statusLabels[a.status] || a.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Documentos */}
        {(() => {
          const docsAtend = (appointments || []).filter((a: any) => a.document_url)
          const docsQueixas = (complaints || []).filter((c: any) => c.document_url)
          const total = docsAtend.length + docsQueixas.length
          if (total === 0) return null
          return (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-1 mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Documentos (Receitas/Laudos) ({total})
              </h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-1.5 font-semibold text-muted-foreground">Origem</th>
                    <th className="py-1.5 font-semibold text-muted-foreground">Referência</th>
                    <th className="py-1.5 font-semibold text-muted-foreground">Data</th>
                    <th className="py-1.5 font-semibold text-muted-foreground">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {docsAtend.map((a: any) => (
                    <tr key={`appt-${a.id}`} className="border-b border-muted">
                      <td className="py-1.5">Atendimento</td>
                      <td className="py-1.5">{a.type || "—"}</td>
                      <td className="py-1.5">{a.date ? format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR }) : "—"}</td>
                      <td className="py-1.5">
                        <a href={a.document_url} target="_blank" rel="noreferrer" className="underline break-all">Abrir</a>
                      </td>
                    </tr>
                  ))}
                  {docsQueixas.map((c: any) => (
                    <tr key={`complaint-${c.id}`} className="border-b border-muted">
                      <td className="py-1.5">Queixa/Laudo</td>
                      <td className="py-1.5">{c.protocol || c.laudo_type || "—"}</td>
                      <td className="py-1.5">{c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</td>
                      <td className="py-1.5">
                        <a href={c.document_url} target="_blank" rel="noreferrer" className="underline break-all">Abrir</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })()}

        {/* Clinical records (prontuário) */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-1 mb-3 flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Registros de Atendimento ({records.length})
          </h3>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro de atendimento encontrado.</p>
          ) : (
            <div className="space-y-5">
              {records.map((rec, i) => {
                const dateObj = new Date(rec.created_at)
                const profile = (rec as any).profiles
                const anamnesisData = typeof rec.anamnesis_data === "string"
                  ? JSON.parse(rec.anamnesis_data)
                  : rec.anamnesis_data || {}
                const hasAnamnesis = Object.keys(anamnesisData).length > 0
                const sections = getSections(rec.specialty || "")

                return (
                  <div key={rec.id} className="border rounded-lg p-4 page-break-inside-avoid">
                    {/* Record header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-bold">#{i + 1}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {format(dateObj, "dd/MM/yyyy", { locale: ptBR })}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {format(dateObj, "HH:mm")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {rec.is_first_visit && (
                          <Badge variant="default" className="text-[10px] print:border print:bg-transparent print:text-foreground">1º Atendimento</Badge>
                        )}
                        <SpecialtyBadge specialty={rec.specialty} className="text-[10px] print:border print:bg-transparent print:text-foreground" />
                      </div>
                    </div>

                    {/* Professional */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {profile?.full_name || "Profissional"}</span>
                      {rec.registration_number && <span>Reg: {rec.registration_number}</span>}
                      {profile?.specialty && <span>{profile.specialty}</span>}
                    </div>

                    {/* Summary */}
                    {rec.summary && (
                      <div className="bg-muted/40 p-3 rounded-lg mb-3 border border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Resumo do Atendimento</p>
                        <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rec.summary) }} />
                      </div>
                    )}

                    {/* Return date */}
                    {rec.return_date && (
                      <div className="flex items-center gap-2 text-xs mb-3">
                        <CalendarPlus className="h-3 w-3 text-primary" />
                        <span>Retorno: <strong>{format(new Date(rec.return_date), "dd/MM/yyyy")}</strong></span>
                      </div>
                    )}

                    {/* Anamnesis data */}
                    {hasAnamnesis && sections.length > 0 && (
                      <div className="space-y-2 mt-3 border-t pt-3">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Anamnese — {rec.specialty}</p>
                        {sections.map((section) => {
                          const filled = section.keys.filter(k => anamnesisData[k])
                          if (filled.length === 0) return null
                          return (
                            <div key={section.label} className="ml-2">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">{section.label}</p>
                              <div className="space-y-1 ml-2">
                                {filled.map(k => (
                                  <div key={k} className="text-xs">
                                    <span className="text-muted-foreground">{formatLabel(k)}:</span>{" "}
                                    <span>{anamnesisData[k]}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="border-t-2 border-foreground/20 pt-4 mt-8 text-center text-xs text-muted-foreground">
          <p>Documento gerado automaticamente pelo Sistema de Atendimento Multidisciplinar (SAM)</p>
          <p>{reportConfig?.footerText || "Sistema Principal"} — {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
          <p className="mt-4 text-[10px]">Este documento é confidencial e destinado exclusivamente para uso profissional.</p>
        </div>
      </div>
    </div>
    </>
  )
}
