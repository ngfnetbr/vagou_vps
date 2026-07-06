import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Eye, Calendar, User, Stethoscope, FileText } from "lucide-react"

interface AnamnesisSection {
  label: string
  fields: { key: string; label: string }[]
}

const fonoSections: AnamnesisSection[] = [
  { label: "Queixa Fonoaudiológica", fields: [
    { key: "fono_queixa", label: "Queixa principal" },
    { key: "fono_queixa_tempo_e_impacto", label: "Tempo e impacto" },
  ]},
  { label: "Histórico Gestacional e Perinatal", fields: [
    { key: "fono_hist_gestacao_intercorrencias", label: "Intercorrências" },
    { key: "fono_hist_gestacao_substancias_medicamentos", label: "Substâncias/medicamentos" },
    { key: "fono_hist_parto_tipo", label: "Tipo de parto" },
    { key: "fono_hist_prematuridade", label: "Prematuridade" },
    { key: "fono_hist_peso_nascer", label: "Peso ao nascer" },
    { key: "fono_hist_uti_neonatal", label: "UTI neonatal" },
  ]},
  { label: "Desenvolvimento da Linguagem", fields: [
    { key: "fono_desenvol_vocalizacoes_idade", label: "Primeiras vocalizações" },
    { key: "fono_desenvol_primeiras_palavras_idade", label: "Primeiras palavras" },
    { key: "fono_desenvol_frases_idade", label: "Formação de frases" },
    { key: "fono_desenvol_compreensao_verbal", label: "Compreensão verbal" },
    { key: "fono_desenvol_fonologia_trocas_omissoes", label: "Trocas/omissões" },
    { key: "fono_desenvol_inteligibilidade_fala", label: "Inteligibilidade de fala" },
    { key: "fono_desenvol_disfluencia", label: "Disfluência" },
  ]},
  { label: "Histórico Auditivo", fields: [
    { key: "fono_hist_auditivo_triagem_neonatal", label: "Triagem neonatal" },
    { key: "fono_hist_auditivo_exames", label: "Exames audiológicos" },
    { key: "fono_hist_auditivo_otites_recorrentes", label: "Otites recorrentes" },
    { key: "fono_hist_auditivo_suspeita_perda", label: "Suspeita de perda" },
    { key: "fono_hist_auditivo_protese", label: "Prótese/implante" },
  ]},
  { label: "Motricidade Orofacial e Alimentação", fields: [
    { key: "fono_motricidade_amamentacao", label: "Amamentação" },
    { key: "fono_motricidade_chupeta_mamadeira", label: "Chupeta/mamadeira" },
    { key: "fono_motricidade_respiracao", label: "Respiração" },
    { key: "fono_motricidade_mastigacao", label: "Mastigação" },
    { key: "fono_motricidade_degluticao", label: "Deglutição" },
    { key: "fono_motricidade_bruxismo", label: "Bruxismo" },
    { key: "fono_motricidade_habitos_orais", label: "Hábitos orais" },
  ]},
  { label: "Desempenho Escolar", fields: [
    { key: "fono_escolar_dificuldades_leitura", label: "Dificuldades em leitura" },
    { key: "fono_escolar_dificuldades_escrita", label: "Dificuldades em escrita" },
    { key: "fono_escolar_consciencia_fonologica", label: "Consciência fonológica" },
    { key: "fono_escolar_relato_escolar", label: "Relato escolar" },
    { key: "fono_escolar_impacto_academico", label: "Impacto acadêmico" },
  ]},
  { label: "Impressão Clínica Inicial", fields: [
    { key: "fono_impressao_clinica_inicial", label: "Impressão clínica" },
  ]},
]

const psicoSections: AnamnesisSection[] = [
  { label: "Queixa Principal", fields: [
    { key: "psico_queixa", label: "Queixa principal" },
    { key: "psico_queixa_e_prejuizos", label: "Prejuízos funcionais" },
  ]},
  { label: "Histórico Psicológico e Psiquiátrico", fields: [
    { key: "psico_hist_psicologico_psicoterapia", label: "Psicoterapia prévia" },
    { key: "psico_hist_psicologico_diagnosticos", label: "Diagnósticos" },
    { key: "psico_hist_psicologico_psicofarmacos", label: "Psicofármacos" },
    { key: "psico_hist_psicologico_internacoes", label: "Internações" },
    { key: "psico_hist_psicologico_acompanhamento_medico", label: "Acompanhamento" },
  ]},
  { label: "Histórico Familiar", fields: [
    { key: "psico_hist_familiar_dinamica", label: "Dinâmica familiar" },
    { key: "psico_hist_familiar_vinculos", label: "Vínculos afetivos" },
    { key: "psico_hist_familiar_eventos_traumaticos", label: "Eventos traumáticos" },
    { key: "psico_hist_familiar_transtornos_mentais", label: "Transtornos familiares" },
  ]},
  { label: "Avaliação do Estado Emocional", fields: [
    { key: "psico_estado_emocional_humor", label: "Humor predominante" },
    { key: "psico_estado_emocional_ansiedade_irritabilidade", label: "Ansiedade/irritabilidade" },
    { key: "psico_estado_emocional_pensamentos_crencas", label: "Pensamentos recorrentes" },
  ]},
  { label: "Avaliação de Risco", fields: [
    { key: "psico_risco_ideacao_suicida", label: "Ideação suicida" },
    { key: "psico_risco_plano_tentativa", label: "Plano/tentativa" },
    { key: "psico_risco_automutilacao", label: "Automutilação" },
  ]},
  { label: "Impressão Clínica e Plano", fields: [
    { key: "psico_impressao_clinica_plano", label: "Impressão e plano" },
  ]},
]

const psicopeSections: AnamnesisSection[] = [
  { label: "Queixa Principal", fields: [
    { key: "psicope_queixa", label: "Queixa principal" },
    { key: "psicope_queixa_detalhamento", label: "Detalhamento" },
  ]},
  { label: "Histórico Gestacional", fields: [
    { key: "psicope_hist_gestacao_planejamento", label: "Planejamento" },
    { key: "psicope_hist_gestacao_intercorrencias", label: "Intercorrências" },
    { key: "psicope_hist_gestacao_medicacoes", label: "Medicações" },
    { key: "psicope_hist_parto_tipo", label: "Tipo de parto" },
  ]},
  { label: "Desenvolvimento Neuropsicomotor", fields: [
    { key: "psicope_desenvol_sentou_idade", label: "Sentou" },
    { key: "psicope_desenvol_engatinhou_idade", label: "Engatinhou" },
    { key: "psicope_desenvol_andou_idade", label: "Andou" },
    { key: "psicope_desenvol_esfincteriano", label: "Controle esfincteriano" },
    { key: "psicope_desenvol_atrasos_regressoes", label: "Atrasos/regressões" },
  ]},
  { label: "Histórico Escolar", fields: [
    { key: "psicope_escolar_idade_ingresso", label: "Idade de ingresso" },
    { key: "psicope_escolar_reprovacoes", label: "Reprovações" },
    { key: "psicope_escolar_rendimento", label: "Rendimento" },
    { key: "psicope_escolar_dificuldades_leitura", label: "Dificuldades em leitura" },
    { key: "psicope_escolar_dificuldades_escrita", label: "Dificuldades em escrita" },
    { key: "psicope_escolar_dificuldades_matematica", label: "Dificuldades em matemática" },
  ]},
  { label: "Aspectos Cognitivos e Comportamentais", fields: [
    { key: "psicope_cognitivo_atencao", label: "Atenção" },
    { key: "psicope_cognitivo_memoria_operacional", label: "Memória operacional" },
    { key: "psicope_cognitivo_organizacao", label: "Organização" },
    { key: "psicope_cognitivo_autonomia", label: "Autonomia" },
  ]},
  { label: "Contexto Familiar", fields: [
    { key: "psicope_familiar_composicao", label: "Composição familiar" },
    { key: "psicope_familiar_dinamica", label: "Dinâmica familiar" },
    { key: "psicope_familiar_eventos_estressores", label: "Eventos estressores" },
  ]},
  { label: "Observações Técnicas", fields: [
    { key: "psicope_observacoes_tecnicas", label: "Observações" },
  ]},
]

function getSectionsForSpecialty(specialty: string): AnamnesisSection[] {
  if (specialty === "Fonoaudiologia") return fonoSections
  if (specialty === "Psicologia") return psicoSections
  if (specialty === "Psicopedagogia") return psicopeSections
  return []
}

interface AnamnesisViewerProps {
  data: Record<string, any>
  specialty: string
  professionalName?: string
  date?: string
}

export function AnamnesisViewer({ data, specialty, professionalName, date }: AnamnesisViewerProps) {
  const sections = getSectionsForSpecialty(specialty)
  const formattedDate = (() => {
    if (!date) return null
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return null
    return format(d, "dd/MM/yyyy", { locale: ptBR })
  })()

  if (sections.length === 0 || !data || Object.keys(data).length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma anamnese registrada para esta especialidade.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Anamnese — {specialty}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">Somente leitura</Badge>
        </div>
        {(professionalName || formattedDate) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            {professionalName && (
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{professionalName}</span>
            )}
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {sections.map((section) => {
          const filledFields = section.fields.filter((f) => data[f.key])
          if (filledFields.length === 0) return null

          return (
            <div key={section.label} className="space-y-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">{section.label}</h4>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-3 border">
                {filledFields.map((field) => (
                  <div key={field.key}>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">{field.label}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{data[field.key]}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

