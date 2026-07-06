// @ts-nocheck
import { useState, useEffect } from "react"
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Button } from "@ui/button"
import { Label } from "@ui/label"
import { FileText, Download, Printer, BarChart3, PieChart, Users, School, Calendar, ClipboardList, AlertTriangle, Stethoscope, TrendingUp, Clock, FileSpreadsheet } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/tabs"
import { supabase } from "@sam/integrations/supabase/client"
import { toast } from "sonner"
import { useCanAccess } from "@root/components/admin/PermissionGate"
import { VagouReportShell } from "@root/components/common/VagouReportShell"

type Period = "30days" | "90days" | "semester" | "year" | "all"

const APPOINTMENTS_TABLE = "appointments"
const STUDENTS_TABLE = "students"
const SCHOOLS_TABLE = "schools"
const SCHOOL_CLASSES_TABLE = "school_classes"
const SCHOOL_COMPLAINTS_TABLE = "school_complaints"

function getPeriodDate(period: Period): string | null {
  const now = new Date()
  switch (period) {
    case "30days": return new Date(now.setDate(now.getDate() - 30)).toISOString()
    case "90days": return new Date(now.setDate(now.getDate() - 90)).toISOString()
    case "semester": {
      const month = new Date().getMonth()
      const year = new Date().getFullYear()
      return new Date(year, month < 6 ? 0 : 6, 1).toISOString()
    }
    case "year": return new Date(new Date().getFullYear(), 0, 1).toISOString()
    default: return null
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR")
}

async function exportCSV(headers: string[], rows: string[][], filename: string) {
  const bom = "\uFEFF"
  const csv = bom + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function printTable(title: string, headers: string[], rows: string[][]) {
  const html = `
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { color: #666; font-size: 12px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; }
      tr:nth-child(even) { background: #fafafa; }
    </style></head><body>
    <h1>${title}</h1>
    <p>Gerado em ${new Date().toLocaleString("pt-BR")}</p>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
    </body></html>`
  const w = window.open("", "_blank")
  if (w) { w.document.write(html); w.document.close(); w.print() }
}

export default function RelatoriosPage() {
  const canView = useCanAccess(["modulos.sam.acessar", "sam.relatorios.visualizar"])
  return (
    <>
      {!canView ? (
        <div className="rounded-2xl border p-6 bg-muted/30 text-sm text-muted-foreground">
          Você não tem permissão para visualizar relatórios do SAM.
        </div>
      ) : (
      <VagouReportShell
        title="Relatórios Gerenciais"
        description="Extraia dados e estatísticas para acompanhamento e tomada de decisão."
      >
      <Tabs defaultValue="atendimentos" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="atendimentos" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Atendimentos</TabsTrigger>
          <TabsTrigger value="alunos" className="gap-1.5"><Users className="h-3.5 w-3.5" />Alunos</TabsTrigger>
          <TabsTrigger value="escolas" className="gap-1.5"><School className="h-3.5 w-3.5" />Instituições</TabsTrigger>
          <TabsTrigger value="profissionais" className="gap-1.5"><Stethoscope className="h-3.5 w-3.5" />Profissionais</TabsTrigger>
          <TabsTrigger value="queixas" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Queixas</TabsTrigger>
        </TabsList>

        <TabsContent value="atendimentos">
          <div className="grid gap-6 md:grid-cols-2">
            <ReportAtendimentosPorEscola />
            <ReportAtendimentosPorStatus />
            <ReportAtendimentosPorTipo />
            <ReportAtendimentosPorPeriodo />
          </div>
        </TabsContent>

        <TabsContent value="alunos">
          <div className="grid gap-6 md:grid-cols-2">
            <ReportAlunosEmEspera />
            <ReportAlunosPorEscola />
            <ReportAlunosPorStatus />
          </div>
        </TabsContent>

        <TabsContent value="escolas">
          <div className="grid gap-6 md:grid-cols-2">
            <ReportEscolasResumo />
            <ReportTurmasPorEscola />
          </div>
        </TabsContent>

        <TabsContent value="profissionais">
          <div className="grid gap-6 md:grid-cols-2">
            <ReportProdutividadeProfissional />
            <ReportAtendimentosPorEspecialidade />
          </div>
        </TabsContent>

        <TabsContent value="queixas">
          <div className="grid gap-6 md:grid-cols-2">
            <ReportQueixasPorEscola />
            <ReportQueixasPorStatus />
          </div>
        </TabsContent>
      </Tabs>
      </VagouReportShell>
      )}
    </>
  )
}

// === REPORT COMPONENTS ===

function ReportAtendimentosPorEscola() {
  return <GenericReport
    icon={BarChart3} title="Atendimentos por Instituição"
    description="Volume de atendimentos agrupado por unidade."
    fetchData={async (period) => {
      const since = getPeriodDate(period)
      let query = supabase.from(APPOINTMENTS_TABLE).select("id, date, students!inner(school_id)")
      if (since) query = query.gte("date", since)
      const { data } = await query
      const schoolIds = [...new Set((data || []).map((a: any) => a.students?.school_id).filter(Boolean))]
      const { data: schools } = schoolIds.length
        ? await supabase.from("schools").select("id, name").in("id", schoolIds as string[])
        : { data: [] as any[] }
      const schoolMap = new Map((schools || []).map((s: any) => [s.id, s.name]))
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((a: any) => {
        const name = schoolMap.get(a.students?.school_id) || "Sem instituição"
        grouped[name] = (grouped[name] || 0) + 1
      })
      const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1])
      return {
        headers: ["Instituição", "Qtd. Atendimentos"],
        rows: sorted.map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

function ReportAtendimentosPorStatus() {
  return <GenericReport
    icon={PieChart} title="Atendimentos por Status"
    description="Distribuição dos atendimentos por situação atual."
    fetchData={async (period) => {
      const since = getPeriodDate(period)
      let query = supabase.from(APPOINTMENTS_TABLE).select("id, status, date")
      if (since) query = query.gte("date", since)
      const { data } = await query
      const statusLabels: Record<string, string> = {
        scheduled: "Agendado", completed: "Realizado", missed: "Faltou", cancelled: "Cancelado"
      }
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((a: any) => {
        const label = statusLabels[a.status] || a.status || "Sem status"
        grouped[label] = (grouped[label] || 0) + 1
      })
      return {
        headers: ["Status", "Quantidade"],
        rows: Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

function ReportAtendimentosPorTipo() {
  return <GenericReport
    icon={FileText} title="Atendimentos por Tipo"
    description="Quantidade de atendimentos por tipo/especialidade."
    fetchData={async (period) => {
      const since = getPeriodDate(period)
      let query = supabase.from(APPOINTMENTS_TABLE).select("id, type, date")
      if (since) query = query.gte("date", since)
      const { data } = await query
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((a: any) => {
        grouped[a.type || "Não informado"] = (grouped[a.type || "Não informado"] || 0) + 1
      })
      return {
        headers: ["Tipo", "Quantidade"],
        rows: Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

function ReportAtendimentosPorPeriodo() {
  return <GenericReport
    icon={Calendar} title="Atendimentos por Mês"
    description="Evolução mensal dos atendimentos realizados."
    fetchData={async (period) => {
      const since = getPeriodDate(period)
      let query = supabase.from(APPOINTMENTS_TABLE).select("id, date")
      if (since) query = query.gte("date", since)
      const { data } = await query
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((a: any) => {
        const d = new Date(a.date)
        const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
        grouped[key] = (grouped[key] || 0) + 1
      })
      return {
        headers: ["Mês/Ano", "Quantidade"],
        rows: Object.entries(grouped).sort().map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

function ReportAlunosEmEspera() {
  return <GenericReport
    icon={Clock} title="Alunos em Lista de Espera"
    description="Alunos aguardando início de acompanhamento."
    fetchData={async () => {
      let q = supabase.from(STUDENTS_TABLE).select("full_name, birth_date, guardian_name, schools(name)").eq("status", "waiting").order("full_name")
      const { data } = await q
      return {
        headers: ["Aluno", "Data Nasc.", "Responsável", "Instituição"],
        rows: (data || []).map((s: any) => [
          s.full_name, s.birth_date ? formatDate(s.birth_date) : "-",
          s.guardian_name || "-", (s.schools as any)?.name || "-"
        ]),
        total: (data || []).length
      }
    }}
  />
}

function ReportAlunosPorEscola() {
  return <GenericReport
    icon={School} title="Alunos por Instituição"
    description="Distribuição de alunos cadastrados por unidade."
    fetchData={async () => {
      let q = supabase.from(STUDENTS_TABLE).select("id, schools(name)")
      const { data } = await q
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((s: any) => {
        const name = (s.schools as any)?.name || "Sem instituição"
        grouped[name] = (grouped[name] || 0) + 1
      })
      return {
        headers: ["Instituição", "Qtd. Alunos"],
        rows: Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

function ReportAlunosPorStatus() {
  return <GenericReport
    icon={TrendingUp} title="Alunos por Status"
    description="Situação atual dos alunos no sistema."
    fetchData={async () => {
      let q = supabase.from(STUDENTS_TABLE).select("id, status")
      const { data } = await q
      const labels: Record<string, string> = { active: "Em Acompanhamento", waiting: "Aguardando", finished: "Finalizado" }
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((s: any) => {
        const label = labels[s.status] || s.status || "Sem status"
        grouped[label] = (grouped[label] || 0) + 1
      })
      return {
        headers: ["Status", "Quantidade"],
        rows: Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

function ReportEscolasResumo() {
  return <GenericReport
    icon={School} title="Resumo de Instituições"
    description="Listagem de instituições com quantidade de alunos vinculados."
    fetchData={async () => {
      let schoolsQ = supabase.from(SCHOOLS_TABLE).select("id, name, active, address").order("name")
      let studentsQ = supabase.from(STUDENTS_TABLE).select("school_id")
      const [{ data: schools }, { data: students }] = await Promise.all([schoolsQ, studentsQ])
      const countMap: Record<string, number> = {}
      ;(students || []).forEach((s: any) => { if (s.school_id) countMap[s.school_id] = (countMap[s.school_id] || 0) + 1 })
      return {
        headers: ["Instituição", "Endereço", "Status", "Alunos"],
        rows: (schools || []).map((s: any) => [
          s.name, s.address || "-", s.active ? "Ativa" : "Inativa", String(countMap[s.id] || 0)
        ]),
        total: (schools || []).length
      }
    }}
  />
}

function ReportTurmasPorEscola() {
  return <GenericReport
    icon={FileSpreadsheet} title="Turmas por Instituição"
    description="Turmas ativas agrupadas por unidade."
    fetchData={async () => {
      let q = supabase.from(SCHOOL_CLASSES_TABLE).select("name, active, schools(name)").eq("active", true).order("name")
      const { data } = await q
      return {
        headers: ["Turma", "Instituição"],
        rows: (data || []).map((t: any) => [t.name, (t.schools as any)?.name || "-"]),
        total: (data || []).length
      }
    }}
  />
}

function ReportProdutividadeProfissional() {
  return <GenericReport
    icon={Stethoscope} title="Produtividade por Profissional"
    description="Quantidade de atendimentos realizados por profissional."
    fetchData={async (period) => {
      const since = getPeriodDate(period)
      let query = supabase.from(APPOINTMENTS_TABLE).select("id, date, profiles:professional_id(full_name)")
      if (since) query = query.gte("date", since)
      const { data } = await query
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((a: any) => {
        const name = (a.profiles as any)?.full_name || "Sem nome"
        grouped[name] = (grouped[name] || 0) + 1
      })
      return {
        headers: ["Profissional", "Atendimentos"],
        rows: Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

function ReportAtendimentosPorEspecialidade() {
  return <GenericReport
    icon={PieChart} title="Atendimentos por Especialidade"
    description="Distribuição por especialidade dos profissionais."
    fetchData={async (period) => {
      const since = getPeriodDate(period)
      let query = supabase.from(APPOINTMENTS_TABLE).select("id, type, date")
      if (since) query = query.gte("date", since)
      const { data } = await query
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((a: any) => {
        grouped[a.type || "Não informado"] = (grouped[a.type || "Não informado"] || 0) + 1
      })
      return {
        headers: ["Especialidade", "Quantidade"],
        rows: Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

function ReportQueixasPorEscola() {
  return <GenericReport
    icon={AlertTriangle} title="Queixas por Instituição"
    description="Volume de queixas registradas por unidade."
    fetchData={async (period) => {
      const since = getPeriodDate(period)
      let query = supabase.from(SCHOOL_COMPLAINTS_TABLE).select("id, created_at, schools(name)")
      if (since) query = query.gte("created_at", since)
      const { data } = await query
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((q: any) => {
        const name = (q.schools as any)?.name || "Sem instituição"
        grouped[name] = (grouped[name] || 0) + 1
      })
      return {
        headers: ["Instituição", "Qtd. Queixas"],
        rows: Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

function ReportQueixasPorStatus() {
  return <GenericReport
    icon={ClipboardList} title="Queixas por Status"
    description="Situação atual das queixas escolares registradas."
    fetchData={async (period) => {
      const since = getPeriodDate(period)
      let query = supabase.from(SCHOOL_COMPLAINTS_TABLE).select("id, status, created_at")
      if (since) query = query.gte("created_at", since)
      const { data } = await query
      const labels: Record<string, string> = {
        pending: "Pendente",
        in_review: "Em Análise",
        analyzing: "Em Análise",
        in_progress: "Em Análise",
        scheduled: "Agendado",
        completed: "Concluído",
        resolved: "Concluído",
        closed: "Concluído",
        rejected: "Rejeitado",
      }
      const grouped: Record<string, number> = {}
      ;(data || []).forEach((q: any) => {
        const label = labels[q.status] || q.status || "Sem status"
        grouped[label] = (grouped[label] || 0) + 1
      })
      return {
        headers: ["Status", "Quantidade"],
        rows: Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        total: (data || []).length
      }
    }}
  />
}

// === GENERIC REPORT CARD ===

interface ReportResult { headers: string[]; rows: string[][]; total: number }
interface GenericReportProps {
  icon: any; title: string; description: string
  fetchData: (period: Period) => Promise<ReportResult>
}

function GenericReport({ icon: Icon, title, description, fetchData }: GenericReportProps) {
  const [period, setPeriod] = useState<Period>("30days")
  const [result, setResult] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const data = await fetchData(period)
      setResult(data)
    } catch (e) {
      toast.error("Erro ao gerar relatório")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col shadow-sm border-none ring-1 ring-border overflow-hidden">
      <CardHeader className="pb-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-primary/10 text-primary rounded-lg"><Icon className="h-5 w-5" /></div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 pt-5">
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="90days">Últimos 90 dias</SelectItem>
                <SelectItem value="semester">Este Semestre</SelectItem>
                <SelectItem value="year">Ano Letivo</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={loading} size="sm" className="shrink-0">
            {loading ? <Spinner className="h-4 w-4 animate-spin mr-1" /> : <BarChart3 className="h-4 w-4 mr-1" />}
            Gerar
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              {result.total} registro(s) encontrado(s)
            </div>
            <div className="max-h-48 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>{result.headers.map((h, i) => <th key={i} className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {result.rows.length > 0 ? result.rows.map((row, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                      {row.map((cell, j) => <td key={j} className="px-3 py-1.5 text-xs">{cell}</td>)}
                    </tr>
                  )) : (
                    <tr><td colSpan={result.headers.length} className="px-3 py-4 text-center text-muted-foreground text-xs">Nenhum dado encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>

      {result && result.rows.length > 0 && (
        <div className="p-4 pt-0 mt-auto flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => printTable(title, result.headers, result.rows)}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />Imprimir
          </Button>
          <Button variant="default" size="sm" className="flex-1" onClick={() => { exportCSV(result.headers, result.rows, title.replace(/\s/g, "_")); toast.success("CSV exportado!") }}>
            <Download className="mr-1.5 h-3.5 w-3.5" />Exportar CSV
          </Button>
        </div>
      )}
    </Card>
  )
}
