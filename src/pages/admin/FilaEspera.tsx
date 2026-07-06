import { useState, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { CardGridSkeleton, TableSkeleton } from "@/components/common/skeletons";
import { useDebounce } from "@/hooks/use-debounce";
import AdminLayout from "@/components/admin/AdminLayout";
import { useCriancasRealtimeUpdates, useHistoricoRealtimeUpdates } from "@/hooks/use-realtime-updates";
import { DocumentosDialog } from "@/components/admin/DocumentosDialog";
import { CountdownTimer } from "@/components/admin/CountdownTimer";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { calcularIdadeCompleta, calcularIdadeEmMeses, verificarIdadeMinimaConvocacao } from "@/utils/turma-utils";
import { useStatusDocumentosLote } from "@/hooks/api/documentos-hooks";
import { useTurnoInteresseLote } from "@/hooks/api/campos-inscricao-hooks";
import { exigirDocumentacaoObrigatoriaCompleta } from "@/utils/documentos-obrigatorios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MotivoSelect } from "@/components/admin/MotivoSelect";
import { TipoMotivo } from "@/hooks/api/workflow-hooks";
import { TooltipHelper } from "@/components/ui/tooltip-helper";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildScoreTooltip, compareFilaItems, getScoreForCmei, getScoreGlobal, isConvocadoStatus } from "@/utils/fila-score";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TableColumnLayoutDef, useColumnResizer, useTableColumnLayout } from "@/hooks/use-table-column-layout";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Users, Search, Filter, UserPlus, UsersRound, X, Download, Eye, CheckCircle2, Bell, XCircle, UserX, AlertCircle, RotateCcw, BarChart3, MoreVertical, ChevronDown, History, Calendar, FileText, ArrowRightLeft, FileCheck, FileClock, FileX, Files, Columns3, Phone, Clock, Star } from "lucide-react";
import { useFilaEspera, useEnviarLembrete } from "@/hooks/api/criancas-hooks";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import { ConvocacaoDialog } from "@/components/admin/ConvocacaoDialog";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/utils/utils";
import { exportFilaEsperaCSV } from "@/utils/csv-utils";
import { exportFilaEsperaExcel } from "@/utils/excel-utils";
import { gerarRelatorioFilaListaPDF } from "@/utils/relatorios-utils";
import SexoIcon from "@/components/common/SexoIcon";
import { usePaginatedData } from "@/hooks/api/pagination-hooks";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { RealtimeIndicator } from "@/components/common/RealtimeIndicator";
import { useCanAccess, PERMISSIONS } from "@/components/admin/PermissionGate";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";

const FilaEspera = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Permission checks
  const canManage = useCanAccess(PERMISSIONS.FILA_GERENCIAR);
  const canConvocar = useCanAccess(PERMISSIONS.FILA_CONVOCAR);
  
  const [viewMode, setViewMode] = useState<"geral" | "instituicao">("geral");
  const [filtersGeral, setFiltersGeral] = useState<{
    search: string;
    prioridade: string;
    cmei?: string;
    prazo: string;
    status: string;
  }>({
    search: "",
    prioridade: "all",
    cmei: undefined,
    prazo: "all",
    status: "all",
  });
  const [filtersInstituicao, setFiltersInstituicao] = useState<{
    search: string;
    prioridade: string;
    cmei?: string;
    prazo: string;
    status: string;
  }>({
    search: "",
    prioridade: "all",
    cmei: undefined,
    prazo: "all",
    status: "all",
  });
  const activeFilters = viewMode === "geral" ? filtersGeral : filtersInstituicao;
  const setActiveFilters = viewMode === "geral" ? setFiltersGeral : setFiltersInstituicao;
  const { debouncedValue: debouncedSearchTerm, isDebouncing: isSearching } = useDebounce(activeFilters.search, 300);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [convocacaoDialog, setConvocacaoDialog] = useState<{
    open: boolean;
    mode: "individual" | "lote";
    criancaId?: string;
    criancaNome?: string;
  }>({ open: false, mode: "individual" });
  const [prazoConvocacao, setPrazoConvocacao] = useState("15");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "recusada" | "desistente" | "fim_fila" | null;
    criancaId?: string;
    criancaNome?: string;
  }>({ open: false, action: null });
  const [reativarDialog, setReativarDialog] = useState<{
    open: boolean;
    criancaId?: string;
    criancaNome?: string;
    statusAnterior?: string;
  }>({ open: false });
  const [justificativa, setJustificativa] = useState("");
  const [justificativaReativar, setJustificativaReativar] = useState("");
  const [historicoExpanded, setHistoricoExpanded] = useState(false);
  const [acaoUrgenteExpanded, setAcaoUrgenteExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());
  const [documentosDialog, setDocumentosDialog] = useState<{
    open: boolean;
    criancaId?: string;
    criancaNome?: string;
  }>({ open: false });

  const { data: fila, isLoading } = useFilaEspera({
    prioridade: activeFilters.prioridade !== "all" ? activeFilters.prioridade : undefined,
    includeDesistentes: activeFilters.status === "desistente_recusada",
  });

  const { data: cmeis } = useCMEIs();
  const { data: configuracoes } = useConfiguracoesSistema();
  const comprovacaoNaInscricao = (configuracoes as any)?.prioridades_comprovacao_na_inscricao ?? true;
  const { singular, plural } = getUnidadeLabels(configuracoes as any);

  const columnDefs = useMemo<TableColumnLayoutDef[]>(
    () => [
      { key: "posicao", label: "Posição", defaultWidth: 86, minWidth: 70, maxWidth: 160, hideable: false },
      { key: "crianca", label: "Criança", defaultWidth: 220, minWidth: 150, maxWidth: 520, hideable: false },
      { key: "data_nasc", label: "Data Nasc.", defaultWidth: 140, minWidth: 120, maxWidth: 240 },
      { key: "sexo", label: "Sexo", defaultWidth: 64, minWidth: 56, maxWidth: 96 },
      { key: "periodo", label: "Período", defaultWidth: 120, minWidth: 100, maxWidth: 220 },
      { key: "faixa", label: "Faixa etária", defaultWidth: 110, minWidth: 90, maxWidth: 180 },
      { key: "preferencias", label: "Preferências", defaultWidth: 260, minWidth: 160, maxWidth: 620 },
      { key: "responsavel", label: "Responsável", defaultWidth: 200, minWidth: 140, maxWidth: 520 },
      { key: "tempo", label: "Tempo na Fila", defaultWidth: 150, minWidth: 120, maxWidth: 260 },
      { key: "prioridade", label: "Prioridade", defaultWidth: 110, minWidth: 90, maxWidth: 320 },
      { key: "pontuacao", label: "Pontuação", defaultWidth: 110, minWidth: 90, maxWidth: 180 },
      { key: "docs", label: "Docs", defaultWidth: 90, minWidth: 70, maxWidth: 140 },
      { key: "status", label: "Status/Prazo", defaultWidth: 170, minWidth: 140, maxWidth: 320, hideable: false },
      { key: "acoes", label: "Ações", defaultWidth: 90, minWidth: 70, maxWidth: 140, hideable: false, resizable: false },
    ],
    [],
  );

  const {
    columns: tableColumns,
    visibleColumns,
    setColumnHidden,
    setColumnWidth,
    resetLayout,
  } = useTableColumnLayout("fila-admin", columnDefs);

  const columnsByKey = useMemo(() => Object.fromEntries(tableColumns.map((c) => [c.key, c])), [tableColumns]);

  const { startResize } = useColumnResizer({
    getWidth: (key) => columnsByKey[key]?.width,
    getMinWidth: (key) => columnsByKey[key]?.minWidth,
    getMaxWidth: (key) => columnsByKey[key]?.maxWidth,
    setWidth: setColumnWidth,
  });
  
  // Buscar IDs das crianças da página atual para status de documentos
  const criancaIds = useMemo(() => fila?.map(c => c.id) || [], [fila]);
  const { data: statusDocumentos } = useStatusDocumentosLote(criancaIds);
  // Componente para indicador de status de documentos
  const DocumentosIndicator = ({ criancaId, criancaNome }: { criancaId: string; criancaNome: string }) => {
    const status = statusDocumentos?.[criancaId];

    if (!status || status.total === 0) {
      return (
        <TooltipHelper content="Sem documentos obrigatórios">
          <Badge variant="outline" className="text-gray-400 border-gray-300 cursor-default">
            <Files className="h-3 w-3" />
          </Badge>
        </TooltipHelper>
      );
    }

    // Configuração visual do badge de acordo com a situação geral
    let badgeClass = "bg-green-100 text-green-700 hover:bg-green-200 border-green-300 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900";
    let icon = <FileCheck className="h-3 w-3" />;
    let label: string | null = null;
    if (status.recusados > 0) {
      badgeClass = "bg-red-100 text-red-700 hover:bg-red-200 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900";
      icon = <FileX className="h-3 w-3 mr-1" />;
      label = String(status.recusados);
    } else if (status.pendentes > 0) {
      const faltando = status.total - status.aprovados - status.pendentes - status.recusados;
      const todosFaltando = status.aprovados === 0 && faltando > 0 && status.pendentes === faltando;
      badgeClass = todosFaltando
        ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900"
        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900";
      icon = todosFaltando ? <AlertCircle className="h-3 w-3 mr-1" /> : <FileClock className="h-3 w-3 mr-1" />;
      label = String(status.pendentes);
    }

    const statusMeta: Record<string, { dot: string; texto: string }> = {
      aprovado: { dot: "bg-green-500", texto: "text-green-700 dark:text-green-300" },
      pendente: { dot: "bg-yellow-500", texto: "text-yellow-700 dark:text-yellow-300" },
      recusado: { dot: "bg-red-500", texto: "text-red-700 dark:text-red-300" },
      faltante: { dot: "bg-muted-foreground/40", texto: "text-muted-foreground" },
    };
    const statusRotulo: Record<string, string> = {
      aprovado: "Aprovado",
      pendente: "Em análise",
      recusado: "Recusado",
      faltante: "Faltante",
    };

    const entregues = status.itens.filter((i) => i.status !== "faltante");
    const faltantes = status.itens.filter((i) => i.status === "faltante");

    return (
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <Badge
            variant="default"
            className={cn("cursor-pointer transition-colors", badgeClass)}
            onClick={() => setDocumentosDialog({ open: true, criancaId, criancaNome })}
          >
            {icon}
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left" className="w-64 p-0">
          <div className="border-b px-3 py-2">
            <p className="text-xs font-semibold">Documentação</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${status.total ? (status.aprovados / status.total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {status.aprovados}/{status.total}
              </span>
            </div>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto px-3 py-2">
            {entregues.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Entregues</p>
                {entregues.map((item, idx) => (
                  <div key={`e-${idx}`} className="flex items-center gap-2 text-xs">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusMeta[item.status].dot)} />
                    <span className="flex-1 truncate">{item.nome}</span>
                    <span className={cn("shrink-0 text-[10px] font-medium", statusMeta[item.status].texto)}>
                      {statusRotulo[item.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {faltantes.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Faltantes</p>
                {faltantes.map((item, idx) => (
                  <div key={`f-${idx}`} className="flex items-center gap-2 text-xs">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusMeta[item.status].dot)} />
                    <span className="flex-1 truncate text-muted-foreground">{item.nome}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            Clique para gerenciar documentos
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };


  // Idade mínima para convocação (padrão 6 meses)
  const idadeMinimaMeses = configuracoes?.idade_minima_meses ?? 6;

  // Filtrar por status e prazo
  const filaFiltradaBase = useMemo(() => fila?.filter((crianca) => {
    // Filtro por status
    if (activeFilters.status !== "all") {
      if (activeFilters.status === "desistente_recusada") {
        if (crianca.status !== "Desistente" && crianca.status !== "Recusada") return false;
      } else if (crianca.status !== activeFilters.status) {
        return false;
      }
    }

    // Filtro por prazo (só aplica para Convocados)
    if (activeFilters.prazo !== "all") {
      if (crianca.status !== "Convocado" || !crianca.convocacao_deadline) return false;

      const now = new Date();
      const deadline = new Date(crianca.convocacao_deadline);
      const diffMs = deadline.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      switch (activeFilters.prazo) {
        case "expirado":
          return diffMs < 0;
        case "hoje":
          return diffDays === 0 && diffMs >= 0;
        case "3dias":
          return diffDays > 0 && diffDays <= 3;
        case "valido":
          return diffMs > 0;
        default:
          return true;
      }
    }

    return true;
  }), [fila, activeFilters.status, activeFilters.prazo]);

  const filaOrdenadaBase = useMemo(() => {
    if (!filaFiltradaBase) return filaFiltradaBase;

    const selectedCmeiId = activeFilters.cmei?.trim() ? activeFilters.cmei : undefined;
    if (viewMode === "instituicao" && !selectedCmeiId) return [];
    const base = selectedCmeiId
      ? filaFiltradaBase.filter((c) =>
          c.cmei1_preferencia === selectedCmeiId ||
          c.cmei2_preferencia === selectedCmeiId ||
          c.cmei3_preferencia === selectedCmeiId ||
          c.cmei_remanejamento_id === selectedCmeiId
        )
      : [...filaFiltradaBase];

    const getPreferenciaRank = (row: any) => {
      if (!selectedCmeiId) return 999;
      if (row.cmei_remanejamento_id === selectedCmeiId) return 0;
      if (row.cmei1_preferencia === selectedCmeiId) return 1;
      if (row.cmei2_preferencia === selectedCmeiId) return 2;
      if (row.cmei3_preferencia === selectedCmeiId) return 3;
      return 999;
    };

    base.sort((a, b) => {
      if (viewMode !== "instituicao" || !selectedCmeiId) return compareFilaItems(a, b, selectedCmeiId);

      const aConv = isConvocadoStatus(a.status) ? 1 : 0;
      const bConv = isConvocadoStatus(b.status) ? 1 : 0;
      if (aConv !== bConv) return bConv - aConv;

      const aRank = getPreferenciaRank(a);
      const bRank = getPreferenciaRank(b);
      if (aRank !== bRank) return aRank - bRank;

      return compareFilaItems(a, b, selectedCmeiId);
    });

    return base;
  }, [filaFiltradaBase, activeFilters.cmei, viewMode]);

  const filaVisivel = useMemo(() => {
    if (!filaOrdenadaBase) return filaOrdenadaBase;
    if (!debouncedSearchTerm) return filaOrdenadaBase;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return filaOrdenadaBase.filter((c) =>
      c.nome?.toLowerCase().includes(searchLower) ||
      c.responsavel_nome?.toLowerCase().includes(searchLower) ||
      c.responsavel_cpf?.includes(debouncedSearchTerm) ||
      c.protocolo?.toLowerCase().includes(searchLower)
    );
  }, [filaOrdenadaBase, debouncedSearchTerm]);

  const filaIds = useMemo(() => (filaVisivel || []).map((c) => c.id), [filaVisivel]);
  const { data: turnoInteresse = {} } = useTurnoInteresseLote(filaIds);

  // Crianças com prazo expirado (para card de ação urgente)
  const criancasExpiradas = fila?.filter((c) => {
    if (c.status !== "Convocado" || !c.convocacao_deadline) return false;
    return new Date(c.convocacao_deadline) < new Date();
  }) || [];

  // Habilitar atualizações em tempo real
  useCriancasRealtimeUpdates(true);
  useHistoricoRealtimeUpdates(false);

  // Pagination
  const pagination = usePaginatedData(filaVisivel, 25);

  const posicaoMap = useMemo(() => {
    const map = new Map<string, number>();
    let posicaoFilaEspera = 0;

    filaOrdenadaBase?.forEach((c) => {
      if (!isConvocadoStatus(c.status) && c.status === "Fila de Espera") {
        posicaoFilaEspera++;
        map.set(c.id, posicaoFilaEspera);
      }
    });

    return map;
  }, [filaOrdenadaBase]);

  // Get historico da fila - Desistentes, recusados, fim de fila e matriculados que saíram da fila
  const { data: historicoFila } = useQuery({
    queryKey: ["historico-fila"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico")
        .select(`
          *,
          crianca:criancas(
            nome,
            responsavel_nome,
            status,
            data_nascimento
          )
        `)
        .in("acao", ["Desistência", "Recusada", "Fim de Fila", "Prazo Expirado", "Matrícula Confirmada"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Filtrar: não mostrar quem foi reativado (status atual = Fila de Espera)
      // Exceção: matriculados sempre aparecem no histórico
      return (data || []).filter(item => {
        // Matrícula Confirmada sempre aparece
        if (item.acao === "Matrícula Confirmada") return true;
        // Se status atual for Fila de Espera, significa que foi reativado - não mostrar
        return item.crianca?.status !== "Fila de Espera";
      });
    },
  });

  // Mutation para confirmar matrícula (com suporte a remanejamento)
  const confirmarMatriculaMutation = useMutation({
    mutationFn: async (id: string) => {
      await exigirDocumentacaoObrigatoriaCompleta(
        id,
        "Valide os documentos antes de confirmar a matrícula.",
      );

      // Buscar dados da criança para verificar se é remanejamento
      const { data: crianca, error: fetchError } = await supabase
        .from("criancas")
        .select("*, cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome), turma_atual:turmas!criancas_turma_atual_id_fkey(nome), cmei_destino:cmeis!criancas_cmei_remanejamento_id_fkey(nome)")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const isRemanejamento = crianca.cmei_remanejamento_id && (crianca.status === "Matriculado" || crianca.status === "Matriculada");
      const cmeiAnteriorNome = crianca.cmei_atual?.nome;
      const cmeiNovoNome = crianca.cmei_destino?.nome;

      if (isRemanejamento) {
        // É um remanejamento - fazer a transferência automática
        const { error } = await supabase
          .from("criancas")
          .update({
            status: "Matriculado",
            cmei_atual_id: crianca.cmei_remanejamento_id,
            turma_atual_id: crianca.turma_atual_id, // Mantém turma ou define nova
            cmei_remanejamento_id: null,
            justificativa_remanejamento: null,
            prioridade: crianca.programas_sociais ? "Social" : "Geral",
            convocacao_deadline: null,
            data_convocacao: null,
          })
          .eq("id", id);

        if (error) throw error;

        await supabase.from("historico").insert({
          crianca_id: id,
          acao: "Remanejamento Concluído",
          descricao: `Transferência de ${cmeiAnteriorNome || `${singular} anterior`} para ${cmeiNovoNome || `${singular} novo`}`,
          status_anterior: "Matriculado",
          status_novo: "Matriculado",
          cmei_anterior: crianca.cmei_atual_id,
          cmei_novo: crianca.cmei_remanejamento_id,
        });

        // Enviar notificação de remanejamento concluído
        try {
          await supabase.functions.invoke("enviar-notificacao", {
            body: {
              crianca_id: id,
              tipo: "remanejamento_concluido",
              dados_adicionais: {
                cmei_anterior: cmeiAnteriorNome,
                cmei_novo: cmeiNovoNome,
              },
            },
          });
        } catch (notifError) {
          console.error("Erro ao enviar notificação de remanejamento:", notifError);
        }

        return { isRemanejamento: true, cmeiNovo: cmeiNovoNome, criancaId: id };
      } else {
        // Matrícula normal
        const { error } = await supabase
          .from("criancas")
          .update({ 
            status: "Matriculado",
            convocacao_deadline: null,
            data_convocacao: null,
          })
          .eq("id", id);

        if (error) throw error;

        await supabase.from("historico").insert({
          crianca_id: id,
          acao: "Matrícula Confirmada",
          descricao: "Matrícula confirmada pelo responsável",
          status_anterior: "Convocado",
          status_novo: "Matriculado",
        });

        // Enviar notificação de matrícula confirmada
        try {
          await supabase.functions.invoke("enviar-notificacao", {
            body: {
              crianca_id: id,
              tipo: "matricula",
            },
          });
        } catch (notifError) {
          console.error("Erro ao enviar notificação de matrícula:", notifError);
        }

        return { isRemanejamento: false, criancaId: id };
      }
    },
    onSuccess: async (result) => {
      await queryClient.refetchQueries({ queryKey: ["admin-fila"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["historico-matriculas-desistencias"] });
      queryClient.invalidateQueries({ queryKey: ["admin-matriculas"] });
      if (result?.isRemanejamento) {
        toast.success(`Remanejamento concluído! Criança transferida para ${result.cmeiNovo}`);
      } else {
        toast.success("Matrícula confirmada!");
      }
    },
    onError: (error: any) => {
      toast.error("Erro ao confirmar matrícula: " + error.message);
    },
  });

  // Mutation para ações com justificativa
  // Fim de Fila e Recusada: voltam para a fila com data_retorno_fila = agora
  // Isso faz a pessoa ir para o fim do seu grupo de prioridade, mas novos cadastros entram DEPOIS dela
  const statusActionMutation = useMutation({
    mutationFn: async ({ id, status, justificativa }: { id: string; status: string; justificativa: string }) => {
      const updates: any = { status: status as any };
      
      // Se for fim de fila, definir data_retorno_fila para ir pro fim da fila naturalmente
      // SEM usar data_penalidade - novos cadastros entrarão depois dela
      if (status === "Fila de Espera") {
        updates.data_retorno_fila = new Date().toISOString();
        updates.data_penalidade = null; // Limpar qualquer penalidade anterior
        updates.cmei_atual_id = null;
        updates.turma_atual_id = null;
        updates.convocacao_deadline = null;
        updates.data_convocacao = null;
      }
      
      // Se for desistente, limpar dados de convocação
      if (status === "Desistente") {
        updates.cmei_atual_id = null;
        updates.turma_atual_id = null;
        updates.convocacao_deadline = null;
        updates.data_convocacao = null;
        updates.posicao_fila = null;
      }
      
      // Se for recusada, volta para fila com data_retorno_fila = agora
      // Mesmo comportamento do fim de fila - vai pro fim naturalmente
      if (status === "Recusada") {
        updates.status = "Fila de Espera";
        updates.data_retorno_fila = new Date().toISOString();
        updates.data_penalidade = null; // Limpar qualquer penalidade anterior
        updates.cmei_atual_id = null;
        updates.turma_atual_id = null;
        updates.convocacao_deadline = null;
        updates.data_convocacao = null;
      }

      const { error } = await supabase
        .from("criancas")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      const acaoMap: Record<string, string> = {
        "Recusada": "Recusada",
        "Desistente": "Desistência",
        "Fila de Espera": "Fim de Fila",
      };

      await supabase.from("historico").insert({
        crianca_id: id,
        acao: acaoMap[status] || status,
        descricao: `Marcado como ${status.toLowerCase()}`,
        justificativa,
        status_anterior: "Convocado",
        status_novo: status as any,
      });
    },
    onSuccess: async (_, variables) => {
      // Enviar notificação para fim de fila ou desistência
      const tipoNotificacao = variables.status === "Fila de Espera" ? "fim_fila" 
        : variables.status === "Desistente" ? "desistencia" 
        : variables.status === "Recusada" ? "recusa" : null;
      
      if (tipoNotificacao) {
        try {
          await supabase.functions.invoke('enviar-notificacao', {
            body: {
              crianca_id: variables.id,
              tipo: tipoNotificacao,
              dados_adicionais: {
                justificativa: variables.justificativa,
              },
            },
          });
        } catch (notifError) {
          console.error('Erro ao enviar notificação:', notifError);
        }
      }
      
      await queryClient.refetchQueries({ queryKey: ["admin-fila"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["historico-matriculas-desistencias"] });
      setActionDialog({ open: false, action: null });
      setJustificativa("");
      toast.success("Status atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  // Mutation para reativar criança desistente
  // Nova lógica: SEMPRE define data_retorno_fila quando reativar (independente de prioridade)
  // Isso faz com que a data de retorno seja considerada na ordenação, não a data de cadastro original
  const reativarMutation = useMutation({
    mutationFn: async ({ id, justificativa, statusAnterior }: { id: string; justificativa: string; statusAnterior: string }) => {
      // Sempre define data_retorno_fila - vai pro fim do grupo correspondente
      // Limpa penalidade para não ir pro fim absoluto
      const updates: any = {
        status: "Fila de Espera",
        cmei_atual_id: null,
        turma_atual_id: null,
        data_retorno_fila: new Date().toISOString(),
        data_penalidade: null, // Limpa penalidade de fim de fila
      };

      const { error } = await supabase
        .from("criancas")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: id,
        acao: "Reativação",
        descricao: "Criança reativada e retornou à fila de espera",
        justificativa,
        status_anterior: statusAnterior as any,
        status_novo: "Fila de Espera",
      });

      return id; // Retorna o ID para usar no onSuccess
    },
    onSuccess: async (criancaId) => {
      await queryClient.refetchQueries({ queryKey: ["admin-fila"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["historico-fila"] });
      queryClient.invalidateQueries({ queryKey: ["historico-matriculas-desistencias"] });
      setReativarDialog({ open: false });
      setJustificativaReativar("");
      toast.success("Criança reativada e voltou para a fila!");

      // Enviar notificação de inscrição (reativação)
      try {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            crianca_id: criancaId,
            tipo: 'inscricao_realizada'
          }
        });
      } catch (e) {
        console.error('Erro ao enviar notificação de reativação:', e);
      }
    },
    onError: (error: any) => {
      toast.error("Erro ao reativar: " + error.message);
    },
  });

  // Mutation para cancelar remanejamento
  const cancelarRemanejamentoMutation = useMutation({
    mutationFn: async (id: string) => {
      // Buscar dados da criança para atualizar prioridade
      const { data: criancaData, error: fetchError } = await supabase
        .from("criancas")
        .select("programas_sociais, cmei_remanejamento_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("criancas")
        .update({
          cmei_remanejamento_id: null,
          justificativa_remanejamento: null,
          prioridade: criancaData.programas_sociais ? "Social" : "Geral",
        })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: id,
        acao: "Remanejamento Cancelado",
        descricao: "Solicitação de remanejamento cancelada pelo gestor",
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["admin-fila"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["admin-matriculas"] });
      toast.success("Remanejamento cancelado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao cancelar remanejamento: " + error.message);
    },
  });

  // Mutation para reenviar notificação
  const reenviarNotificacaoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: crianca } = await supabase
        .from("criancas")
        .select("convocacao_deadline")
        .eq("id", id)
        .single();

      if (!crianca) throw new Error("Criança não encontrada");

      await supabase.functions.invoke('enviar-notificacao', {
        body: {
          crianca_id: id,
          tipo: 'convocacao',
          dados_adicionais: {
            deadline: crianca.convocacao_deadline,
            reenvio: true,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Notificação reenviada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao reenviar notificação: " + error.message);
    },
  });

  // Mutation para enviar mensagem para o contato alternativo (Telefone de contato 2)
  const enviarContatoAlternativoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: crianca } = await supabase
        .from("criancas")
        .select("convocacao_deadline, responsavel_celular")
        .eq("id", id)
        .single();

      if (!crianca) throw new Error("Criança não encontrada");
      if (!crianca.responsavel_celular) throw new Error("Esta criança não possui telefone de contato 2 cadastrado");

      await supabase.functions.invoke('enviar-notificacao', {
        body: {
          crianca_id: id,
          tipo: 'convocacao',
          dados_adicionais: {
            deadline: crianca.convocacao_deadline,
            reenvio: true,
            usar_contato_alternativo: true,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Mensagem enviada para o contato 2!");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar para contato 2: " + error.message);
    },
  });

  // Mutation para enviar lembrete de prazo
  const enviarLembreteMutation = useEnviarLembrete();


  // Calcula a idade completa (anos, meses, dias)
  const calcularIdade = (dataNascimento: string) => {
    return calcularIdadeCompleta(dataNascimento);
  };
  
  // Verifica se a criança pode ser convocada (idade mínima)
  const podeConvocar = (dataNascimento: string): { permitido: boolean; mensagem?: string } => {
    const { abaixoIdadeMinima, mesesFaltando } = verificarIdadeMinimaConvocacao(dataNascimento, idadeMinimaMeses);
    if (abaixoIdadeMinima) {
      return { 
        permitido: false, 
        mensagem: `Menor de ${idadeMinimaMeses} meses (faltam ${mesesFaltando}m)` 
      };
    }
    return { permitido: true };
  };

  const getStatusBadge = (crianca: any) => {
    if (crianca.status === "Convocado" && crianca.convocacao_deadline) {
      return <CountdownTimer deadline={new Date(crianca.convocacao_deadline)} />;
    }

    if (crianca.status === "Aguardando Documentação") {
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <FileText className="mr-1 h-3 w-3" />
          Aguardando Docs
        </Badge>
      );
    }

    if (crianca.status === "Transferido") {
      return (
        <Badge variant="outline" className="gap-1 rounded-full text-gray-600 border-gray-300 dark:text-gray-300 dark:border-gray-700">
          <ArrowRightLeft className="h-3 w-3" />
          Transferido
        </Badge>
      );
    }

    if (crianca.status === "Matrícula Trancada") {
      return (
        <Badge variant="outline" className="gap-1 rounded-full text-blue-600 border-blue-300 dark:text-blue-300 dark:border-blue-800">
          <FileClock className="h-3 w-3" />
          Matrícula Trancada
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="rounded-full">
        {crianca.status}
      </Badge>
    );
  };

  const handleConvocar = (id: string, nome: string) => {
    setConvocacaoDialog({
      open: true,
      mode: "individual",
      criancaId: id,
      criancaNome: nome,
    });
  };

  const handleAction = (action: "recusada" | "desistente" | "fim_fila", id: string, nome: string) => {
    setActionDialog({
      open: true,
      action,
      criancaId: id,
      criancaNome: nome,
    });
  };

  const confirmarAction = () => {
    if (!actionDialog.criancaId || !actionDialog.action) return;

    const statusMap: Record<string, string> = {
      recusada: "Recusada",
      desistente: "Desistente",
      fim_fila: "Fila de Espera",
    };

    statusActionMutation.mutate({
      id: actionDialog.criancaId,
      status: statusMap[actionDialog.action],
      justificativa,
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!fila) return;
    
    const filaEsperaIds = fila
      .filter((c) => c.status === "Fila de Espera")
      .map((c) => c.id);

    if (selectedIds.length === filaEsperaIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filaEsperaIds);
    }
  };

  const handleExportFila = async (formato: "csv" | "xlsx" | "pdf") => {
    if (!fila || fila.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }
    setIsExporting(true);
    try {
      if (formato === "csv") {
        exportFilaEsperaCSV(fila, singular);
      } else if (formato === "xlsx") {
        exportFilaEsperaExcel(fila, singular);
      } else {
        await gerarRelatorioFilaListaPDF(fila);
      }
      toast.success("Exportação concluída!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar");
    } finally {
      setIsExporting(false);
    }
  };

  const totalFila = filaVisivel?.length || 0;
  const comPrioridade = filaVisivel?.filter((c) => (c.pontos_prioridades || 0) > 0 && !c.cmei_remanejamento_id).length || 0;
  const convocados = filaVisivel?.filter((c) => c.status === "Convocado").length || 0;
  const aguardandoDocumentos = filaVisivel?.filter((c) => {
    if (c.status !== "Convocado") return false;
    const docs = statusDocumentos?.[c.id];
    if (!docs || docs.total === 0) return false;
    return !docs.completo;
  }).length || 0;
  const remanejamentos = filaVisivel?.filter((c) => c.cmei_remanejamento_id).length || 0;
  const desistentesRecusadas = fila?.filter((c) => c.status === "Desistente" || c.status === "Recusada").length || 0;
  const expirados = criancasExpiradas.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Fila de Espera e Convocações</h1>
              <RealtimeIndicator />
            </div>
          }
          description="Gerenciamento da fila de espera para vagas"
          actions={(
            <>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Atualizado às {format(new Date(lastUpdatedAt), "HH:mm", { locale: ptBR })}
              </span>
              <TooltipHelper content="Atualizar dados manualmente">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    queryClient.invalidateQueries({
                      predicate: (query) => {
                        const key = query.queryKey[0];
                        return key === "admin-fila" || key === "historico-fila";
                      },
                    });
                    toast.success("Dados atualizados!");
                    setLastUpdatedAt(Date.now());
                  }}
                  aria-label="Atualizar fila"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipHelper>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    aria-label="Exportar fila de espera"
                    className="w-full sm:w-auto"
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportFila("csv")}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportFila("xlsx")}>
                    <Files className="h-4 w-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExportFila("pdf")}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total na Fila</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFila}</div>
              <p className="text-xs text-muted-foreground">Crianças aguardando vaga na fila.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remanejamento</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{remanejamentos}</div>
              <p className="text-xs text-muted-foreground">Solicitações de remanejamento.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Prioridade</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{comPrioridade}</div>
              <p className="text-xs text-muted-foreground">Com algum critério de prioridade (lei federal).</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convocadas</CardTitle>
              <UsersRound className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{convocados}</div>
              <p className="text-xs text-muted-foreground">Convocadas para confirmação.</p>
              {expirados > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {expirados} com prazo expirado
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Docs.</CardTitle>
              <FileClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aguardandoDocumentos}</div>
              <p className="text-xs text-muted-foreground">Convocadas com documentação incompleta.</p>
            </CardContent>
          </Card>

        </div>

        {/* Card de Ação Urgente - Prazos Expirados */}
        {criancasExpiradas.length > 0 && (
          <Collapsible open={acaoUrgenteExpanded} onOpenChange={setAcaoUrgenteExpanded}>
            <Card className="border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer transition-colors hover:bg-red-100/60 dark:hover:bg-red-950/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <div>
                        <CardTitle className="text-red-700 dark:text-red-300">
                          Ação urgente: {criancasExpiradas.length} criança(s) com prazo expirado
                        </CardTitle>
                        <CardDescription className="text-red-600 dark:text-red-400">
                          Estas crianças precisam de ação imediata: reconvocar, marcar como desistente ou fim de fila
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-red-600 transition-transform ${acaoUrgenteExpanded ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-2">
                    {criancasExpiradas.slice(0, 5).map((crianca) => (
                      <div key={crianca.id} className="flex items-center justify-between p-3 bg-white dark:bg-background rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex-1">
                          <span className="font-medium">{crianca.nome}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({calcularIdade(crianca.data_nascimento)})
                          </span>
                          <span className="text-xs text-red-600 ml-2">
                            Venceu em {crianca.convocacao_deadline ? format(new Date(crianca.convocacao_deadline), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => handleConvocar(crianca.id, crianca.nome)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Reconvocar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                            onClick={() => handleAction("fim_fila", crianca.id, crianca.nome)}
                          >
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Fim de Fila
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleAction("desistente", crianca.id, crianca.nome)}
                          >
                            <UserX className="mr-1 h-3 w-3" />
                            Desistente
                          </Button>
                        </div>
                      </div>
                    ))}
                    {criancasExpiradas.length > 5 && (
                      <p className="text-sm text-red-600 text-center pt-2">
                        E mais {criancasExpiradas.length - 5} criança(s)...
                      </p>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Main Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Listagem da Fila</CardTitle>
                <CardDescription>Ordenada por prioridade e posição na fila</CardDescription>
              </div>
              <Button onClick={() => navigate("/modulo/vagou/admin/ocupacao")} className="w-full sm:w-auto">
                <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
                Ocupação
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="space-y-3">
              <Tabs
                value={viewMode}
                onValueChange={(v) => {
                  setViewMode(v as "geral" | "instituicao");
                  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                }}
              >
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="instituicao">Por {singular}</TabsTrigger>
                </TabsList>
              </Tabs>

              {viewMode === "instituicao" && (
                <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900">
                  <AlertDescription>
                    Recorte da fila geral. Ordenação prioriza quem selecionou esta {singular.toLowerCase()} como 1ª opção (depois 2ª e 3ª).
                  </AlertDescription>
                </Alert>
              )}

              <div className="relative">
                {isSearching ? (
                  <Spinner className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder="Buscar por nome da criança ou responsável..."
                  value={activeFilters.search}
                  onChange={(e) => setActiveFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="pl-10 h-11"
                />
              </div>

              <div className="flex flex-col gap-4 md:flex-row">
                {viewMode === "instituicao" ? (
                  <Select value={activeFilters.cmei || "none"} onValueChange={(v) => setActiveFilters((prev) => ({ ...prev, cmei: v === "none" ? undefined : v }))}>
                    <SelectTrigger className="w-full md:w-[240px]">
                      <SelectValue placeholder={`Selecione ${singular.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione {singular.toLowerCase()}</SelectItem>
                      {cmeis?.map((cmei) => (
                        <SelectItem key={cmei.id} value={cmei.id}>
                          {cmei.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={activeFilters.cmei || "all"} onValueChange={(v) => setActiveFilters((prev) => ({ ...prev, cmei: v === "all" ? undefined : v }))}>
                    <SelectTrigger className="w-full md:w-[240px]">
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
                )}

                <Select value={activeFilters.prioridade} onValueChange={(v) => setActiveFilters((prev) => ({ ...prev, prioridade: v }))}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as prioridades</SelectItem>
                    <SelectItem value="Remanejamento">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                        🔄 Remanejamento
                      </div>
                    </SelectItem>
                    <SelectItem value="Prioridade">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        Com prioridade (Lei Federal)
                      </div>
                    </SelectItem>
                    <SelectItem value="Geral">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                        Sem prioridade (Geral)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={activeFilters.prazo} onValueChange={(v) => setActiveFilters((prev) => ({ ...prev, prazo: v }))}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Todos os prazos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os prazos</SelectItem>
                    <SelectItem value="expirado">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-destructive"></div>
                        Já expirados
                      </div>
                    </SelectItem>
                    <SelectItem value="hoje">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                        Expirando hoje
                      </div>
                    </SelectItem>
                    <SelectItem value="3dias">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                        Próximos 3 dias
                      </div>
                    </SelectItem>
                    <SelectItem value="valido">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        Prazo válido
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={activeFilters.status} onValueChange={(v) => setActiveFilters((prev) => ({ ...prev, status: v }))}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="Fila de Espera">Fila de Espera</SelectItem>
                    <SelectItem value="Convocado">Convocado</SelectItem>
                    <SelectItem value="Aguardando Documentação">Aguardando Docs</SelectItem>
                    <SelectItem value="Aguardando Assinatura">Aguardando Assinatura</SelectItem>
                    <SelectItem value="Transferido">Transferido</SelectItem>
                    <SelectItem value="Matrícula Trancada">Matrícula Trancada</SelectItem>
                    <SelectItem value="desistente_recusada">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                        Desistentes/Recusadas (reativar)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                      <Columns3 className="mr-2 h-4 w-4" />
                      Colunas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {tableColumns
                      .filter((c) => c.hideable !== false)
                      .map((c) => (
                        <DropdownMenuCheckboxItem
                          key={c.key}
                          checked={!c.hidden}
                          onCheckedChange={(checked) => {
                            const minVisible = tableColumns.filter((x) => x.hideable === false).length;
                            if (!checked && visibleColumns.length <= minVisible) return;
                            setColumnHidden(c.key, !checked);
                          }}
                        >
                          {c.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    <DropdownMenuSeparator />
                    <Button variant="ghost" size="sm" className="w-full justify-start px-2" onClick={resetLayout}>
                      Restaurar padrão
                    </Button>
                  </DropdownMenuContent>
                </DropdownMenu>

                {(activeFilters.search || activeFilters.prioridade !== "all" || activeFilters.cmei || activeFilters.prazo !== "all" || activeFilters.status !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveFilters((prev) => ({
                        ...prev,
                        search: "",
                        prioridade: "all",
                        prazo: "all",
                        status: "all",
                        ...(viewMode === "instituicao" ? {} : { cmei: undefined }),
                      }));
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <TableSkeleton rows={8} columns={6} />
            ) : viewMode === "instituicao" && !activeFilters.cmei ? (
              <div className="text-center py-12 text-muted-foreground">
                Selecione {singular.toLowerCase()} para ver o recorte da fila.
              </div>
            ) : !filaVisivel || filaVisivel.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma criança encontrada{activeFilters.prazo !== "all" ? " com os filtros aplicados" : " na fila de espera"}.
              </div>
            ) : (
              <>
              <div className="border rounded-lg overflow-hidden overflow-x-auto [&_table]:text-xs [&_th]:h-9 [&_th]:px-2 [&_th]:py-1.5 [&_td]:p-2 [&_td]:align-top [&_td]:leading-tight">
                <Table className="table-fixed">
                  <colgroup>
                    {tableColumns.map((c) => {
                      const style = c.hidden ? ({ display: "none" } as const) : c.width ? ({ width: `${c.width}px` } as const) : undefined;
                      return <col key={c.key} style={style} />;
                    })}
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-20 bg-background relative select-none whitespace-nowrap">
                        <div className="px-3 text-center">Posição</div>
                        <div
                          className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none z-30"
                          onPointerDown={(e) => startResize(e, "posicao")}
                        >
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("relative select-none whitespace-nowrap", columnsByKey["crianca"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Criança</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "crianca")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("relative select-none whitespace-nowrap", columnsByKey["data_nasc"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Data Nasc.</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "data_nasc")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("text-center relative select-none whitespace-nowrap", columnsByKey["sexo"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Sexo</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "sexo")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("relative select-none whitespace-nowrap", columnsByKey["periodo"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Período</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "periodo")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("relative select-none whitespace-nowrap", columnsByKey["faixa"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Faixa etária</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "faixa")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("relative select-none whitespace-nowrap", columnsByKey["preferencias"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Preferências</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "preferencias")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("relative select-none whitespace-nowrap", columnsByKey["responsavel"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Responsável</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "responsavel")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("relative select-none whitespace-nowrap", columnsByKey["tempo"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Tempo na Fila</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "tempo")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("relative select-none whitespace-nowrap", columnsByKey["prioridade"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Prioridade</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "prioridade")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("text-center relative select-none whitespace-nowrap", columnsByKey["pontuacao"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Pontuação</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "pontuacao")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className={cn("text-center relative select-none whitespace-nowrap", columnsByKey["docs"]?.hidden && "hidden")}>
                        <div className="px-3 text-center">Docs</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "docs")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className="text-center relative select-none whitespace-nowrap">
                        <div className="px-3 text-center">Status/Prazo</div>
                        <div className="absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none" onPointerDown={(e) => startResize(e, "status")}>
                          <div className="mx-auto h-full w-px bg-border opacity-60" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.data.map((crianca) => {
                        const isConvocado = crianca.status === "Convocado" || 
                                           crianca.status === "Aguardando Documentação" || 
                                           crianca.status === "Aguardando Assinatura";
                        const posicao = posicaoMap.get(crianca.id);
                        
                        const isRemanejamento = crianca.cmei_remanejamento_id || crianca.prioridade === "Remanejamento";
                        const cmeiSelecionado = viewMode === "instituicao" ? (activeFilters.cmei?.trim() ? activeFilters.cmei : undefined) : undefined;
                        const preferenciaLabel =
                          viewMode === "instituicao" && cmeiSelecionado
                            ? crianca.cmei_remanejamento_id === cmeiSelecionado
                              ? "Remanej."
                              : crianca.cmei1_preferencia === cmeiSelecionado
                                ? "1ª opção"
                                : crianca.cmei2_preferencia === cmeiSelecionado
                                  ? "2ª opção"
                                  : crianca.cmei3_preferencia === cmeiSelecionado
                                    ? "3ª opção"
                                    : undefined
                            : undefined;
                        const menorDe6Meses = calcularIdadeEmMeses(crianca.data_nascimento) < 6;
                        return (
                        <TableRow
                          key={crianca.id}
                          className={cn(
                            menorDe6Meses &&
                              "[&>td]:bg-red-200/70 hover:[&>td]:bg-red-200/80 dark:[&>td]:bg-red-900/70 dark:hover:[&>td]:bg-red-900/80"
                          )}
                        >
                          <TableCell className={cn("sticky left-0 z-10", menorDe6Meses ? "bg-red-200/70 dark:bg-red-900/70" : "bg-background", columnsByKey["posicao"]?.hidden && "hidden")}>
                            {isRemanejamento ? (
                              <TooltipHelper content="Solicitação de remanejamento - prioridade máxima">
                                <div className="w-8 h-8 rounded-md bg-purple-600 text-white flex items-center justify-center">
                                  <ArrowRightLeft className="h-4 w-4" />
                                </div>
                              </TooltipHelper>
                            ) : isConvocado ? (
                              <Badge className="hover:bg-primary/85 text-center px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent rounded-md w-8 h-8 flex items-center justify-center text-[9px] border-0 bg-amber-300 text-gray-950">
                                Conv.
                              </Badge>
                            ) : (
                              <div className={cn(
                                "w-8 h-8 rounded-md flex items-center justify-center font-bold text-[12px]",
                                menorDe6Meses ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
                              )}>
                                #{typeof posicao === "number" ? posicao : "-"}
                              </div>
                            )}
                          </TableCell>
                        <TableCell className={cn("font-medium", columnsByKey["crianca"]?.hidden && "hidden")}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                              {crianca.nome?.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?"}
                            </span>
                            <div className="flex min-w-0 flex-col leading-tight">
                              <span className="truncate font-medium">{crianca.nome}</span>
                              {preferenciaLabel && (
                                <Badge variant="outline" className="mt-0.5 w-fit text-[10px] h-4 px-1.5 font-normal text-muted-foreground">
                                  {preferenciaLabel}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-center", columnsByKey["data_nasc"]?.hidden && "hidden")}>
                          <div className="flex flex-col items-center leading-tight">
                            <span className="inline-flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {crianca.data_nascimento
                                ? format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </span>
                            <span className="mt-0.5 w-fit rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {calcularIdade(crianca.data_nascimento)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-center", columnsByKey["sexo"]?.hidden && "hidden")}>
                          <SexoIcon sexo={crianca.sexo} />
                        </TableCell>
                        <TableCell className={cn("text-center", columnsByKey["periodo"]?.hidden && "hidden")}>
                          {(() => {
                            const turno = crianca.turma_atual?.turno || turnoInteresse[crianca.id];
                            if (!turno) return <span className="text-muted-foreground">-</span>;
                            const turnoStyles: Record<string, string> = {
                              "Matutino": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
                              "Vespertino": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
                              "Integral": "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
                              "Noturno": "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
                            };
                            return (
                              <Badge variant="outline" className={cn("gap-1 rounded-full font-medium", turnoStyles[turno] || "")}>
                                <Calendar className="h-3 w-3" />
                                {turno}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className={cn(columnsByKey["faixa"]?.hidden && "hidden")}>
                          {(() => {
                            const verificacao = podeConvocar(crianca.data_nascimento);
                            if (!verificacao.permitido) {
                              const idadeMeses = calcularIdadeEmMeses(crianca.data_nascimento);
                              return (
                                <TooltipHelper
                                  content={
                                    verificacao.mensagem ||
                                    `A criança tem ${idadeMeses} ${idadeMeses === 1 ? "mês" : "meses"} e ainda não atingiu a idade mínima de ${idadeMinimaMeses} meses para convocação.`
                                  }
                                >
                                  <Badge variant="outline" className="gap-1 rounded-full font-medium text-red-700 border-red-200 bg-red-50 cursor-help dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
                                    <AlertCircle className="h-3 w-3" />
                                    &lt;{idadeMinimaMeses}m
                                  </Badge>
                                </TooltipHelper>
                              );
                            }
                            return (
                              <Badge variant="outline" className="gap-1 rounded-full font-medium text-green-700 border-green-200 bg-green-50 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900">
                                <CheckCircle2 className="h-3 w-3" />
                                Apto
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className={cn("max-w-[180px]", columnsByKey["preferencias"]?.hidden && "hidden")}>
                          <div className="flex flex-col gap-1">
                            {[
                              { n: 1, nome: crianca.cmei1?.nome },
                              { n: 2, nome: crianca.cmei2?.nome },
                              ...(configuracoes?.preferencias_cmei_qtd === 3
                                ? [{ n: 3, nome: (crianca as any).cmei3?.nome }]
                                : []),
                            ].map(({ n, nome }) => (
                              <div key={n} className="flex items-center gap-2">
                                <span className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                                  n === 1
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {n}
                                </span>
                                <span className={cn(
                                  "whitespace-normal break-words",
                                  n === 1 ? "text-xs" : "text-[11px] text-muted-foreground"
                                )}>
                                  {nome || "-"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className={cn(columnsByKey["responsavel"]?.hidden && "hidden")}>
                          <div className="flex flex-col leading-tight">
                            <span className="text-xs font-medium whitespace-normal break-words">{crianca.responsavel_nome}</span>
                            {(crianca.responsavel_telefone || crianca.responsavel_celular) && (
                              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {crianca.responsavel_telefone || crianca.responsavel_celular}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn(columnsByKey["tempo"]?.hidden && "hidden")}>
                          {(() => {
                            // Se retornou à fila, mostrar data de retorno
                            const dataReferencia = crianca.data_retorno_fila || crianca.created_at;
                            if (!dataReferencia) return "-";
                            
                            const diasNaFila = differenceInDays(new Date(), new Date(dataReferencia));
                            const dataFormatada = format(new Date(dataReferencia), "dd/MM/yyyy - HH:mm", { locale: ptBR });
                            
                            // Highlight baseado no tempo de espera
                            let pillClass = "bg-muted text-muted-foreground";
                            if (diasNaFila >= 180) {
                              pillClass = "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
                            } else if (diasNaFila >= 90) {
                              pillClass = "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300";
                            } else if (diasNaFila >= 30) {
                              pillClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300";
                            }
                            
                            return (
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">
                                  {crianca.data_retorno_fila ? "Retornou: " : ""}{dataFormatada}
                                </span>
                                <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", pillClass)}>
                                  <Clock className="h-3 w-3" />
                                  {diasNaFila} dia{diasNaFila !== 1 ? "s" : ""} na fila
                                </span>
                                {crianca.data_retorno_fila && (
                                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                    <RotateCcw className="h-3 w-3" />
                                    Reativado
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className={cn("text-center", columnsByKey["prioridade"]?.hidden && "hidden")}>
                          <div className="flex flex-col items-center gap-1">
                            {/* Remanejamento - Prioridade máxima */}
                            {(crianca.prioridade === "Remanejamento" || crianca.cmei_remanejamento_id) ? (
                              <>
                                <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
                                  <ArrowRightLeft className="mr-1 h-3 w-3" />
                                  Remanejamento
                                </Badge>
                                {/* Mostrar que está matriculado */}
                                {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && (
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-400">
                                    ✓ Matriculado
                                  </Badge>
                                )}
                                {/* CMEI destino */}
                                {crianca.cmei_destino && (
                                  <span className="text-xs text-muted-foreground">
                                    → {crianca.cmei_destino.nome}
                                  </span>
                                )}
                                {/* CMEI atual */}
                                {crianca.cmei_atual && (
                                  <span className="text-xs text-muted-foreground">
                                    (atual: {crianca.cmei_atual.nome})
                                  </span>
                                )}
                              </>
                            ) : (crianca.pontos_prioridades || 0) > 0 ? (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                Sim
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Não</Badge>
                            )}
                            {crianca.data_penalidade && !crianca.cmei_remanejamento_id && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50">
                                ⚠ Fim de fila ({format(new Date(crianca.data_penalidade), "dd/MM", { locale: ptBR })})
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-center", columnsByKey["pontuacao"]?.hidden && "hidden")}>
                          {(() => {
                            const cmeiId = activeFilters.cmei?.trim() ? activeFilters.cmei : undefined;
                            const score = cmeiId ? getScoreForCmei(crianca as any, cmeiId) : getScoreGlobal(crianca as any);
                            const tooltip = buildScoreTooltip(crianca as any, cmeiId, { comprovacaoNaInscricao });

                            return (
                              <TooltipHelper content={tooltip} side="left">
                                <Badge variant="outline" className="gap-1 rounded-full border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono font-semibold tabular-nums text-primary cursor-help transition-colors hover:bg-primary/20">
                                  <Star className="h-3 w-3 fill-current" />
                                  {score ?? "—"}
                                </Badge>
                              </TooltipHelper>
                            );
                          })()}
                        </TableCell>
                        <TableCell className={cn("text-center", columnsByKey["docs"]?.hidden && "hidden")}>
                          <DocumentosIndicator criancaId={crianca.id} criancaNome={crianca.nome} />
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="mx-auto">
                            {getStatusBadge(crianca)}
                          </div>
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
                            <DropdownMenuContent align="end" className="w-64 [&_[role=menuitem]]:transition-all [&_[role=menuitem]]:duration-200 [&_[role=menuitem]]:cursor-pointer [&_[role=menuitem]:hover]:translate-x-1 [&_[role=menuitem]_svg]:transition-transform [&_[role=menuitem]:hover_svg]:scale-110">
                              <DropdownMenuLabel className="flex flex-col gap-0.5">
                                <span className="text-xs font-normal text-muted-foreground">Ações</span>
                                <span className="truncate text-sm font-semibold">{crianca.nome}</span>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => navigate(`/modulo/vagou/admin/criancas/${crianca.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                                Ver detalhes
                              </DropdownMenuItem>
                              {crianca.status === "Convocado" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Matrícula</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => confirmarMatriculaMutation.mutate(crianca.id)}
                                    className="text-green-600 focus:text-green-700"
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Confirmar matrícula
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Notificações</DropdownMenuLabel>
                                  {crianca.convocacao_deadline && new Date(crianca.convocacao_deadline) < new Date() ? (
                                    <DropdownMenuItem
                                      onClick={() => handleConvocar(crianca.id, crianca.nome)}
                                      className="text-blue-600 focus:text-blue-700"
                                    >
                                      <RotateCcw className="mr-2 h-4 w-4" />
                                      Reconvocar para matrícula
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => reenviarNotificacaoMutation.mutate(crianca.id)}
                                    >
                                      <Bell className="mr-2 h-4 w-4 text-muted-foreground" />
                                      Reenviar notificação
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => enviarLembreteMutation.mutate({ id: crianca.id, tipo: 'lembrete' })}
                                    className="text-amber-600 focus:text-amber-700"
                                  >
                                    <Bell className="mr-2 h-4 w-4" />
                                    Enviar lembrete de prazo
                                  </DropdownMenuItem>
                                  {crianca.responsavel_celular && (
                                    <DropdownMenuItem
                                      onClick={() => enviarContatoAlternativoMutation.mutate(crianca.id)}
                                      className="text-indigo-600 focus:text-indigo-700"
                                    >
                                      <Phone className="mr-2 h-4 w-4" />
                                      Enviar para contato 2
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Encerrar convocação</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleAction("recusada", crianca.id, crianca.nome)}
                                    className="text-red-600 focus:text-red-700"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Marcar como recusada
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleAction("fim_fila", crianca.id, crianca.nome)}
                                    className="text-yellow-600 focus:text-yellow-700"
                                  >
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Marcar fim de fila
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleAction("desistente", crianca.id, crianca.nome)}
                                    className="text-orange-600 focus:text-orange-700"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Marcar como desistente
                                  </DropdownMenuItem>
                                </>
                              )}
                              {crianca.status === "Fila de Espera" && (
                                <>
                                  <DropdownMenuSeparator />
                                  {(() => {
                                    const verificacao = podeConvocar(crianca.data_nascimento);
                                    if (!verificacao.permitido) {
                                      return (
                                        <DropdownMenuItem
                                          disabled
                                          className="text-muted-foreground cursor-not-allowed"
                                        >
                                          <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                                          {verificacao.mensagem}
                                        </DropdownMenuItem>
                                      );
                                    }
                                    return (
                                      <DropdownMenuItem
                                        onClick={() => handleConvocar(crianca.id, crianca.nome)}
                                        className="text-green-600 focus:text-green-700"
                                      >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Convocar para matrícula
                                      </DropdownMenuItem>
                                    );
                                  })()}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleAction("desistente", crianca.id, crianca.nome)}
                                    className="text-orange-600 focus:text-orange-700"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Marcar como desistente
                                  </DropdownMenuItem>
                                </>
                              )}
                              {crianca.status === "Aguardando Documentação" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDocumentosDialog({
                                      open: true,
                                      criancaId: crianca.id,
                                      criancaNome: crianca.nome,
                                    })}
                                    className="text-purple-600 focus:text-purple-700"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Gerenciar documentos
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => enviarLembreteMutation.mutate({ id: crianca.id, tipo: 'lembrete' })}
                                    className="text-amber-600 focus:text-amber-700"
                                  >
                                    <Bell className="mr-2 h-4 w-4" />
                                    Enviar lembrete de prazo
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleAction("desistente", crianca.id, crianca.nome)}
                                    className="text-orange-600 focus:text-orange-700"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Marcar como desistente
                                  </DropdownMenuItem>
                                </>
                              )}
                              {/* Ações para crianças MATRICULADAS com remanejamento solicitado */}
                              {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && crianca.cmei_remanejamento_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => confirmarMatriculaMutation.mutate(crianca.id)}
                                    className="text-green-600 focus:text-green-700"
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Concluir transferência
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => cancelarRemanejamentoMutation.mutate(crianca.id)}
                                    className="text-orange-600 focus:text-orange-700"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancelar remanejamento
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(crianca.status === "Desistente" || crianca.status === "Recusada") && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setReativarDialog({
                                      open: true,
                                      criancaId: crianca.id,
                                      criancaNome: crianca.nome,
                                      statusAnterior: crianca.status,
                                    })}
                                    className="text-green-600 focus:text-green-700"
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Reativar (volta ao fim da fila)
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
              <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400 border rounded-lg bg-red-50/80 dark:bg-red-950/20">
                Linhas destacadas em vermelho referem-se a crianças com menos de 6 meses de idade.
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

        {/* Histórico da Fila de Espera */}
        <Collapsible open={historicoExpanded} onOpenChange={setHistoricoExpanded}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    <CardTitle>Histórico da Fila ({historicoFila?.length || 0})</CardTitle>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${historicoExpanded ? "rotate-180" : ""}`} />
                </div>
              <CardDescription>
                  Desistentes, recusados, fim de fila e matriculados que saíram da fila
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {historicoFila && historicoFila.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criança</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead className="text-center">Ação</TableHead>
                        <TableHead className="text-center">Status Atual</TableHead>
                        <TableHead className="text-center">Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historicoFila.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                                {item.crianca?.nome?.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?"}
                              </span>
                              <div className="flex min-w-0 flex-col leading-tight">
                                <span className="truncate font-medium">{item.crianca?.nome || "-"}</span>
                                {item.crianca?.data_nascimento && (
                                  <span className="mt-0.5 w-fit rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                    {calcularIdade(item.crianca.data_nascimento)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col leading-tight">
                              <span className="text-xs font-medium whitespace-normal break-words">{item.crianca?.responsavel_nome || "-"}</span>
                              {(item.crianca?.responsavel_telefone || item.crianca?.responsavel_celular) && (
                                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {item.crianca.responsavel_telefone || item.crianca.responsavel_celular}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={
                              item.acao === "Matrícula Confirmada" ? "success" :
                              item.acao === "Desistência" ? "warning" :
                              item.acao === "Recusada" ? "destructive" :
                              item.acao === "Fim de Fila" ? "warning" :
                              "secondary"
                            } className={cn("rounded-full", item.acao === "Matrícula Confirmada" ? "bg-green-100 text-green-700 border-green-300" : "")}>
                              {item.acao}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.crianca?.status ? (
                              <Badge 
                                variant={
                                  item.crianca.status === "Matriculado" || item.crianca.status === "Matriculada" ? "success" :
                                  item.crianca.status === "Desistente" || item.crianca.status === "Recusada" ? "destructive" :
                                  "secondary"
                                }
                                className={cn(
                                  "rounded-full",
                                  (item.crianca.status === "Matriculado" || item.crianca.status === "Matriculada") && "bg-green-100 text-green-700 border-green-300"
                                )}
                              >
                                {item.crianca.status}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/modulo/vagou/admin/criancas/${item.crianca_id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </Button>
                              {(item.crianca?.status === "Desistente" || item.crianca?.status === "Recusada") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReativarDialog({
                                    open: true,
                                    criancaId: item.crianca_id,
                                    criancaNome: item.crianca?.nome,
                                    statusAnterior: item.crianca?.status,
                                  })}
                                  disabled={reativarMutation.isPending}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Reativar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum histórico de movimentações na fila encontrado.
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

      </div>

      {/* Convocação Dialog */}
      <ConvocacaoDialog
        open={convocacaoDialog.open}
        onOpenChange={(open) => setConvocacaoDialog({ ...convocacaoDialog, open })}
        criancaId={convocacaoDialog.criancaId}
        criancaNome={convocacaoDialog.criancaNome}
      />

      {/* Action Dialog (Recusada, Desistente, Fim de Fila) */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "recusada" && "Marcar como Recusada"}
              {actionDialog.action === "desistente" && "Marcar como Desistente"}
              {actionDialog.action === "fim_fila" && "Marcar Fim de Fila"}
            </DialogTitle>
            <DialogDescription>
              Criança: {actionDialog.criancaNome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionDialog.action === "fim_fila" && fila?.find(c => c.id === actionDialog.criancaId)?.programas_sociais && (
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  <strong>⚠️ ATENÇÃO:</strong> Esta criança tem <strong>PRIORIDADE SOCIAL</strong>!
                  Ao marcar fim de fila, ela irá para o <strong>FINAL da fila</strong>,
                  perdendo temporariamente a prioridade até nova convocação.
                </AlertDescription>
              </Alert>
            )}
            <MotivoSelect
              tipo={(actionDialog.action === "recusada" ? "recusa" : actionDialog.action === "desistente" ? "desistencia" : "fim_fila") as TipoMotivo}
              value={justificativa}
              onChange={setJustificativa}
              label="Justificativa"
              placeholder="Descreva o motivo da ação..."
              required
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, action: null });
                setJustificativa("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarAction}
              disabled={!justificativa || statusActionMutation.isPending}
              variant="destructive"
            >
              {statusActionMutation.isPending && (
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reativar Dialog */}
      <Dialog open={reativarDialog.open} onOpenChange={(open) => setReativarDialog({ ...reativarDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reativar Criança</DialogTitle>
            <DialogDescription>
              Criança: {reativarDialog.criancaNome}
              <br />
              <span className="text-xs">A criança será colocada no fim da fila de espera.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="justificativa-reativar">Justificativa *</Label>
              <Textarea
                id="justificativa-reativar"
                value={justificativaReativar}
                onChange={(e) => setJustificativaReativar(e.target.value)}
                placeholder="Descreva o motivo da reativação..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReativarDialog({ open: false });
                setJustificativaReativar("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (reativarDialog.criancaId) {
                  reativarMutation.mutate({
                    id: reativarDialog.criancaId,
                    justificativa: justificativaReativar,
                    statusAnterior: reativarDialog.statusAnterior || "Desistente",
                  });
                }
              }}
              disabled={!justificativaReativar || reativarMutation.isPending}
            >
              {reativarMutation.isPending && (
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Reativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {documentosDialog.criancaId && (
        <DocumentosDialog
          open={documentosDialog.open}
          onOpenChange={(open) => setDocumentosDialog({ ...documentosDialog, open })}
          criancaId={documentosDialog.criancaId}
          criancaNome={documentosDialog.criancaNome || ""}
          modoFilaEspera
        />
      )}
    </AdminLayout>
  );
};

export default FilaEspera;
