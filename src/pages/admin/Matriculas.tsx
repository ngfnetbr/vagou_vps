import { useMemo, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { CardGridSkeleton, TableSkeleton } from "@/components/common/skeletons";
import { useDebounce } from "@/hooks/use-debounce";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { useCriancasRealtimeUpdates, useHistoricoRealtimeUpdates } from "@/hooks/use-realtime-updates";
import { fixMojibake } from "@/utils/encoding-fix";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipHelper } from "@/components/ui/tooltip-helper";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, GraduationCap, School, MoreVertical, Eye, RefreshCcw, MapPin, UserX, FileDown, FileText, ArrowRightLeft, History, ChevronDown, RotateCcw, Grid3x3, List, User, Calendar, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Bell } from "lucide-react";
import { useCMEIs, useTurmas } from "@/hooks/api/supabase-hooks";
import { useMatriculas, useHistoricoMatriculas, useMatriculasStats } from "@/hooks/api/matriculas-hooks";
import {
  useSolicitarRemanejamento,
  useEfetivarTransferencia,
  useCancelarRemanejamento,
  useRealocarTurma,
  useDestrancarMatricula,
  useMarcarDesistenteMatricula,
} from "@/hooks/api/admin-hooks";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportarCriancasCSV } from "@/utils/csv-utils";
import { exportarCriancasExcel } from "@/utils/excel-utils";
import { gerarRelatorioMatriculasAtivasListaPDF } from "@/utils/relatorios-utils";
import { toast } from "sonner";
import { RemanejamentoDialog } from "@/components/admin/RemanejamentoDialog";
import { TransferenciaDialog } from "@/components/admin/TransferenciaDialog";
import { RealocacaoDialog } from "@/components/admin/RealocacaoDialog";
import TransferenciaMassaDialog from "@/components/admin/TransferenciaMassaDialog";
import { usePaginatedData } from "@/hooks/api/pagination-hooks";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { RealtimeIndicator } from "@/components/common/RealtimeIndicator";
import { useTurnoInteresseLote } from "@/hooks/api/campos-inscricao-hooks";
import SexoIcon from "@/components/common/SexoIcon";
import { useCanAccess, PERMISSIONS } from "@/components/admin/PermissionGate";
import { cn } from "@/utils/utils";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const Matriculas = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);
  
  // Permission checks
  const canConfirm = useCanAccess(PERMISSIONS.MATRICULAS_CONFIRMAR);
  const canCancel = useCanAccess(PERMISSIONS.MATRICULAS_CANCELAR);
  const canRealocar = useCanAccess(PERMISSIONS.MATRICULAS_REALOCAR);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const { debouncedValue: debouncedSearchTerm, isDebouncing: isSearching } = useDebounce(searchTerm, 300);
  const [cmeiFilter, setCmeiFilter] = useState<string>("all");
  const [turmaFilter, setTurmaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // View & Sort
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [sortBy, setSortBy] = useState<"nome" | "data_nascimento" | "created_at">("nome");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Selection
  const [selectedCriancas, setSelectedCriancas] = useState<string[]>([]);
  const [transferMassaDialogOpen, setTransferMassaDialogOpen] = useState(false);
  
  // Histórico
  const [historicoExpanded, setHistoricoExpanded] = useState(false);

  // Estados para dialogs
  const [remanejamentoDialog, setRemanejamentoDialog] = useState(false);
  const [transferenciaDialog, setTransferenciaDialog] = useState(false);
  const [realocacaoDialog, setRealocacaoDialog] = useState(false);
  const [desistenteDialog, setDesistenteDialog] = useState(false);
  const [destrancarDialog, setDestrancarDialog] = useState(false);
  const [justificativaDestrancar, setJustificativaDestrancar] = useState("");
  const [criancaSelecionada, setCriancaSelecionada] = useState<any>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());

  // Mutations
  const solicitarRemanejamento = useSolicitarRemanejamento();
  const efetivarTransferencia = useEfetivarTransferencia();
  const cancelarRemanejamento = useCancelarRemanejamento();
  const realocarTurma = useRealocarTurma();
  const destrancarMatricula = useDestrancarMatricula();
  const marcarDesistente = useMarcarDesistenteMatricula();

  // Data hooks
  const { data: matriculas, isLoading, isFetching, refetch } = useMatriculas({
    status: statusFilter !== "all" ? statusFilter : undefined,
    cmei: cmeiFilter !== "all" ? cmeiFilter : undefined,
    turma: turmaFilter !== "all" ? turmaFilter : undefined,
    search: debouncedSearchTerm,
  });

  const { data: stats } = useMatriculasStats();
  const { data: historico } = useHistoricoMatriculas();
  const { data: cmeis } = useCMEIs();
  const { data: turmas } = useTurmas(cmeiFilter !== "all" ? cmeiFilter : undefined);
  const matriculasIds = useMemo(() => (matriculas || []).map((c) => c.id), [matriculas]);
  const { data: turnoInteresse = {} } = useTurnoInteresseLote(matriculasIds);

  // Habilitar atualizações em tempo real
  useCriancasRealtimeUpdates(true);
  useHistoricoRealtimeUpdates(false);

  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: ["matriculas-ativas"] });
    queryClient.invalidateQueries({ queryKey: ["matriculas-stats"] });
    queryClient.invalidateQueries({ queryKey: ["historico-matriculas-encerradas"] });
    await refetch();
    setLastUpdatedAt(Date.now());
  };

  // Ordenação
  const sortedData = [...(matriculas || [])].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "nome") {
      comparison = a.nome.localeCompare(b.nome, "pt-BR");
    } else if (sortBy === "data_nascimento") {
      comparison = new Date(a.data_nascimento).getTime() - new Date(b.data_nascimento).getTime();
    } else if (sortBy === "created_at") {
      comparison = new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Pagination
  const pagination = usePaginatedData(sortedData, 25);

  const toggleSort = (field: "nome" | "data_nascimento" | "created_at") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: "nome" | "data_nascimento" | "created_at") => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const meses = differenceInMonths(hoje, nascimento);
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;

    if (anos === 0) {
      return `${meses} mês(es)`;
    } else if (anos === 1) {
      return `1 ano${mesesRestantes > 0 ? `, ${mesesRestantes}m` : ""}`;
    } else {
      return `${anos} anos${mesesRestantes > 0 ? `, ${mesesRestantes}m` : ""}`;
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && matriculas) {
      const matriculadasIds = matriculas
        .filter(c => c.status === "Matriculado" || c.status === "Matriculada")
        .map(c => c.id);
      setSelectedCriancas(matriculadasIds);
    } else {
      setSelectedCriancas([]);
    }
  };

  const handleSelectCrianca = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCriancas(prev => [...prev, id]);
    } else {
      setSelectedCriancas(prev => prev.filter(cid => cid !== id));
    }
  };

  const criancasMatriculadas = matriculas?.filter(c => c.status === "Matriculado" || c.status === "Matriculada") || [];
  const allMatriculadasSelected = criancasMatriculadas.length > 0 && 
    criancasMatriculadas.every(c => selectedCriancas.includes(c.id));

  const handleExportar = async (formato: "csv" | "xlsx" | "pdf") => {
    try {
      if (!matriculas || matriculas.length === 0) {
        toast.error("Não há matrículas para exportar");
        return;
      }
      if (formato === "csv") {
        await exportarCriancasCSV(matriculas, singular);
      } else if (formato === "xlsx") {
        await exportarCriancasExcel(matriculas, singular);
      } else {
        await gerarRelatorioMatriculasAtivasListaPDF(matriculas);
      }
      toast.success("Exportação concluída!");
    } catch (error) {
      toast.error("Erro ao exportar lista");
      console.error(error);
    }
  };

  // Action handlers
  const handleSolicitarRemanejamento = (crianca: any) => {
    setCriancaSelecionada(crianca);
    setRemanejamentoDialog(true);
  };

  const handleConfirmarRemanejamento = async (cmeiDestinoId: string, justificativa: string) => {
    if (!criancaSelecionada) return;
    
    await solicitarRemanejamento.mutateAsync({
      criancaId: criancaSelecionada.id,
      cmeiDestinoId,
      justificativa,
    });
    
    setRemanejamentoDialog(false);
    setCriancaSelecionada(null);
  };

  const handleTransferir = (crianca: any) => {
    setCriancaSelecionada(crianca);
    setTransferenciaDialog(true);
  };

  const handleConfirmarTransferencia = async () => {
    if (!criancaSelecionada) return;
    
    await efetivarTransferencia.mutateAsync(criancaSelecionada.id);
    
    setTransferenciaDialog(false);
    setCriancaSelecionada(null);
  };

  const handleCancelarRemanejamento = async (criancaId: string) => {
    await cancelarRemanejamento.mutateAsync(criancaId);
  };

  const handleRealocar = (crianca: any) => {
    setCriancaSelecionada(crianca);
    setRealocacaoDialog(true);
  };

  const handleConfirmarRealocacao = async (turmaNova: string, motivo: string) => {
    if (!criancaSelecionada) return;
    
    await realocarTurma.mutateAsync({
      criancaId: criancaSelecionada.id,
      turmaNova,
      motivo,
    });
    
    setRealocacaoDialog(false);
    setCriancaSelecionada(null);
  };


  const handleDestrancar = (crianca: any) => {
    setCriancaSelecionada(crianca);
    setDestrancarDialog(true);
  };

  const handleConfirmarDestrancar = async () => {
    if (!criancaSelecionada) return;
    
    await destrancarMatricula.mutateAsync({
      criancaId: criancaSelecionada.id,
      justificativa: justificativaDestrancar,
    });
    
    setDestrancarDialog(false);
    setJustificativaDestrancar("");
    setCriancaSelecionada(null);
  };

  const handleDesistente = (crianca: any) => {
    setCriancaSelecionada(crianca);
    setDesistenteDialog(true);
  };

  const handleConfirmarDesistente = async (justificativa: string) => {
    if (!criancaSelecionada) return;
    
    await marcarDesistente.mutateAsync({
      criancaId: criancaSelecionada.id,
      justificativa,
    });
    
    setDesistenteDialog(false);
    setCriancaSelecionada(null);
  };

  const getStatusBadge = (status: string, crianca?: any) => {
    // Se tem remanejamento solicitado (cmei_remanejamento_id preenchido), mostrar isso
    if (crianca?.cmei_remanejamento_id) {
      return (
        <TooltipHelper content={`Remanejamento solicitado para: ${crianca.cmei_remanejamento?.nome || `outra ${singular}`}`}>
          <Badge className="bg-purple-500 hover:bg-purple-600">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Remanej. Solicitado
          </Badge>
        </TooltipHelper>
      );
    }
    
    switch (status) {
      case "Matriculado":
      case "Matriculada":
        return <Badge className="bg-green-500 hover:bg-green-600">Matriculado</Badge>;
      case "Convocado":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Convocado</Badge>;
      case "Remanejamento Solicitado":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Remanejamento</Badge>;
      case "Matrícula Trancada":
        return <Badge variant="outline" className="text-blue-600 border-blue-400">Trancada</Badge>;
      case "Transferido":
        return <Badge variant="outline" className="text-gray-600 border-gray-400">Transferido</Badge>;
      case "Desistente":
        return <Badge variant="destructive">Desistente</Badge>;
      case "Recusada":
        return <Badge variant="destructive">Recusada</Badge>;
      case "Concluinte":
        return <Badge className="bg-purple-500 hover:bg-purple-600">Concluinte</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHistoricoAcaoBadge = (acao: string) => {
    const normalized = fixMojibake(acao) ?? acao;
    if (normalized === "Matrícula Confirmada") {
      return <Badge className="bg-green-600 hover:bg-green-700">Matrícula Confirmada</Badge>;
    }
    if (normalized.includes("Transição Anual - Promoção")) {
      return <Badge className="bg-purple-600 hover:bg-purple-700">Promoção</Badge>;
    }
    if (normalized.includes("Transição Anual - Conclusão") || normalized === "Concluinte") {
      return <Badge className="bg-blue-600 hover:bg-blue-700">Conclusão</Badge>;
    }
    if (normalized.includes("Transferência") || normalized === "Transferido") {
      return <Badge variant="secondary">Transferência</Badge>;
    }
    if (normalized.includes("Trancada")) {
      return <Badge variant="outline">Trancada</Badge>;
    }
    if (normalized.includes("Destrancada")) {
      return <Badge className="bg-green-500">Destrancada</Badge>;
    }
    if (normalized.includes("Remanejamento")) {
      return <Badge className="bg-amber-500">Remanejamento</Badge>;
    }
    if (normalized.includes("Realocação")) {
      return <Badge variant="secondary">Realocação</Badge>;
    }
    if (normalized.includes("Desistência") || normalized === "Desistente" || normalized.includes("Recusada") || normalized.includes("Recusa") || normalized === "Fim de Fila") {
      return <Badge variant="destructive">{normalized}</Badge>;
    }
    return <Badge variant="outline">{normalized}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold">Matrículas</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gerenciamento completo de matrículas ativas
              </p>
            </div>
            <RealtimeIndicator />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap self-center">
              Atualizado às {format(new Date(lastUpdatedAt), "HH:mm", { locale: ptBR })}
            </span>
            <TooltipHelper content="Atualizar lista de matrículas">
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={isFetching}
                aria-label="Atualizar lista"
                className="shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
              </Button>
            </TooltipHelper>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Exportar matrículas"
                  className="flex-1 sm:flex-initial"
                >
                  <FileDown className="h-4 w-4 mr-2" aria-hidden="true" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportar("csv")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportar("xlsx")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExportar("pdf")}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Matriculadas</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMatriculados || 0}</div>
              <p className="text-xs text-muted-foreground">Matrículas efetivadas (ativas).</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convocados</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalConvocados || 0}</div>
              <p className="text-xs text-muted-foreground">Convocações pendentes de confirmação.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remanejamentos</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRemanejamentos || 0}</div>
              <p className="text-xs text-muted-foreground">Solicitações de remanejamento em andamento.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{plural} Ativas</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cmeis?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Unidades com cadastro ativo.</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Listagem de Matrículas</CardTitle>
                <CardDescription>
                  Matriculados, convocados e solicitações de remanejamento
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <TooltipHelper content="Exibe em formato de cards">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    aria-label="Visualizar como grade"
                    aria-pressed={viewMode === "grid"}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </TooltipHelper>
                <TooltipHelper content="Exibe em formato de tabela">
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    aria-label="Visualizar como tabela"
                    aria-pressed={viewMode === "table"}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipHelper>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selection Action Bar */}
            {selectedCriancas.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{selectedCriancas.length} selecionada(s)</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCriancas([])}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar seleção
                  </Button>
                </div>
                <TooltipHelper content={`Transfere múltiplas crianças matriculadas para outra ${singular}`}>
                  <Button
                    size="sm"
                    onClick={() => setTransferMassaDialogOpen(true)}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Transferir em Massa
                  </Button>
                </TooltipHelper>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                {isSearching ? (
                  <Spinner className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder="Buscar por nome da criança ou responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "nome" | "data_nascimento" | "created_at")}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                  <SelectItem value="data_nascimento">Data de Nascimento</SelectItem>
                  <SelectItem value="created_at">Data de Cadastro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Matriculado">Matriculado</SelectItem>
                  <SelectItem value="Convocado">Convocado</SelectItem>
                  <SelectItem value="Remanejamento Solicitado">Remanejamento</SelectItem>
                </SelectContent>
              </Select>

              <Select value={cmeiFilter} onValueChange={setCmeiFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={`${plural} (todas)`} />
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

              <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {turmas?.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchTerm || cmeiFilter !== "all" || turmaFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setCmeiFilter("all");
                    setTurmaFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Content */}
            {isLoading ? (
              viewMode === "grid" ? (
                <CardGridSkeleton count={6} />
              ) : (
                <TableSkeleton rows={8} columns={6} />
              )
            ) : !sortedData || sortedData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma matrícula encontrada com os filtros aplicados.
              </div>
            ) : viewMode === "grid" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pagination.data.map((crianca) => (
                    <Card key={crianca.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && (
                              <Checkbox
                                checked={selectedCriancas.includes(crianca.id)}
                                onCheckedChange={(checked) => handleSelectCrianca(crianca.id, checked as boolean)}
                              />
                            )}
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{crianca.nome}</CardTitle>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" />
                                {calcularIdade(crianca.data_nascimento)}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full border-border/60 text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md data-[state=open]:bg-primary data-[state=open]:text-primary-foreground data-[state=open]:border-primary"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Ações</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60 [&_[role=menuitem]]:transition-all [&_[role=menuitem]]:duration-200 [&_[role=menuitem]]:cursor-pointer [&_[role=menuitem]:hover]:translate-x-1 [&_[role=menuitem]_svg]:transition-transform [&_[role=menuitem]:hover_svg]:scale-110">
                              <DropdownMenuLabel className="flex flex-col gap-0.5">
                                <span className="text-xs font-normal text-muted-foreground">Ações</span>
                                <span className="truncate text-sm font-semibold">{crianca.nome}</span>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/modulo/vagou/admin/criancas/${crianca.id}`)}>
                                <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                                Ver detalhes
                              </DropdownMenuItem>
                              {renderActionMenuItems(crianca)}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(crianca.status, crianca)}
                          {crianca.programas_sociais && (
                            <Badge variant="outline" className="text-amber-600 border-amber-400">Social</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p><strong>Responsável:</strong> {crianca.responsavel_nome}</p>
                          <p>
                            <strong>Data Nasc.:</strong>{" "}
                            {crianca.data_nascimento
                              ? format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </p>
                          <p><strong>Sexo:</strong> {crianca.sexo || "-"}</p>
                          <p>
                            <strong>Período:</strong>{" "}
                            {crianca.turma_atual?.turno || turnoInteresse[crianca.id] || "-"}
                          </p>
                          {crianca.cmei_atual?.nome && (
                            <p><strong>{singular}:</strong> {crianca.cmei_atual.nome}</p>
                          )}
                          {crianca.turma_atual?.nome && (
                            <p><strong>Turma:</strong> {crianca.turma_atual.nome}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <PaginationControls
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  pageSize={pagination.pageSize}
                  totalItems={pagination.totalItems}
                  onPageChange={pagination.goToPage}
                  onPageSizeChange={pagination.setPageSize}
                  hasNextPage={pagination.hasNextPage}
                  hasPreviousPage={pagination.hasPreviousPage}
                />
              </>
            ) : (
              <>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allMatriculadasSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Selecionar todas matriculadas"
                          />
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => toggleSort("nome")} className="h-auto p-0 font-semibold">
                            Criança {getSortIcon("nome")}
                          </Button>
                        </TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Data Nasc.</TableHead>
                        <TableHead className="w-[56px] text-center">Sexo</TableHead>
                        <TableHead>{singular}</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.data.map((crianca) => (
                        <TableRow key={crianca.id}>
                          <TableCell>
                            {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && (
                              <Checkbox
                                checked={selectedCriancas.includes(crianca.id)}
                                onCheckedChange={(checked) => handleSelectCrianca(crianca.id, checked as boolean)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{crianca.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {calcularIdade(crianca.data_nascimento)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{crianca.responsavel_nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {crianca.responsavel_cpf}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {crianca.data_nascimento
                                ? format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <SexoIcon sexo={crianca.sexo} />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{crianca.cmei_atual?.nome || "-"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{crianca.turma_atual?.nome || "-"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {crianca.turma_atual?.turno || turnoInteresse[crianca.id] || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(crianca.status, crianca)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-full border-border/60 text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md data-[state=open]:bg-primary data-[state=open]:text-primary-foreground data-[state=open]:border-primary"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Ações</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-60 [&_[role=menuitem]]:transition-all [&_[role=menuitem]]:duration-200 [&_[role=menuitem]]:cursor-pointer [&_[role=menuitem]:hover]:translate-x-1 [&_[role=menuitem]_svg]:transition-transform [&_[role=menuitem]:hover_svg]:scale-110">
                                <DropdownMenuLabel className="flex flex-col gap-0.5">
                                  <span className="text-xs font-normal text-muted-foreground">Ações</span>
                                  <span className="truncate text-sm font-semibold">{crianca.nome}</span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/modulo/vagou/admin/criancas/${crianca.id}`)}>
                                  <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                {renderActionMenuItems(crianca)}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  pageSize={pagination.pageSize}
                  totalItems={pagination.totalItems}
                  onPageChange={pagination.goToPage}
                  onPageSizeChange={pagination.setPageSize}
                  hasNextPage={pagination.hasNextPage}
                  hasPreviousPage={pagination.hasPreviousPage}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Matrículas */}
        <Collapsible open={historicoExpanded} onOpenChange={setHistoricoExpanded}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    <CardTitle>Histórico de Matrículas ({historico?.length || 0})</CardTitle>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${historicoExpanded ? "rotate-180" : ""}`} />
                </div>
                <CardDescription>
                  Crianças que estavam matriculadas e encerraram (desistência, transferência, conclusão)
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {historico && historico.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criança</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Justificativa</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historico.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.crianca?.nome || "-"}</TableCell>
                          <TableCell>{item.crianca?.responsavel_nome || "-"}</TableCell>
                          <TableCell>
                            {getHistoricoAcaoBadge(item.acao)}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            {item.justificativa ? (
                              <span className="text-sm text-muted-foreground truncate block" title={item.justificativa}>
                                {item.justificativa}
                              </span>
                            ) : item.descricao ? (
                              <span className="text-sm text-muted-foreground truncate block" title={item.descricao}>
                                {item.descricao}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/modulo/vagou/admin/criancas/${item.crianca_id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum histórico encontrado.
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Dialogs */}
      <RemanejamentoDialog
        open={remanejamentoDialog}
        onOpenChange={setRemanejamentoDialog}
        crianca={criancaSelecionada}
        onConfirm={handleConfirmarRemanejamento}
        loading={solicitarRemanejamento.isPending}
      />

      <TransferenciaDialog
        open={transferenciaDialog}
        onOpenChange={setTransferenciaDialog}
        crianca={criancaSelecionada}
        onConfirm={handleConfirmarTransferencia}
        loading={efetivarTransferencia.isPending}
      />

      <RealocacaoDialog
        open={realocacaoDialog}
        onOpenChange={setRealocacaoDialog}
        crianca={criancaSelecionada}
        onConfirm={handleConfirmarRealocacao}
        loading={realocarTurma.isPending}
      />


      <TransferenciaMassaDialog
        open={transferMassaDialogOpen}
        onOpenChange={(open) => {
          setTransferMassaDialogOpen(open);
          if (!open) {
            setSelectedCriancas([]);
            handleRefresh();
          }
        }}
        preSelectedCriancaIds={selectedCriancas}
      />

      {/* Dialog de Desistente */}
      <Dialog open={desistenteDialog} onOpenChange={setDesistenteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Desistente</DialogTitle>
            <DialogDescription>
              Criança: {criancaSelecionada?.nome}
            </DialogDescription>
          </DialogHeader>
          <DesistenteForm 
            onConfirm={handleConfirmarDesistente} 
            loading={marcarDesistente.isPending}
            onCancel={() => setDesistenteDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de Destrancar */}
      <Dialog open={destrancarDialog} onOpenChange={(open) => {
        setDestrancarDialog(open);
        if (!open) setJustificativaDestrancar("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Destrancar Matrícula</DialogTitle>
            <DialogDescription>
              Criança: {criancaSelecionada?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="justificativa-destrancar">Justificativa *</Label>
              <Textarea
                id="justificativa-destrancar"
                value={justificativaDestrancar}
                onChange={(e) => setJustificativaDestrancar(e.target.value)}
                placeholder="Motivo para destrancar a matrícula..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDestrancarDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarDestrancar}
              disabled={!justificativaDestrancar.trim() || destrancarMatricula.isPending}
            >
              {destrancarMatricula.isPending && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              Destrancar Matrícula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );

  // Helper function for action menu items
  function renderActionMenuItems(crianca: any) {
    if (crianca.status === "Remanejamento Solicitado") {
      return (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Remanejamento</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleTransferir(crianca)} className="text-green-600 focus:text-green-700">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Efetivar Remanejamento
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleCancelarRemanejamento(crianca.id)}
            className="text-red-600 focus:text-red-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar Remanejamento
          </DropdownMenuItem>
        </>
      );
    }

    if (crianca.status === "Convocado") {
      return (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleDesistente(crianca)}
            className="text-orange-600 focus:text-orange-700"
          >
            <UserX className="h-4 w-4 mr-2" />
            Marcar como Desistente
          </DropdownMenuItem>
        </>
      );
    }

      if (crianca.status === "Matriculado" || crianca.status === "Matriculada") {
      return (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Turma</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleRealocar(crianca)} className="text-blue-600 focus:text-blue-700">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Realocar (Mudar Turma)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSolicitarRemanejamento(crianca)} className="text-indigo-600 focus:text-indigo-700">
            <MapPin className="h-4 w-4 mr-2" />
            Solicitar Remanejamento
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleDesistente(crianca)}
            className="text-orange-600 focus:text-orange-700"
          >
            <UserX className="h-4 w-4 mr-2" />
            Marcar como Desistente
          </DropdownMenuItem>
        </>
      );
    }

    return null;
  }
};

// Componente auxiliar para o form de desistente
function DesistenteForm({ onConfirm, loading, onCancel }: { onConfirm: (j: string) => void; loading: boolean; onCancel: () => void }) {
  const [justificativa, setJustificativa] = useState("");
  
  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="justificativa-desistente">Justificativa *</Label>
          <Textarea
            id="justificativa-desistente"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Motivo da desistência..."
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          onClick={() => onConfirm(justificativa)}
          disabled={!justificativa.trim() || loading}
          variant="destructive"
        >
          {loading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
          Confirmar Desistência
        </Button>
      </DialogFooter>
    </>
  );
}

export default Matriculas;



