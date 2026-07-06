import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Eye, 
  TrendingUp, 
  Users, 
  School, 
  Calendar,
  BarChart3,
  Clock,
  XCircle,
  FileSpreadsheet,
  ArrowRightLeft,
  Filter,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/api/admin-hooks";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import { useTurmasBase } from "@/hooks/api/turmas-base-hooks";
import { useState } from "react";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  gerarRelatorioOcupacaoPDF,
  gerarRelatorioOcupacaoExcel,
  gerarRelatorioVagasPDF,
  gerarRelatorioVagasExcel,
  gerarRelatorioFilaPDF,
  gerarRelatorioFilaExcel,
  gerarRelatorioConvocacoesPDF,
  gerarRelatorioConvocacoesExcel,
  gerarRelatorioMatriculasPDF,
  gerarRelatorioMatriculasExcel,
  gerarRelatorioMatriculadosResumoPDF,
  gerarRelatorioMatriculadosResumoExcel,
  gerarRelatorioHistoricoMatriculasPDF,
  gerarRelatorioHistoricoMatriculasExcel,
  gerarRelatorioDesistenciasPDF,
  gerarRelatorioDesistenciasExcel,
  gerarRelatorioTempoEsperaPDF,
  gerarRelatorioTempoEsperaExcel,
  gerarRelatorioTransferenciasPDF,
  gerarRelatorioTransferenciasExcel,
  gerarRelatorioCamposCustomizadosPDF,
  gerarRelatorioCamposCustomizadosExcel,
  gerarHtmlRelatorio,
  type FiltrosRelatorio
} from "@/utils/relatorios-utils";
import { RelatorioPreviewDialog } from "@/components/admin/RelatorioPreviewDialog";

const STATUS_OPTIONS = [
  { value: "Fila de Espera", label: "Fila de Espera" },
  { value: "Convocado", label: "Convocado" },
  { value: "Aguardando Documentação", label: "Aguardando Documentação" },
  { value: "Matriculado", label: "Matriculado" },
  { value: "Matriculada", label: "Matriculada" },
  { value: "Recusada", label: "Recusada" },
  { value: "Desistente", label: "Desistente" },
  { value: "Remanejamento Solicitado", label: "Remanejamento Solicitado" },
  { value: "Concluinte", label: "Concluinte" },
];

const PRIORIDADE_OPTIONS = [
  { value: "Social", label: "Social" },
  { value: "Geral", label: "Geral" },
];

const SEXO_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Feminino", label: "Feminino" },
];

const TURNO_OPTIONS = [
  { value: "todos", label: "Todos os turnos" },
  { value: "Matutino", label: "Matutino" },
  { value: "Vespertino", label: "Vespertino" },
  { value: "Integral", label: "Integral" },
];

const PERIODO_OPTIONS = [
  { value: "todos", label: "Todos os períodos" },
  { value: "mes", label: "Mês Atual" },
  { value: "trimestre", label: "Último Trimestre" },
  { value: "semestre", label: "Último Semestre" },
  { value: "ano", label: "Ano Atual" },
  { value: "personalizado", label: "Período Personalizado" },
];

const calcularPeriodo = (periodo: string): { dataInicio?: string; dataFim?: string } => {
  const hoje = new Date();
  const dataFim = hoje.toISOString().split('T')[0];
  
  switch (periodo) {
    case "mes": {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { dataInicio: inicioMes.toISOString().split('T')[0], dataFim };
    }
    case "trimestre": {
      const inicioTrimestre = new Date(hoje);
      inicioTrimestre.setMonth(inicioTrimestre.getMonth() - 3);
      return { dataInicio: inicioTrimestre.toISOString().split('T')[0], dataFim };
    }
    case "semestre": {
      const inicioSemestre = new Date(hoje);
      inicioSemestre.setMonth(inicioSemestre.getMonth() - 6);
      return { dataInicio: inicioSemestre.toISOString().split('T')[0], dataFim };
    }
    case "ano": {
      const inicioAno = new Date(hoje.getFullYear(), 0, 1);
      return { dataInicio: inicioAno.toISOString().split('T')[0], dataFim };
    }
    default:
      return {};
  }
};

const Relatorios = () => {
  const { data: stats } = useDashboardStats();
  const { data: cmeis } = useCMEIs();
  const { data: turmasBase } = useTurmasBase();
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);
  
  // Filtros Globais
  const [filtrosGlobais, setFiltrosGlobais] = useState<FiltrosRelatorio>({});
  const [periodoSelecionado, setPeriodoSelecionado] = useState("todos");
  
  // Dialog para filtros avançados
  const [dialogFiltrosAvancados, setDialogFiltrosAvancados] = useState(false);

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRelatorio, setPreviewRelatorio] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Atualiza as datas quando o período muda
  const handlePeriodoChange = (periodo: string) => {
    setPeriodoSelecionado(periodo);
    if (periodo !== "personalizado") {
      const { dataInicio, dataFim } = calcularPeriodo(periodo);
      setFiltrosGlobais(prev => ({ ...prev, dataInicio, dataFim }));
    }
  };

  const relatorios = [
    {
      id: "ocupacao",
      title: "Relatório de Ocupação",
      description: `Ocupação atual de ${plural}`,
      icon: School,
      categoria: "geral",
    },
    {
      id: "vagas",
      title: "Relatório de Vagas",
      description: "Vagas livres por turma (capacidade, ocupados e livres)",
      icon: BarChart3,
      categoria: "geral",
    },
    {
      id: "fila",
      title: "Relatório de Fila",
      description: "Lista completa da fila de espera ordenada",
      icon: Users,
      categoria: "fila",
    },
    {
      id: "convocacoes",
      title: "Relatório de Convocações",
      description: "Histórico de convocações do período",
      icon: TrendingUp,
      categoria: "matriculas",
    },
    {
      id: "matriculas",
      title: "Lista de Matrículas Ativas",
      description: "Relatório completo das matrículas ativas",
      icon: FileText,
      categoria: "matriculas",
    },
    {
      id: "matriculados",
      title: "Matriculados (Resumo)",
      description: `Totais por ${singular} e turno (matutino/vespertino/integral)`,
      icon: Users,
      categoria: "matriculas",
    },
    {
      id: "historico-matriculas",
      title: "Histórico de Matrículas",
      description: "Eventos de matrícula (confirmada, desistência, conclusão, etc.)",
      icon: Calendar,
      categoria: "matriculas",
    },
    {
      id: "desistencias",
      title: "Estatísticas de Desistência",
      description: "Análise de desistências e recusas por período",
      icon: XCircle,
      categoria: "geral",
    },
    {
      id: "tempo-espera",
      title: "Tempo Médio de Espera",
      description: "Análise do tempo médio na fila até matrícula",
      icon: Clock,
      categoria: "fila",
    },
    {
      id: "transferencias",
      title: "Relatório de Transferências",
      description: `Histórico de transferências entre ${plural} e turmas`,
      icon: ArrowRightLeft,
      categoria: "matriculas",
    },
    {
      id: "campos-customizados",
      title: "Campos Customizados",
      description: "Exporta valores de campos personalizados do formulário",
      icon: FileSpreadsheet,
      categoria: "geral",
    },
  ];

  const limparFiltros = () => {
    setFiltrosGlobais({});
    setPeriodoSelecionado("todos");
  };

  const abrirPreview = async (relatorioId: string) => {
    setPreviewRelatorio(relatorioId);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml(null);

    try {
      const html = await gerarHtmlRelatorio(relatorioId, filtrosGlobais);
      setPreviewHtml(html);
    } catch (error) {
      console.error("Erro ao carregar preview:", error);
      toast.error("Erro ao carregar pré-visualização");
    } finally {
      setPreviewLoading(false);
    }
  };

  const exportarPDF = async () => {
    if (!previewRelatorio) return;
    setExporting(true);
    
    try {
      switch (previewRelatorio) {
        case "ocupacao":
          await gerarRelatorioOcupacaoPDF(filtrosGlobais);
          break;
        case "vagas":
          await gerarRelatorioVagasPDF(filtrosGlobais);
          break;
        case "fila":
          await gerarRelatorioFilaPDF(filtrosGlobais);
          break;
        case "convocacoes":
          await gerarRelatorioConvocacoesPDF(filtrosGlobais);
          break;
        case "matriculas":
          await gerarRelatorioMatriculasPDF(filtrosGlobais);
          break;
        case "matriculados":
          await gerarRelatorioMatriculadosResumoPDF(filtrosGlobais);
          break;
        case "historico-matriculas":
          await gerarRelatorioHistoricoMatriculasPDF(filtrosGlobais);
          break;
        case "desistencias":
          await gerarRelatorioDesistenciasPDF(filtrosGlobais);
          break;
        case "tempo-espera":
          await gerarRelatorioTempoEsperaPDF(filtrosGlobais);
          break;
        case "transferencias":
          await gerarRelatorioTransferenciasPDF(filtrosGlobais);
          break;
        case "campos-customizados":
          await gerarRelatorioCamposCustomizadosPDF(filtrosGlobais);
          break;
      }
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  const exportarExcel = async () => {
    if (!previewRelatorio) return;
    setExporting(true);
    
    try {
      switch (previewRelatorio) {
        case "ocupacao":
          await gerarRelatorioOcupacaoExcel(filtrosGlobais);
          break;
        case "vagas":
          await gerarRelatorioVagasExcel(filtrosGlobais);
          break;
        case "fila":
          await gerarRelatorioFilaExcel(filtrosGlobais);
          break;
        case "convocacoes":
          await gerarRelatorioConvocacoesExcel(filtrosGlobais);
          break;
        case "matriculas":
          await gerarRelatorioMatriculasExcel(filtrosGlobais);
          break;
        case "matriculados":
          await gerarRelatorioMatriculadosResumoExcel(filtrosGlobais);
          break;
        case "historico-matriculas":
          await gerarRelatorioHistoricoMatriculasExcel(filtrosGlobais);
          break;
        case "desistencias":
          await gerarRelatorioDesistenciasExcel(filtrosGlobais);
          break;
        case "tempo-espera":
          await gerarRelatorioTempoEsperaExcel(filtrosGlobais);
          break;
        case "transferencias":
          await gerarRelatorioTransferenciasExcel(filtrosGlobais);
          break;
        case "campos-customizados":
          await gerarRelatorioCamposCustomizadosExcel(filtrosGlobais);
          break;
      }
      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar Excel");
    } finally {
      setExporting(false);
    }
  };

  const filtrosAtivos = Object.values(filtrosGlobais).filter(v => v).length;
  const relatorioAtual = relatorios.find(r => r.id === previewRelatorio);

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gere e exporte relatórios do sistema
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Crianças</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCriancas || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Matriculadas</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.matriculadas || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fila de Espera</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.naFila || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.taxaOcupacao?.toFixed(0) || 0}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros Globais */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros Globais
            </CardTitle>
            <CardDescription>
              Selecione os filtros que serão aplicados aos relatórios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por Unidade */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Filtrar por {singular}</Label>
                <Select
                  value={filtrosGlobais.cmeiId || "todos"}
                  onValueChange={(value) => 
                    setFiltrosGlobais(prev => ({ 
                      ...prev, 
                      cmeiId: value === "todos" ? undefined : value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`${plural} (todas)`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">{plural} (todas)</SelectItem>
                    {cmeis?.map((cmei) => (
                      <SelectItem key={cmei.id} value={cmei.id}>
                        {cmei.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Período */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período</Label>
                <Select
                  value={periodoSelecionado}
                  onValueChange={handlePeriodoChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão Filtros Avançados */}
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-sm font-medium opacity-0">Ações</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDialogFiltrosAvancados(true)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Mais Filtros
                    {filtrosAtivos > 0 && (
                      <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                        {filtrosAtivos}
                      </span>
                    )}
                  </Button>
                  {filtrosAtivos > 0 && (
                    <Button variant="ghost" size="icon" onClick={limparFiltros}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Período Personalizado */}
            {periodoSelecionado === "personalizado" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data Início</Label>
                  <Input
                    type="date"
                    value={filtrosGlobais.dataInicio || ""}
                    onChange={(e) =>
                      setFiltrosGlobais(prev => ({ ...prev, dataInicio: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data Fim</Label>
                  <Input
                    type="date"
                    value={filtrosGlobais.dataFim || ""}
                    onChange={(e) =>
                      setFiltrosGlobais(prev => ({ ...prev, dataFim: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Resumo dos filtros */}
            {filtrosAtivos > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                {filtrosGlobais.cmeiId && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {singular}: {cmeis?.find(c => c.id === filtrosGlobais.cmeiId)?.nome}
                  </span>
                )}
                {filtrosGlobais.turmaBase && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Turma: {filtrosGlobais.turmaBase}
                  </span>
                )}
                {filtrosGlobais.prioridade && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Prioridade: {filtrosGlobais.prioridade}
                  </span>
                )}
                {filtrosGlobais.sexo && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Sexo: {filtrosGlobais.sexo}
                  </span>
                )}
                {filtrosGlobais.turno && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Turno: {filtrosGlobais.turno}
                  </span>
                )}
                {filtrosGlobais.dataInicio && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    De: {filtrosGlobais.dataInicio}
                  </span>
                )}
                {filtrosGlobais.dataFim && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Até: {filtrosGlobais.dataFim}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção de Matrículas */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Matrículas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatorios.filter(r => r.categoria === "matriculas").map((relatorio) => (
              <Card key={relatorio.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <relatorio.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{relatorio.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{relatorio.description}</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => abrirPreview(relatorio.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Seção de Fila */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Fila de Espera</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatorios.filter(r => r.categoria === "fila").map((relatorio) => (
              <Card key={relatorio.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <relatorio.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{relatorio.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{relatorio.description}</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => abrirPreview(relatorio.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Seção Geral */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Geral</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatorios.filter(r => r.categoria === "geral").map((relatorio) => (
              <Card key={relatorio.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <relatorio.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{relatorio.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{relatorio.description}</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => abrirPreview(relatorio.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <RelatorioPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        titulo={relatorioAtual?.title || "Relatório"}
        htmlContent={previewHtml}
        loading={previewLoading}
        onExportPDF={exportarPDF}
        onExportExcel={exportarExcel}
        exporting={exporting}
      />

      {/* Dialog de Filtros Avançados */}
      <Dialog open={dialogFiltrosAvancados} onOpenChange={setDialogFiltrosAvancados}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
            </DialogTitle>
            <DialogDescription>
              Configure filtros adicionais para os relatórios
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filtro de Turma Base */}
            <div className="space-y-2">
              <Label>Turma Base</Label>
              <Select
                value={filtrosGlobais.turmaBase || "todas"}
                onValueChange={(value) => 
                  setFiltrosGlobais(prev => ({ 
                    ...prev, 
                    turmaBase: value === "todas" ? undefined : value 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as turmas</SelectItem>
                  {turmasBase?.map((turma) => (
                    <SelectItem key={turma.id} value={turma.nome}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filtrosGlobais.status || "todos"}
                onValueChange={(value) => 
                  setFiltrosGlobais(prev => ({ 
                    ...prev, 
                    status: value === "todos" ? undefined : value 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Prioridade */}
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={filtrosGlobais.prioridade || "todas"}
                onValueChange={(value) => 
                  setFiltrosGlobais(prev => ({ 
                    ...prev, 
                    prioridade: value === "todas" ? undefined : value 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as prioridades</SelectItem>
                  {PRIORIDADE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Sexo */}
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select
                value={filtrosGlobais.sexo || "todos"}
                onValueChange={(value) => 
                  setFiltrosGlobais(prev => ({ 
                    ...prev, 
                    sexo: value === "todos" ? undefined : value 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {SEXO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Turno (Período)</Label>
              <Select
                value={filtrosGlobais.turno || "todos"}
                onValueChange={(value) =>
                  setFiltrosGlobais(prev => ({
                    ...prev,
                    turno: value === "todos" ? undefined : value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os turnos" />
                </SelectTrigger>
                <SelectContent>
                  {TURNO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={limparFiltros}
              >
                Limpar Todos
              </Button>
              <Button onClick={() => setDialogFiltrosAvancados(false)}>
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Relatorios;


