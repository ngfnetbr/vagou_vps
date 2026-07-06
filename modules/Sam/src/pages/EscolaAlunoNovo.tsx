// @ts-nocheck
import { useEffect, useMemo, useState } from "react"
import { Spinner } from "@/components/common/Spinner";
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Save } from "lucide-react"
import { supabase } from "@sam/integrations/supabase/client"
import { useAuth } from "@root/contexts/AuthContext"
import { useConfiguracoesSistema } from "@root/hooks/api/configuracoes-hooks"
import { maskCPF, maskPhone } from "@root/utils/masks"
import { determinarTurmaBaseEscolarComCorte, encontrarTurmaSugerida } from "@root/utils/turma-utils"
import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { PageHeader } from "@sam/components/common/page-header"
import { toast } from "sonner"

type TurmaRow = { id: string; nome: string | null }

function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

export default function EscolaAlunoNovo() {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const modulePrefix = location.pathname.startsWith("/modulo/sam") ? "/modulo/sam" : ""
  const base = `${modulePrefix}/escola`

  const cmeiId = profile?.cmei_id || null

  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [sexo, setSexo] = useState<"Masculino" | "Feminino" | "">("")
  const [responsavelNome, setResponsavelNome] = useState("")
  const [responsavelCpf, setResponsavelCpf] = useState("")
  const [responsavelTelefone, setResponsavelTelefone] = useState("")
  const [turmaId, setTurmaId] = useState<string>("")
  const [turmaManual, setTurmaManual] = useState(false)
  const { data: config } = useConfiguracoesSistema()

  const { data: turmas, isLoading: loadingTurmas } = useQuery({
    queryKey: ["sam-escola-turmas", cmeiId],
    queryFn: async () => {
      if (!cmeiId) return [] as TurmaRow[]
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome")
        .eq("cmei_id", cmeiId)
        .eq("ativo", true)
        .order("nome")
      if (error) throw error
      return (data || []) as TurmaRow[]
    },
  })

  const turmaOptions = useMemo(() => turmas || [], [turmas])
  const turmaBaseSugerida = useMemo(() => {
    if (!dataNascimento) return ""
    return determinarTurmaBaseEscolarComCorte(dataNascimento, {
      data_corte_mes: config?.data_corte_mes,
      data_corte_dia: config?.data_corte_dia,
      idade_minima_meses: config?.idade_minima_meses,
      idade_maxima_anos: config?.idade_maxima_anos,
    })
  }, [config?.data_corte_dia, config?.data_corte_mes, config?.idade_maxima_anos, config?.idade_minima_meses, dataNascimento])

  const turmaSugerida = useMemo(
    () => encontrarTurmaSugerida(turmaOptions, turmaBaseSugerida),
    [turmaBaseSugerida, turmaOptions]
  )

  useEffect(() => {
    if (turmaManual) return
    setTurmaId(turmaSugerida?.id || "")
  }, [turmaManual, turmaSugerida?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cmeiId) {
      toast.error("Vínculo da escola não encontrado.")
      return
    }

    const nomeTrim = nome.trim()
    const respNomeTrim = responsavelNome.trim()
    const cpfDigits = onlyDigits(responsavelCpf)
    const telDigits = onlyDigits(responsavelTelefone)

    if (!nomeTrim || !dataNascimento || !sexo || !respNomeTrim || cpfDigits.length !== 11 || telDigits.length < 10) {
      toast.error("Preencha os campos obrigatórios (CPF com 11 dígitos e telefone válido).")
      return
    }

    setSaving(true)
    try {
      const status = sexo === "Feminino" ? "Matriculada" : "Matriculado"

      const { data, error } = await supabase
        .from("criancas")
        .insert([
          {
            nome: nomeTrim,
            data_nascimento: dataNascimento,
            sexo,
            responsavel_nome: respNomeTrim,
            responsavel_cpf: cpfDigits,
            responsavel_telefone: telDigits,
            cmei_atual_id: cmeiId,
            turma_atual_id: turmaId || null,
            status,
            origem_cadastro: "sam",
            modulo_gestor: "sam_sondar",
            ignorar_automacoes_vagou: true,
          },
        ])
        .select("id")
        .single()

      if (error) throw error
      toast.success("Aluno cadastrado com sucesso!")
      navigate(`${base}/alunos/${data.id}`)
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cadastrar aluno.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <PageHeader
        leading={(
          <Button variant="outline" size="icon" className="rounded-full" asChild>
            <Link to={`${base}/alunos`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        title="Cadastrar aluno"
        description="Cadastro rápido para uso no Portal da Escola."
      />

      {!cmeiId ? (
        <Card className="shadow-sm border-none ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-base">Vínculo da escola não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/modulo/vagou/admin" target="_blank" rel="noreferrer">
                Abrir Sistema Principal
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-sm border-none ring-1 ring-border">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-primary">
                  <Plus className="h-5 w-5" />
                  <CardTitle className="text-lg font-semibold">Dados do aluno</CardTitle>
                </div>
                <Button type="submit" className="gap-2" disabled={saving}>
                  {saving ? <Spinner className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento *</Label>
                  <Input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => {
                      setDataNascimento(e.target.value)
                      setTurmaManual(false)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sexo *</Label>
                  <Select value={sexo} onValueChange={(v) => setSexo(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select
                    value={turmaId}
                    onValueChange={(value) => {
                      setTurmaId(value)
                      setTurmaManual(true)
                    }}
                    disabled={loadingTurmas}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingTurmas ? "Carregando..." : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {turmaOptions.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome || "-"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {dataNascimento ? (
                    <p className="text-xs text-muted-foreground">
                      {turmaBaseSugerida
                        ? `Turma base sugerida pelo corte etário: ${turmaBaseSugerida}.`
                        : "Preencha a data de nascimento para sugerir a turma."}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Responsável *</Label>
                  <Input
                    value={responsavelNome}
                    onChange={(e) => setResponsavelNome(e.target.value)}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF do Responsável *</Label>
                  <Input
                    value={responsavelCpf}
                    onChange={(e) => setResponsavelCpf(maskCPF(e.target.value))}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Telefone celular/WhatsApp *</Label>
                  <Input
                    value={responsavelTelefone}
                    onChange={(e) => setResponsavelTelefone(maskPhone(e.target.value))}
                    inputMode="numeric"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
