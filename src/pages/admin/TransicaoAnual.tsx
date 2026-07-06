import { useState, useMemo, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, RefreshCw, CheckCircle2, Users, ArrowUp, GraduationCap, Search, Save, Play, X, FileDown, Building2, ArrowRightLeft, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  useCriancasParaTransicao, 
  useTurmasDisponiveisPorCMEI,
  useAplicarTransicao,
  useEstatisticasTransicao,
  usePlanejamentoTransicao,
  useSalvarPlanejamento,
  useLimparPlanejamento,
  type PlanejamentoTransicao 
} from "@/hooks/api/transicao-hooks";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import { gerarRelatorioTransicaoPDF } from "@/utils/pdf-utils";
import { toast } from "sonner";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const TransicaoAnual = () => {
  const [anoAtual] = useState(new Date().getFullYear());
  const [anoProximo] = useState(new Date().getFullYear() + 1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroAcao, setFiltroAcao] = useState<string>("all");
  const [filtroCMEI, setFiltroCMEI] = useState<string>("all");
  const [filtroTurma, setFiltroTurma] = useState<string>("all");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [planejamento, setPlanejamento] = useState<Map<string, PlanejamentoTransicao>>(new Map());
  const [confirmarDialog, setConfirmarDialog] = useState(false);
  
  const { data: criancas, isLoading: loadingCriancas } = useCriancasParaTransicao(anoProximo);
  const { data: turmas } = useTurmasDisponiveisPorCMEI();
  const { data: cmeis } = useCMEIs();
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);
  const { data: estatisticas } = useEstatisticasTransicao(anoProximo);
  const { data: planejamentoSalvo, isLoading: loadingPlanejamento } = usePlanejamentoTransicao(anoProximo);
  const aplicarTransicao = useAplicarTransicao();
  const salvarPlanejamentoMutation = useSalvarPlanejamento();
  const limparPlanejamentoMutation = useLimparPlanejamento();

  // Carregar planejamento do banco de dados
  useEffect(() => {
    if (planejamentoSalvo && planejamentoSalvo.size > 0) {
      setPlanejamento(new Map(planejamentoSalvo));
    }
  }, [planejamentoSalvo]);

  // Salvar planejamento no banco
  const salvarPlanejamento = () => {
    const planejamentos = Array.from(planejamento.values());
    salvarPlanejamentoMutation.mutate({ planejamentos, anoReferencia: anoProximo });
  };

  // Limpar planejamento
  const limparPlanejamento = () => {
    setPlanejamento(new Map());
    limparPlanejamentoMutation.mutate(anoProximo);
  };

  // Turmas filtradas pela unidade selecionada
  const turmasFiltradas = useMemo(() => {
    if (!turmas) return [];
    if (filtroCMEI === "all") return turmas;
    return turmas.filter(t => t.cmei_id === filtroCMEI);
  }, [turmas, filtroCMEI]);

  // Filtrar crianças
  const criancasFiltradas = useMemo(() => {
    if (!criancas) return [];
    
    return criancas.filter((c) => {
      const matchSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAcao = filtroAcao === "all" || c.acao_sugerida === filtroAcao;
      const matchCMEI = filtroCMEI === "all" || c.cmei_atual_id === filtroCMEI;
      const matchTurma = filtroTurma === "all" || c.turma_atual_id === filtroTurma;
      return matchSearch && matchAcao && matchCMEI && matchTurma;
    });
  }, [criancas, searchTerm, filtroAcao, filtroCMEI, filtroTurma]);

  // Resumo por unidade
  const resumoPorCMEI = useMemo(() => {
    if (!criancas || !cmeis) return [];
    
    return cmeis.map((cmei) => {
      const criancasDoCMEI = criancas.filter(c => c.cmei_atual_id === cmei.id);
      const planejamentosDoCMEI = criancasDoCMEI.map(c => planejamento.get(c.id)).filter(Boolean);
      
      return {
        id: cmei.id,
        nome: cmei.nome,
        total: criancasDoCMEI.length,
        promover: criancasDoCMEI.filter(c => c.acao_sugerida === 'promover').length,
        concluir: criancasDoCMEI.filter(c => c.acao_sugerida === 'concluir').length,
        manter: criancasDoCMEI.filter(c => c.acao_sugerida === 'manter').length,
        planejados: planejamentosDoCMEI.length,
        planejadosPromover: planejamentosDoCMEI.filter(p => p?.acao === 'promover').length,
        planejadosConcluir: planejamentosDoCMEI.filter(p => p?.acao === 'concluir').length,
        planejadosDesistente: planejamentosDoCMEI.filter(p => p?.acao === 'desistente').length,
      };
    }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  }, [criancas, cmeis, planejamento]);

  // Atualizar planejamento individual
  const atualizarPlanejamento = (criancaId: string, acao: PlanejamentoTransicao['acao'], turmaId?: string) => {
    const crianca = criancas?.find(c => c.id === criancaId);
    if (!crianca) return;

    const novoPlanejamento = new Map(planejamento);
    novoPlanejamento.set(criancaId, {
      crianca_id: criancaId,
      acao,
      turma_destino_id: turmaId,
      cmei_destino_id: crianca.cmei_atual_id || undefined,
    });
    setPlanejamento(novoPlanejamento);
  };

  // Aplicar ação em massa aos selecionados
  const aplicarEmMassa = (acao: PlanejamentoTransicao['acao']) => {
    const novoPlanejamento = new Map(planejamento);
    
    selecionados.forEach((id) => {
      const crianca = criancas?.find(c => c.id === id);
      if (crianca) {
        // Encontrar turma sugerida
        let turmaId: string | undefined;
        if (acao === 'promover' && crianca.turma_sugerida) {
          const turmaDestino = turmas?.find(
            t => t.turma_base === crianca.turma_sugerida && t.cmei_id === crianca.cmei_atual_id
          );
          turmaId = turmaDestino?.id;
        }

        novoPlanejamento.set(id, {
          crianca_id: id,
          acao,
          turma_destino_id: turmaId,
          cmei_destino_id: crianca.cmei_atual_id || undefined,
        });
      }
    });
    
    setPlanejamento(novoPlanejamento);
    setSelecionados(new Set());
    toast.success(`Ação aplicada a ${selecionados.size} crianças`);
  };

  // Toggle seleção
  const toggleSelecionado = (id: string) => {
    const novos = new Set(selecionados);
    if (novos.has(id)) {
      novos.delete(id);
    } else {
      novos.add(id);
    }
    setSelecionados(novos);
  };

  // Selecionar todos filtrados
  const selecionarTodos = () => {
    if (selecionados.size === criancasFiltradas.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(criancasFiltradas.map(c => c.id)));
    }
  };

  // Aplicar transição
  const handleAplicarTransicao = async () => {
    const planejamentos = Array.from(planejamento.values());
    
    if (planejamentos.length === 0) {
      toast.error("Nenhuma alteração planejada");
      return;
    }

    await aplicarTransicao.mutateAsync({ planejamentos, anoReferencia: anoProximo });
    setPlanejamento(new Map());
    setConfirmarDialog(false);
  };

  // Exportar relatório PDF
  const handleExportarPDF = async () => {
    if (!criancas || criancas.length === 0) {
      toast.error("Nenhuma criança para exportar");
      return;
    }

    toast.loading("Gerando relatório PDF...");
    
    try {
      const criancasRelatorio = criancas.map((c) => ({
        nome: c.nome,
        idade_meses: c.idade_meses,
        turma_atual: c.turma_atual?.nome || '-',
        cmei_atual: c.cmei_atual?.nome || '-',
        turma_sugerida: c.turma_sugerida,
        acao_sugerida: c.acao_sugerida,
        acao_planejada: planejamento.get(c.id)?.acao,
      }));

      const planejamentos = Array.from(planejamento.values());
      
      await gerarRelatorioTransicaoPDF({
        anoAtual,
        anoProximo,
        totalMatriculados: estatisticas?.total || criancas.length,
        totalPlanejados: planejamento.size,
        resumo: {
          promover: planejamentos.filter(p => p.acao === 'promover').length || estatisticas?.promover || 0,
          concluir: planejamentos.filter(p => p.acao === 'concluir').length || estatisticas?.concluir || 0,
          manter: planejamentos.filter(p => p.acao === 'manter').length || estatisticas?.manter || 0,
          desistente: planejamentos.filter(p => p.acao === 'desistente').length,
        },
        criancas: criancasRelatorio,
        dataGeracao: new Date().toLocaleString('pt-BR'),
      });

      toast.dismiss();
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao gerar relatório PDF");
      console.error(error);
    }
  };

  // Obter badge de ação
  const getAcaoBadge = (acao: string) => {
    switch (acao) {
      case 'promover':
        return <Badge className="bg-blue-500"><ArrowUp className="h-3 w-3 mr-1" />Promover</Badge>;
      case 'concluir':
        return <Badge className="bg-green-500"><GraduationCap className="h-3 w-3 mr-1" />Concluir</Badge>;
      case 'manter':
        return <Badge variant="secondary">Manter</Badge>;
      case 'desistente':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Desistente</Badge>;
      case 'transferir':
        return <Badge className="bg-orange-500"><LogOut className="h-3 w-3 mr-1" />Transferir</Badge>;
      case 'remanejar':
        return <Badge className="bg-purple-500"><ArrowRightLeft className="h-3 w-3 mr-1" />Remanejar</Badge>;
      default:
        return <Badge variant="outline">{acao}</Badge>;
    }
  };

  // Calcular idade formatada
  const formatarIdade = (meses: number) => {
    const anos = Math.floor(meses / 12);
    const mesesRest = meses % 12;
    if (anos === 0) return `${meses}m`;
    if (mesesRest === 0) return `${anos}a`;
    return `${anos}a ${mesesRest}m`;
  };

  const totalGeral = estatisticas?.total || 0;
  const progresso = totalGeral > 0 ? Math.round((planejamento.size / totalGeral) * 100) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transição Anual</h1>
                <p className="text-sm text-muted-foreground">
                  Planeje e execute a passagem de ano letivo das crianças matriculadas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-background/60 px-4 py-2 backdrop-blur">
              <span className="text-lg font-bold text-muted-foreground">{anoAtual}</span>
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold text-primary">{anoProximo}</span>
            </div>
          </div>
        </div>

        {/* Alert de Aviso */}
        <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 !text-amber-500" />
          <AlertTitle>Processo crítico</AlertTitle>
          <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
            A transição afeta todas as crianças matriculadas. Seu planejamento fica salvo e só é
            aplicado ao banco de dados quando você confirmar.
          </AlertDescription>
        </Alert>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-l-4 border-l-muted-foreground/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Matriculados</CardTitle>
              <div className="rounded-md bg-muted p-1.5"><Users className="h-4 w-4 text-muted-foreground" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estatisticas?.total || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">A Promover</CardTitle>
              <div className="rounded-md bg-blue-500/10 p-1.5"><ArrowUp className="h-4 w-4 text-blue-500" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{estatisticas?.promover || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Concluintes</CardTitle>
              <div className="rounded-md bg-green-500/10 p-1.5"><GraduationCap className="h-4 w-4 text-green-500" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{estatisticas?.concluir || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Planejados</CardTitle>
              <div className="rounded-md bg-primary/10 p-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{planejamento.size}</div>
            </CardContent>
          </Card>
        </div>

        {/* Progresso */}
        {estatisticas && estatisticas.total > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Progresso do Planejamento</span>
                <span className="text-sm font-semibold text-primary">{progresso}%</span>
              </div>
              <Progress value={progresso} className="h-2.5" />
              <p className="mt-2 text-xs text-muted-foreground">
                {planejamento.size} de {totalGeral} crianças planejadas
              </p>
            </CardContent>
          </Card>
        )}

        {/* Resumo por unidade */}
        {resumoPorCMEI.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Resumo por {singular}</CardTitle>
                  <CardDescription>Impacto da transição em cada unidade</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resumoPorCMEI.map((cmei) => (
                  <div 
                    key={cmei.id} 
                    className={`p-4 rounded-lg border transition-colors cursor-pointer hover:border-primary/50 ${filtroCMEI === cmei.id ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => setFiltroCMEI(filtroCMEI === cmei.id ? 'all' : cmei.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm truncate" title={cmei.nome}>{cmei.nome}</h4>
                      <Badge variant="secondary" className="text-xs">{cmei.total}</Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Sugestão:</span>
                        <div className="flex gap-2">
                          <span className="text-blue-600" title="Promover">{cmei.promover} ↑</span>
                          <span className="text-green-600" title="Concluir">{cmei.concluir} 🎓</span>
                          <span className="text-muted-foreground" title="Manter">{cmei.manter} =</span>
                        </div>
                      </div>
                      {cmei.planejados > 0 && (
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span className="text-muted-foreground">Planejados:</span>
                          <div className="flex gap-2">
                            {cmei.planejadosPromover > 0 && <span className="text-blue-600">{cmei.planejadosPromover} ↑</span>}
                            {cmei.planejadosConcluir > 0 && <span className="text-green-600">{cmei.planejadosConcluir} 🎓</span>}
                            {cmei.planejadosDesistente > 0 && <span className="text-destructive">{cmei.planejadosDesistente} ✕</span>}
                          </div>
                        </div>
                      )}
                      <Progress 
                        value={(cmei.planejados / cmei.total) * 100} 
                        className="h-1 mt-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
          <Button variant="outline" size="sm" onClick={salvarPlanejamento} disabled={salvarPlanejamentoMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={limparPlanejamento} disabled={planejamento.size === 0}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportarPDF} disabled={!criancas || criancas.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <div className="ml-auto">
            <Button
              onClick={() => setConfirmarDialog(true)}
              disabled={planejamento.size === 0 || aplicarTransicao.isPending}
            >
              {aplicarTransicao.isPending ? (
                <Spinner className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Aplicar Transição ({planejamento.size})
            </Button>
          </div>
        </div>

        {/* Tabela de Crianças */}
        <Card>
          <CardHeader>
            <CardTitle>Crianças para Transição</CardTitle>
            <CardDescription>
              Selecione as crianças e defina a ação para cada uma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select 
                value={filtroCMEI} 
                onValueChange={(value) => {
                  setFiltroCMEI(value);
                  setFiltroTurma("all"); // Reset turma ao trocar unidade
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={`Filtrar por ${singular}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{plural} (todas)</SelectItem>
                  {cmeis?.map((cmei) => (
                    <SelectItem key={cmei.id} value={cmei.id}>
                      {cmei.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={filtroTurma} 
                onValueChange={setFiltroTurma}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {turmasFiltradas?.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroAcao} onValueChange={setFiltroAcao}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="promover">A Promover</SelectItem>
                  <SelectItem value="concluir">Concluintes</SelectItem>
                  <SelectItem value="manter">Manter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ações em massa */}
            {selecionados.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selecionados.size} selecionados</span>
                <Button size="sm" variant="outline" onClick={() => aplicarEmMassa('promover')}>
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Promover
                </Button>
                <Button size="sm" variant="outline" onClick={() => aplicarEmMassa('manter')}>
                  Manter
                </Button>
                <Button size="sm" variant="outline" onClick={() => aplicarEmMassa('concluir')}>
                  <GraduationCap className="h-3 w-3 mr-1" />
                  Concluir
                </Button>
                <Select
                  onValueChange={(turmaId) => {
                    const turmaEscolhida = turmas?.find(t => t.id === turmaId);
                    const novoPlanejamento = new Map(planejamento);
                    selecionados.forEach((id) => {
                      const crianca = criancas?.find(c => c.id === id);
                      if (crianca) {
                        novoPlanejamento.set(id, {
                          crianca_id: id,
                          acao: 'remanejar',
                          turma_destino_id: turmaId,
                          cmei_destino_id: turmaEscolhida?.cmei_id || undefined,
                        });
                      }
                    });
                    setPlanejamento(novoPlanejamento);
                    setSelecionados(new Set());
                    toast.success(`Remanejamento aplicado a ${selecionados.size} crianças`);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                    <span>Remanejar para...</span>
                  </SelectTrigger>
                  <SelectContent>
                    {turmas?.map((turma) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {(turma as any).cmei?.nome} - {turma.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  onValueChange={(turmaId) => {
                    const turmaEscolhida = turmas?.find(t => t.id === turmaId);
                    const novoPlanejamento = new Map(planejamento);
                    selecionados.forEach((id) => {
                      const crianca = criancas?.find(c => c.id === id);
                      if (crianca) {
                        novoPlanejamento.set(id, {
                          crianca_id: id,
                          acao: 'transferir',
                          turma_destino_id: turmaId,
                          cmei_destino_id: turmaEscolhida?.cmei_id || undefined,
                        });
                      }
                    });
                    setPlanejamento(novoPlanejamento);
                    setSelecionados(new Set());
                    toast.success(`Transferência aplicada a ${selecionados.size} crianças`);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <LogOut className="h-3 w-3 mr-1" />
                    <span>Transferir para...</span>
                  </SelectTrigger>
                  <SelectContent>
                    {turmas?.map((turma) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {(turma as any).cmei?.nome} - {turma.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="destructive" onClick={() => aplicarEmMassa('desistente')}>
                  <X className="h-3 w-3 mr-1" />
                  Desistente
                </Button>
              </div>
            )}

            {loadingCriancas ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selecionados.size === criancasFiltradas.length && criancasFiltradas.length > 0}
                          onCheckedChange={selecionarTodos}
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Idade (corte)</TableHead>
                      <TableHead>Turma Atual</TableHead>
                      <TableHead>Turma Sugerida</TableHead>
                      <TableHead>Ação Sugerida</TableHead>
                      <TableHead>Ação Planejada</TableHead>
                      <TableHead>Turma Destino</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criancasFiltradas.map((crianca) => {
                      const plan = planejamento.get(crianca.id);
                      const turmasDosCMEI = turmas?.filter(t => t.cmei_id === crianca.cmei_atual_id) || [];
                      const todasTurmas = turmas || [];
                      
                      // Encontrar nome da turma destino
                      const turmaDestino = plan?.turma_destino_id 
                        ? turmas?.find(t => t.id === plan.turma_destino_id) 
                        : null;
                      
                      // Para remanejamento, mostrar turmas de outras unidades
                      const turmasParaRemanejar = todasTurmas.filter(t => t.cmei_id !== crianca.cmei_atual_id);
                      
                      return (
                        <TableRow key={crianca.id} className={plan ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selecionados.has(crianca.id)}
                              onCheckedChange={() => toggleSelecionado(crianca.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{crianca.nome}</TableCell>
                          <TableCell>{formatarIdade(crianca.idade_meses)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {crianca.turma_atual?.nome || '-'}
                              <span className="text-muted-foreground block text-xs">
                                {crianca.cmei_atual?.nome}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{crianca.turma_sugerida}</Badge>
                          </TableCell>
                          <TableCell>{getAcaoBadge(crianca.acao_sugerida)}</TableCell>
                          <TableCell>
                            {plan ? getAcaoBadge(plan.acao) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {/* Seletor de turma destino para promoção */}
                            {plan?.acao === 'promover' && (
                              <Select
                                value={plan?.turma_destino_id || ""}
                                onValueChange={(turmaId) => {
                                  const novoPlanejamento = new Map(planejamento);
                                  novoPlanejamento.set(crianca.id, {
                                    ...plan,
                                    turma_destino_id: turmaId,
                                  });
                                  setPlanejamento(novoPlanejamento);
                                }}
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue placeholder="Selecionar turma" />
                                </SelectTrigger>
                                <SelectContent>
                                  {turmasDosCMEI.map((turma) => (
                                    <SelectItem key={turma.id} value={turma.id}>
                                      {turma.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {/* Seletor de turma/unidade para remanejamento */}
                            {plan?.acao === 'remanejar' && (
                              <Select
                                value={plan?.turma_destino_id || ""}
                                onValueChange={(turmaId) => {
                                  const turmaEscolhida = turmas?.find(t => t.id === turmaId);
                                  const novoPlanejamento = new Map(planejamento);
                                  novoPlanejamento.set(crianca.id, {
                                    ...plan,
                                    turma_destino_id: turmaId,
                                    cmei_destino_id: turmaEscolhida?.cmei_id || undefined,
                                  });
                                  setPlanejamento(novoPlanejamento);
                                }}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder={`Selecionar ${singular}/Turma`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {turmasParaRemanejar.map((turma) => (
                                    <SelectItem key={turma.id} value={turma.id}>
                                      {(turma as any).cmei?.nome} - {turma.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {/* Seletor de turma/unidade para transferência */}
                            {plan?.acao === 'transferir' && (
                              <Select
                                value={plan?.turma_destino_id || ""}
                                onValueChange={(turmaId) => {
                                  const turmaEscolhida = turmas?.find(t => t.id === turmaId);
                                  const novoPlanejamento = new Map(planejamento);
                                  novoPlanejamento.set(crianca.id, {
                                    ...plan,
                                    turma_destino_id: turmaId,
                                    cmei_destino_id: turmaEscolhida?.cmei_id || undefined,
                                  });
                                  setPlanejamento(novoPlanejamento);
                                }}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder={`Selecionar ${singular}/Turma`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {todasTurmas.map((turma) => (
                                    <SelectItem key={turma.id} value={turma.id}>
                                      {(turma as any).cmei?.nome} - {turma.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {/* Mostrar turma destino selecionada para outras ações */}
                            {plan && !['promover', 'remanejar', 'transferir'].includes(plan.acao) && (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                            {!plan && <span className="text-muted-foreground text-sm">-</span>}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={plan?.acao || ""}
                              onValueChange={(value) => {
                                if (value === 'promover') {
                                  // Encontrar turma sugerida
                                  const turmaDestino = turmasDosCMEI.find(
                                    t => t.turma_base === crianca.turma_sugerida
                                  );
                                  atualizarPlanejamento(crianca.id, value as any, turmaDestino?.id);
                                } else if (value === 'remanejar') {
                                  // Remanejar não define turma automaticamente
                                  atualizarPlanejamento(crianca.id, value as any);
                                } else {
                                  atualizarPlanejamento(crianca.id, value as any);
                                }
                              }}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Selecionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="promover">Promover</SelectItem>
                                <SelectItem value="manter">Manter</SelectItem>
                                <SelectItem value="concluir">Concluir</SelectItem>
                                <SelectItem value="remanejar">Remanejar</SelectItem>
                                <SelectItem value="transferir">Transferir</SelectItem>
                                <SelectItem value="desistente">Desistente</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {criancasFiltradas.length === 0 && !loadingCriancas && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma criança encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Confirmação */}
        <AlertDialog open={confirmarDialog} onOpenChange={setConfirmarDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Transição Anual</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a aplicar a transição para <strong>{planejamento.size}</strong> crianças.
                Esta ação não pode ser desfeita facilmente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4 space-y-2 text-sm">
              <p><strong>Resumo das ações:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Promoções: {Array.from(planejamento.values()).filter(p => p.acao === 'promover').length}</li>
                <li>Conclusões: {Array.from(planejamento.values()).filter(p => p.acao === 'concluir').length}</li>
                <li>Manter: {Array.from(planejamento.values()).filter(p => p.acao === 'manter').length}</li>
                <li>Remanejamentos: {Array.from(planejamento.values()).filter(p => p.acao === 'remanejar').length}</li>
                <li>Transferências: {Array.from(planejamento.values()).filter(p => p.acao === 'transferir').length}</li>
                <li>Desistentes: {Array.from(planejamento.values()).filter(p => p.acao === 'desistente').length}</li>
              </ul>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleAplicarTransicao}
                disabled={aplicarTransicao.isPending}
              >
                {aplicarTransicao.isPending ? (
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Confirmar Transição
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default TransicaoAnual;


