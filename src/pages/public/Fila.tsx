import { PublicLayout } from "@/components/layout/PublicLayout";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Users, CheckCircle2, ArrowRightLeft, UserPlus, UsersRound, History, ChevronDown, X, Columns3, Calendar, Phone, Clock, Star, RotateCcw } from "lucide-react";
import { useConfiguracoes, useFilaPublica, useCMEIs } from "@/hooks/api/supabase-hooks";
import { useTurnoInteresseLote } from "@/hooks/api/campos-inscricao-hooks";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/utils/utils";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { calcularIdadeCompleta, calcularIdadeEmMeses } from "@/utils/turma-utils";
import { TooltipHelper } from "@/components/ui/tooltip-helper";
import { buildScoreTooltip, compareFilaItems, getScoreForCmei, getScoreGlobal } from "@/utils/fila-score";
import SexoIcon from "@/components/common/SexoIcon";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableColumnLayoutDef, useColumnResizer, useTableColumnLayout } from "@/hooks/use-table-column-layout";

type FilaPublicaItem = {
  id: string;
  nome: string;
  data_nascimento: string;
  sexo: string;
  status: string;
  posicao_fila: number | null;
  posicao_fila_cmei2?: number | null;
  posicao_fila_cmei3?: number | null;
  prioridade: string | null;
  programas_sociais: boolean | null;
  pontos_base_fila?: number | null;
  pontos_prioridades?: number | null;
  pontos_programas_sociais?: number | null;
  pontos_remanejamento?: number | null;
  pontos_data_cadastro?: number | null;
  bonus_zona_cmei1?: number | null;
  bonus_zona_cmei2?: number | null;
  bonus_zona_cmei3?: number | null;
  score_cmei1?: number | null;
  score_cmei2?: number | null;
  score_cmei3?: number | null;
  created_at: string | null;
  data_retorno_fila?: string | null;
  cmei1_preferencia?: string | null;
  cmei2_preferencia?: string | null;
  cmei3_preferencia?: string | null;
  cmei1_nome: string | null;
  cmei2_nome: string | null;
  cmei3_nome?: string | null;
  responsavel_nome: string | null;
  convocacao_deadline: string | null;
  cmei_remanejamento_id: string | null;
  cmei_remanejamento_nome: string | null;
  periodo: string | null;
  crianca_prioridades?: Array<{
    status?: "pendente" | "aprovado" | "recusado" | string | null;
    prioridade?: { id?: string; nome?: string; codigo?: string; peso?: number | null } | null;
  }> | null;
};

type HistoricoFilaPublicoRpcRow = {
  id: string;
  acao: string;
  created_at: string;
  crianca_nome: string | null;
  crianca_status: string | null;
  crianca_data_nascimento: string | null;
};

type HistoricoFilaItem = {
  id: string;
  acao: string;
  created_at: string;
  crianca: {
    nome: string | null;
    status: string | null;
    data_nascimento: string | null;
  };
};

// Função para ocultar nome do histórico (que não vem do RPC)
const ocultarNomeHistorico = (nome: string) => {
  if (!nome) return "-";
  const partes = nome.trim().split(" ");
  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase() + "***";
  }
  const primeiro = partes[0].charAt(0).toUpperCase() + "***";
  const ultimo = partes[partes.length - 1].charAt(0).toUpperCase() + "***";
  return `${primeiro} ${ultimo}`;
};

const Fila = () => {
  const [cmeiFilter, setCmeiFilter] = useState<string>("");
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [historicoExpanded, setHistoricoExpanded] = useState(false);
  
  const { data: config } = useConfiguracoes();
  const { plural } = getUnidadeLabels(config as any);
  const { data: cmeis } = useCMEIs();
  const preferenciasCmeiQtd = (config as any)?.preferencias_cmei_qtd ?? 2;
  const comprovacaoNaInscricao = (config as any)?.prioridades_comprovacao_na_inscricao ?? true;

  // Stats públicos usando dados do RPC (sem filtros para mostrar totais gerais)
  const { data: filaCompleta, isLoading: loadingStats, dataUpdatedAt: statsUpdatedAt } = useQuery({
    queryKey: ["fila-publica-stats"],
    queryFn: async () => {
      // Timeout para evitar travamento no iOS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const { data, error } = await supabase.rpc('get_fila_publica');
        clearTimeout(timeoutId);
        if (error) throw error;
        return data || [];
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    },
    staleTime: 60000, // Cache por 1 minuto
    gcTime: 300000, // Manter em cache por 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'always', // Forçar fetch mesmo se parece offline (iOS bug)
  });

  // Calcular stats a partir dos dados completos (mesmos do admin)
  const filaCompletaList = (filaCompleta as FilaPublicaItem[] | undefined) || [];
  const statsCalculados = {
    totalFila: filaCompletaList.filter((c) => c.status === "Fila de Espera").length,
    remanejamentos: filaCompletaList.filter((c) => !!c.cmei_remanejamento_id).length,
    comPrioridade: filaCompletaList.filter((c) => (c.pontos_prioridades || 0) > 0 && !c.cmei_remanejamento_id).length,
    convocados: filaCompletaList.filter((c) => c.status === "Convocado").length,
  };

  // Histórico público (ações na fila) - Usa RPC SECURITY DEFINER
  const { data: historicoFila } = useQuery<HistoricoFilaItem[]>({
    queryKey: ["historico-fila-publico"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_historico_fila_publico');

      if (error) {
        console.error("Erro ao buscar histórico:", error);
        return [];
      }
      
      const rows = (data as HistoricoFilaPublicoRpcRow[] | null) || [];
      return rows.map((item) => ({
        id: item.id,
        acao: item.acao,
        created_at: item.created_at,
        crianca: {
          nome: item.crianca_nome,
          status: item.crianca_status,
          data_nascimento: item.crianca_data_nascimento,
        },
      }));
    },
    staleTime: 60000, // Cache por 1 minuto
    gcTime: 300000, // Manter em cache por 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'always', // Forçar fetch mesmo se parece offline (iOS bug)
  });
  
  const calcularIdade = (dataNascimento: string) => {
    return {
      texto: calcularIdadeCompleta(dataNascimento),
      meses: calcularIdadeEmMeses(dataNascimento),
    };
  };

  // Filtrar dados localmente a partir da lista completa (sem paginação)
  const filaList = filaCompletaList;
  const filaFiltrada = filaList.filter((crianca) => {
    if (cmeiFilter) {
      const matchPreferencia =
        crianca.cmei1_preferencia === cmeiFilter ||
        crianca.cmei2_preferencia === cmeiFilter ||
        crianca.cmei3_preferencia === cmeiFilter ||
        crianca.cmei_remanejamento_id === cmeiFilter;
      if (!matchPreferencia) return false;
    }

    // Filtro por prioridade
    if (prioridadeFilter !== "all") {
      if (prioridadeFilter === "Prioridade" && (crianca.pontos_prioridades || 0) === 0) return false;
      if (prioridadeFilter === "Geral" && (crianca.pontos_prioridades || 0) > 0) return false;
    }
    
    // Filtro por status
    if (statusFilter !== "all" && crianca.status !== statusFilter) return false;
    
    return true;
  });

  const filaOrdenada = useMemo(() => {
    const getPosicaoParaCmei = (row: FilaPublicaItem) => {
      if (cmeiFilter && row.cmei_remanejamento_id === cmeiFilter) return -1;
      if (cmeiFilter && row.cmei1_preferencia === cmeiFilter) return row.posicao_fila ?? null;
      if (cmeiFilter && row.cmei2_preferencia === cmeiFilter) return row.posicao_fila_cmei2 ?? null;
      if (cmeiFilter && row.cmei3_preferencia === cmeiFilter) return row.posicao_fila_cmei3 ?? null;
      return row.posicao_fila ?? row.posicao_fila_cmei2 ?? row.posicao_fila_cmei3 ?? null;
    };

    return [...filaFiltrada].sort((a, b) => {
      if (!cmeiFilter) return compareFilaItems(a as any, b as any);

      const aConvocado = a.status === "Convocado" ? 1 : 0;
      const bConvocado = b.status === "Convocado" ? 1 : 0;
      if (aConvocado !== bConvocado) return bConvocado - aConvocado;

      const aRemanejamento = a.cmei_remanejamento_id ? 1 : 0;
      const bRemanejamento = b.cmei_remanejamento_id ? 1 : 0;
      if (aRemanejamento !== bRemanejamento) return bRemanejamento - aRemanejamento;

      const posA = getPosicaoParaCmei(a) ?? 999999;
      const posB = getPosicaoParaCmei(b) ?? 999999;
      if (posA !== posB) return posA - posB;

      const dataA = new Date(a.created_at || 0).getTime();
      const dataB = new Date(b.created_at || 0).getTime();
      return dataA - dataB;
    });
  }, [filaFiltrada, cmeiFilter]);

  const filaIds = useMemo(() => filaOrdenada.map((crianca) => crianca.id), [filaOrdenada]);
  const { data: turnoInteresse = {} } = useTurnoInteresseLote(filaIds);

  const posicaoMap = useMemo(() => {
    const map = new Map<string, number>();
    let pos = 0;

    filaOrdenada.forEach((crianca) => {
      const isConvocado =
        crianca.status === "Convocado" ||
        crianca.status === "Aguardando Documentação" ||
        crianca.status === "Aguardando Assinatura";
      const isRemanejamento = !!crianca.cmei_remanejamento_id;
      if (!isConvocado && !isRemanejamento && crianca.status === "Fila de Espera") {
        pos += 1;
        map.set(crianca.id, pos);
      }
    });

    return map;
  }, [filaOrdenada]);


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Convocado":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Convocado</Badge>;
      case "Fila de Espera":
        return <Badge variant="secondary">Fila de Espera</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleClearFilters = () => {
    setCmeiFilter("");
    setPrioridadeFilter("all");
    setStatusFilter("all");
  };

  const columnDefs = useMemo<TableColumnLayoutDef[]>(
    () => [
      { key: "posicao", label: "Posição", defaultWidth: 78, minWidth: 64, maxWidth: 140, hideable: false },
      { key: "crianca", label: "Criança", defaultWidth: 220, minWidth: 140, maxWidth: 520 },
      { key: "data_nasc", label: "Data Nasc.", defaultWidth: 140, minWidth: 120, maxWidth: 240 },
      { key: "sexo", label: "Sexo", defaultWidth: 64, minWidth: 56, maxWidth: 96 },
      { key: "periodo", label: "Período", defaultWidth: 110, minWidth: 90, maxWidth: 200, defaultHidden: true },
      { key: "preferencias", label: "Preferências", defaultWidth: 260, minWidth: 180, maxWidth: 560 },
      { key: "responsavel", label: "Responsável", defaultWidth: 200, minWidth: 140, maxWidth: 520 },
      { key: "tempo", label: "Tempo na Fila", defaultWidth: 140, minWidth: 120, maxWidth: 260 },
      { key: "prioridade", label: "Prioridade", defaultWidth: 150, minWidth: 120, maxWidth: 260 },
      { key: "pontuacao", label: "Pontuação", defaultWidth: 110, minWidth: 90, maxWidth: 180 },
      { key: "status", label: "Status/Prazo", defaultWidth: 170, minWidth: 140, maxWidth: 280 },
    ],
    [],
  );

  const { columns, visibleColumns, setColumnHidden, setColumnWidth, resetLayout } = useTableColumnLayout(
    "fila-publica",
    columnDefs,
  );

  const columnsByKey = useMemo(() => Object.fromEntries(columns.map((c) => [c.key, c])), [columns]);

  const { startResize } = useColumnResizer({
    getWidth: (key) => columnsByKey[key]?.width,
    getMinWidth: (key) => columnsByKey[key]?.minWidth,
    getMaxWidth: (key) => columnsByKey[key]?.maxWidth,
    setWidth: setColumnWidth,
  });

  const hasFilters = cmeiFilter || prioridadeFilter !== "all" || statusFilter !== "all";

  const lastUpdatedAt = statsUpdatedAt ? new Date(statsUpdatedAt) : null;

  return (
    <PublicLayout>
      <div className="govbr-section bg-muted/30 dark:bg-muted/10">
        <div className="govbr-container">
          <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Fila de Espera</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Acompanhe a fila de espera para vagas em {plural}
              </p>
            </div>
            {lastUpdatedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full w-fit border border-muted-foreground/10 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Atualizado às {format(lastUpdatedAt, "HH:mm:ss", { locale: ptBR })}
              </div>
            )}
          </div>

          {/* Stats */}
          {loadingStats ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Spinner className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total na Fila</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsCalculados.totalFila}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Remanejamento</CardTitle>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsCalculados.remanejamentos}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Com Prioridade</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(statsCalculados as any).comPrioridade}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Convocadas</CardTitle>
                  <UsersRound className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsCalculados.convocados}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Table */}
          <Card>
            <CardHeader>
              <CardTitle>Listagem da Fila</CardTitle>
              <CardDescription>
                Ordenada por prioridade e posição na fila
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-3 md:flex-row">
                <Select value={cmeiFilter || "all"} onValueChange={(v) => { setCmeiFilter(v === "all" ? "" : v); }}>
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

                <Select value={prioridadeFilter} onValueChange={(v) => { setPrioridadeFilter(v); }}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as prioridades</SelectItem>
                    <SelectItem value="Prioridade">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500"></div>
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

                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); }}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="Fila de Espera">Fila de Espera</SelectItem>
                    <SelectItem value="Convocado">Convocado</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                      <Columns3 className="mr-2 h-4 w-4" />
                      Colunas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {columns
                      .filter((c) => c.hideable !== false)
                      .map((c) => (
                        <DropdownMenuCheckboxItem
                          key={c.key}
                          checked={!c.hidden}
                          onCheckedChange={(checked) => {
                            const visibleCount = visibleColumns.length;
                            if (!checked && visibleCount <= 2) return;
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

                {hasFilters && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Table */}
              {loadingStats ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <Spinner className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : !filaFiltrada || filaFiltrada.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <CheckCircle2 className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
                  <div className="max-w-2xl text-lg font-semibold text-foreground">
                    Atualmente não há fila de espera por vagas em {plural} em nosso município.
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Todas as crianças cadastradas estão atendidas no momento.
                  </div>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden overflow-x-auto [&_table]:text-xs [&_th]:h-8 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_td]:align-middle [&_td]:leading-tight">
                    <Table className="table-fixed">
                      <colgroup>
                        {visibleColumns.map((c) => (
                          <col key={c.key} style={c.width ? { width: `${c.width}px` } : undefined} />
                        ))}
                      </colgroup>
                      <TableHeader>
                        <TableRow>
                          {visibleColumns.map((c) => (
                            <TableHead
                              key={c.key}
                              className={cn(
                                "relative select-none whitespace-nowrap",
                                c.key === "posicao" && "sticky left-0 z-20 bg-background",
                                c.key === "sexo" && "text-center",
                                c.key === "pontuacao" && "text-center",
                              )}
                              style={c.width ? { width: `${c.width}px` } : undefined}
                            >
                              <div className="px-3 text-center">{c.label}</div>
                              {c.resizable !== false && (
                                <div
                                  className={cn(
                                    "absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none",
                                    c.key === "posicao" && "z-30",
                                  )}
                                  onPointerDown={(e) => startResize(e, c.key)}
                                >
                                  <div className="mx-auto h-full w-px bg-border opacity-60" />
                                </div>
                              )}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filaOrdenada.map((crianca) => {
                          const isConvocado =
                            crianca.status === "Convocado" ||
                            crianca.status === "Aguardando Documentação" ||
                            crianca.status === "Aguardando Assinatura";
                          const temRemanejamento = !!crianca.cmei_remanejamento_id;
                          const posicao = posicaoMap.get(crianca.id);
                          
                          // Calcular idade
                          const idade = calcularIdade(crianca.data_nascimento);
                          const menorDe6Meses = idade.meses < 6;
                          
                          // Calcular tempo na fila
                          const diasNaFila = crianca.created_at 
                            ? differenceInDays(new Date(), new Date(crianca.created_at))
                            : 0;
                          const dataCadastro = crianca.created_at
                            ? format(new Date(crianca.created_at), "dd/MM/yyyy - HH:mm", { locale: ptBR })
                            : null;
                          

                          
                          return (
                            <TableRow
                              key={crianca.id}
                              className={cn(
                                menorDe6Meses &&
                                  "[&>td]:bg-red-200/70 hover:[&>td]:bg-red-200/80 dark:[&>td]:bg-red-900/70 dark:hover:[&>td]:bg-red-900/80"
                              )}
                            >
                              {visibleColumns.map((c) => {
                                switch (c.key) {
                                  case "posicao":
                                    return (
                                      <TableCell key={c.key} className={cn("sticky left-0 z-10", menorDe6Meses ? "bg-red-200/70 dark:bg-red-900/70" : "bg-background")}>
                                        {temRemanejamento ? (
                                          <TooltipHelper content="Solicitação de remanejamento - prioridade máxima">
                                            <div className="w-8 h-8 rounded-md bg-purple-600 text-white flex items-center justify-center">
                                              <ArrowRightLeft className="h-4 w-4" />
                                            </div>
                                          </TooltipHelper>
                                        ) : isConvocado ? (
                                          <Badge
                                            className="rounded-md w-8 h-8 flex items-center justify-center text-[11px] border-0 bg-amber-400 text-amber-950 hover:bg-amber-400"
                                          >
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
                                    );
                                  case "crianca":
                                    return (
                                      <TableCell key={c.key} className="font-medium">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                                            {crianca.nome?.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?"}
                                          </span>
                                          <div className="flex min-w-0 flex-col leading-tight">
                                            <span className="truncate font-medium">{crianca.nome}</span>
                                            {temRemanejamento && (
                                              <Badge
                                                variant="outline"
                                                className="mt-0.5 w-fit text-[10px] px-1 py-0 border-blue-500 text-blue-600 dark:text-blue-400"
                                              >
                                                <ArrowRightLeft className="h-2.5 w-2.5 mr-0.5" />
                                                Rem.
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </TableCell>
                                    );
                                  case "data_nasc":
                                    return (
                                      <TableCell key={c.key} className="text-center">
                                        <div className="flex flex-col items-center leading-tight">
                                          <span className="inline-flex items-center gap-1.5 text-sm">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            {crianca.data_nascimento
                                              ? format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })
                                              : "-"}
                                          </span>
                                          <span className="mt-0.5 w-fit rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                            {idade.texto}
                                          </span>
                                        </div>
                                      </TableCell>
                                    );
                                  case "sexo":
                                    return (
                                      <TableCell key={c.key} className="text-center">
                                        <SexoIcon sexo={crianca.sexo} />
                                      </TableCell>
                                    );
                                  case "periodo":
                                    return (
                                      <TableCell key={c.key} className="text-center">
                                        {(() => {
                                          const turno = turnoInteresse[crianca.id] || crianca.periodo;
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
                                    );
                                  case "preferencias":
                                    return (
                                      <TableCell key={c.key} className="max-w-[260px]">
                                        <div className="flex flex-col gap-1">
                                          {[
                                            { n: 1, nome: crianca.cmei1_nome },
                                            { n: 2, nome: crianca.cmei2_nome },
                                            ...(preferenciasCmeiQtd === 3 ? [{ n: 3, nome: crianca.cmei3_nome }] : []),
                                          ].map(({ n, nome }) => (
                                            <div key={n} className="flex items-center gap-2">
                                              <span className={cn(
                                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                                                n === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                                          {crianca.cmei_remanejamento_nome && (
                                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                              Remanejamento: {crianca.cmei_remanejamento_nome}
                                            </span>
                                          )}
                                        </div>
                                      </TableCell>
                                    );
                                  case "responsavel":
                                    return (
                                      <TableCell key={c.key}>
                                        <span className="text-xs font-medium whitespace-normal break-words">{crianca.responsavel_nome || "N/I"}</span>
                                      </TableCell>
                                    );
                                  case "tempo":
                                    return (
                                      <TableCell key={c.key}>
                                        {(() => {
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
                                              <span className="text-xs text-muted-foreground">{dataCadastro || "-"}</span>
                                              <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", pillClass)}>
                                                <Clock className="h-3 w-3" />
                                                {diasNaFila} dia{diasNaFila !== 1 ? "s" : ""} na fila
                                              </span>
                                            </div>
                                          );
                                        })()}
                                      </TableCell>
                                    );
                                  case "prioridade":
                                    return (
                                      <TableCell key={c.key} className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                          {(crianca.pontos_prioridades || 0) > 0 ? (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                              Sim
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary">Não</Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                    );
                                  case "pontuacao":
                                    return (
                                      <TableCell key={c.key} className="text-center">
                                        {(() => {
                                          const cmeiId = cmeiFilter?.trim() ? cmeiFilter : undefined;
                                          const score = cmeiId
                                            ? getScoreForCmei(crianca as any, cmeiId)
                                            : getScoreGlobal(crianca as any);
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
                                    );
                                  case "status":
                                    return (
                                      <TableCell key={c.key}>
                                        <div className="flex flex-col gap-1">
                                          {getStatusBadge(crianca.status)}
                                          {isConvocado && crianca.convocacao_deadline && (
                                            <span className="text-xs text-muted-foreground">
                                              Prazo: {format(new Date(crianca.convocacao_deadline), "dd/MM/yyyy", { locale: ptBR })}
                                            </span>
                                          )}
                                        </div>
                                      </TableCell>
                                    );
                                  default:
                                    return <TableCell key={c.key}>-</TableCell>;
                                }
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400 border-t bg-red-50/80 dark:bg-red-950/20">
                    Linhas destacadas em vermelho referem-se a crianças com menos de 6 meses de idade.
                  </div>

                  {/* Paginação removida na página pública: exibe a lista completa */}
                </>
              )}
            </CardContent>
          </Card>

          {/* Histórico da Fila */}
          <div className="mt-6">
            <Collapsible open={historicoExpanded} onOpenChange={setHistoricoExpanded}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        <CardTitle className="text-lg">Histórico de Movimentações ({historicoFila?.length || 0})</CardTitle>
                      </div>
                      <ChevronDown className={cn("h-5 w-5 transition-transform", historicoExpanded && "rotate-180")} />
                    </div>
                    <CardDescription>
                      Desistências, recusas e matrículas confirmadas
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {historicoFila && historicoFila.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden overflow-x-auto [&_table]:text-xs [&_th]:h-8 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_td]:align-middle [&_td]:leading-tight">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Criança</TableHead>
                              <TableHead className="text-center">Ação</TableHead>
                              <TableHead className="hidden text-center sm:table-cell">Status Atual</TableHead>
                              <TableHead className="text-center">Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historicoFila.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                                      {ocultarNomeHistorico(item.crianca?.nome)?.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?"}
                                    </span>
                                    <div className="flex min-w-0 flex-col leading-tight">
                                      <span className="truncate font-medium">{ocultarNomeHistorico(item.crianca?.nome)}</span>
                                      {item.crianca?.data_nascimento && (
                                        <span className="mt-0.5 w-fit rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                          {calcularIdade(item.crianca.data_nascimento).texto}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {(() => {
                                    const acaoCfg: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
                                      "Matrícula Confirmada": { icon: CheckCircle2, cls: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
                                      "Desistência": { icon: X, cls: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
                                      "Recusada": { icon: X, cls: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
                                    };
                                    const cfg = acaoCfg[item.acao] ?? { icon: RotateCcw, cls: "bg-muted text-muted-foreground border-border" };
                                    const Icon = cfg.icon;
                                    return (
                                      <Badge variant="outline" className={cn("gap-1 rounded-full font-medium", cfg.cls)}>
                                        <Icon className="h-3 w-3" />
                                        {item.acao}
                                      </Badge>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="hidden text-center sm:table-cell">
                                  {item.crianca?.status ? (
                                    <Badge 
                                      variant="outline"
                                      className={cn(
                                        "rounded-full",
                                        (item.crianca.status === "Matriculado" || item.crianca.status === "Matriculada") && 
                                        "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
                                      )}
                                    >
                                      {item.crianca.status}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="inline-flex flex-col items-center leading-tight">
                                    <span className="inline-flex items-center gap-1 font-medium">
                                      <Calendar className="h-3 w-3 text-muted-foreground" />
                                      {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(item.created_at), "HH:mm", { locale: ptBR })}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum histórico de movimentações encontrado.
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Fila;
