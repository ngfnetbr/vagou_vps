import { useState, useEffect, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import { Users, CheckCircle2, ChevronLeft, ChevronRight, ArrowRightLeft, UserPlus, UsersRound, History, ChevronDown, X, Star, Columns3 } from "lucide-react";
import { useConfiguracoes, useCMEIs } from "@/hooks/api/supabase-hooks";
import { useMinhasCriancas } from "@/hooks/api/responsavel-hooks";
import { useTurnoInteresseLote } from "@/hooks/api/campos-inscricao-hooks";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/utils";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import SexoIcon from "@/components/common/SexoIcon";
import { buildVisibleFilaPositionMap, compareFilaItems } from "@/utils/fila-score";
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
  pontos_prioridades?: number | null;
  created_at: string | null;
  cmei1_nome: string | null;
  cmei2_nome: string | null;
  cmei3_nome?: string | null;
  cmei1_preferencia?: string | null;
  cmei2_preferencia?: string | null;
  cmei3_preferencia?: string | null;
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

// Função para ocultar nome do histórico
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

const FilaEspera = () => {
  const [cmeiFilter, setCmeiFilter] = useState<string>("");
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [historicoExpanded, setHistoricoExpanded] = useState(false);
  const pageSize = 25;
  
  const queryClient = useQueryClient();
  const { data: config } = useConfiguracoes();
  const { plural } = getUnidadeLabels(config as any);
  const { data: cmeis } = useCMEIs();
  const { data: minhasCriancas, isLoading: loadingMinhas } = useMinhasCriancas();
  const preferenciasCmeiQtd = (config as any)?.preferencias_cmei_qtd ?? 2;

  // Stats públicos usando dados do RPC
  const { data: filaCompleta, isLoading: loadingStats, dataUpdatedAt: statsUpdatedAt } = useQuery({
    queryKey: ["fila-publica-stats"],
    queryFn: async () => {
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
    staleTime: 60000,
    gcTime: 300000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'always',
  });

  // Histórico público
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
    staleTime: 60000,
    gcTime: 300000,
    retry: 3,
  });

  // IDs das minhas crianças
  const minhasCriancasIds = useMemo(() => 
    minhasCriancas?.map(c => c.id) || [], 
    [minhasCriancas]
  );

  // Minhas crianças na fila
  const minhasCriancasNaFila = useMemo(() => 
    minhasCriancas?.filter(c => 
      c.status === "Fila de Espera" || c.status === "Convocado"
    ) || [],
    [minhasCriancas]
  );

  // Stats calculados
  const filaCompletaList = (filaCompleta as FilaPublicaItem[] | undefined) || [];
  const statsCalculados = {
    totalFila: filaCompletaList.filter((c) => c.status === "Fila de Espera").length,
    remanejamentos: filaCompletaList.filter((c) => !!c.cmei_remanejamento_id).length,
    comPrioridade: filaCompletaList.filter((c) => (c.pontos_prioridades || 0) > 0 && !c.cmei_remanejamento_id).length,
    convocados: filaCompletaList.filter((c) => c.status === "Convocado").length,
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('fila-realtime-resp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'criancas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['fila-publica'] });
        queryClient.invalidateQueries({ queryKey: ['fila-publica-stats'] });
        queryClient.invalidateQueries({ queryKey: ['minhas-criancas'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
  
  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    
    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();
    
    if (meses < 0) {
      anos--;
      meses += 12;
    }
    
    const totalMeses = anos * 12 + meses;
    
    if (anos === 0) {
      return { texto: `${meses}m`, meses: totalMeses };
    } else if (anos === 1 && meses === 0) {
      return { texto: "1a", meses: totalMeses };
    } else if (anos >= 1) {
      return { texto: `${anos}a${meses > 0 ? `${meses}m` : ''}`, meses: totalMeses };
    }
    return { texto: `${meses}m`, meses: totalMeses };
  };

  // Filtrar dados localmente a partir da lista completa para manter a mesma posição do admin/público
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

    if (prioridadeFilter !== "all") {
      if (prioridadeFilter === "Prioridade" && (crianca.pontos_prioridades || 0) === 0) return false;
      if (prioridadeFilter === "Geral" && (crianca.pontos_prioridades || 0) > 0) return false;
    }
    if (statusFilter !== "all" && crianca.status !== statusFilter) return false;
    return true;
  });

  const filaOrdenada = useMemo(() => {
    return [...filaFiltrada].sort((a, b) => {
      if (!cmeiFilter) return compareFilaItems(a, b);
      return compareFilaItems(a, b, cmeiFilter);
    });
  }, [filaFiltrada, cmeiFilter]);

  const posicaoMap = useMemo(
    () => buildVisibleFilaPositionMap(filaOrdenada, cmeiFilter || undefined),
    [filaOrdenada, cmeiFilter],
  );

  const totalCount = filaOrdenada.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedFila = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filaOrdenada.slice(from, from + pageSize);
  }, [currentPage, filaOrdenada, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filaIds = useMemo(() => paginatedFila.map((crianca) => crianca.id), [paginatedFila]);
  const { data: turnoInteresse = {} } = useTurnoInteresseLote(filaIds);

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
    setPage(1);
  };

  const hasFilters = cmeiFilter || prioridadeFilter !== "all" || statusFilter !== "all";

  const lastUpdatedAt = statsUpdatedAt ? new Date(statsUpdatedAt) : null;

  const columnDefs = useMemo<TableColumnLayoutDef[]>(
    () => [
      { key: "posicao", label: "Posição", defaultWidth: 78, minWidth: 64, maxWidth: 140, hideable: false },
      { key: "crianca", label: "Criança", defaultWidth: 240, minWidth: 160, maxWidth: 560, hideable: false },
      { key: "data_nasc", label: "Data Nasc.", defaultWidth: 140, minWidth: 120, maxWidth: 240 },
      { key: "sexo", label: "Sexo", defaultWidth: 64, minWidth: 56, maxWidth: 96 },
      { key: "periodo", label: "Período", defaultWidth: 110, minWidth: 90, maxWidth: 200 },
      { key: "preferencias", label: "Preferências", defaultWidth: 260, minWidth: 180, maxWidth: 560 },
      { key: "responsavel", label: "Responsável", defaultWidth: 200, minWidth: 140, maxWidth: 520 },
      { key: "tempo", label: "Tempo na Fila", defaultWidth: 140, minWidth: 120, maxWidth: 260 },
      { key: "prioridade", label: "Prioridade", defaultWidth: 150, minWidth: 120, maxWidth: 260 },
      { key: "status", label: "Status/Prazo", defaultWidth: 170, minWidth: 140, maxWidth: 280 },
    ],
    [],
  );

  const { columns, visibleColumns, setColumnHidden, setColumnWidth, resetLayout } = useTableColumnLayout(
    "fila-responsavel",
    columnDefs,
  );

  const columnsByKey = useMemo(() => Object.fromEntries(columns.map((c) => [c.key, c])), [columns]);

  const { startResize } = useColumnResizer({
    getWidth: (key) => columnsByKey[key]?.width,
    getMinWidth: (key) => columnsByKey[key]?.minWidth,
    getMaxWidth: (key) => columnsByKey[key]?.maxWidth,
    setWidth: setColumnWidth,
  });

  return (
    <ResponsavelLayout>
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

          {/* Minhas Crianças na Fila - Destaque */}
          {minhasCriancasNaFila.length > 0 && (
            <Card className="mb-6 md:mb-8 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-primary text-lg">
                  <Star className="h-5 w-5 fill-primary" />
                  Suas Crianças na Fila
                </CardTitle>
                <CardDescription>Posição atualizada em tempo real</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {minhasCriancasNaFila.map((crianca) => (
                    <div 
                      key={crianca.id}
                      className="flex items-center gap-4 p-4 bg-background rounded-lg border border-primary/20"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {crianca.status === "Convocado" ? "✓" : (posicaoMap.get(crianca.id) ?? "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{crianca.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {crianca.status === "Convocado" ? (
                            <span className="text-green-600 font-medium">Convocado!</span>
                          ) : (
                            <>{crianca.prioridade} • {calcularIdade(crianca.data_nascimento).texto}</>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          {loadingStats ? (
            <div className="flex justify-center py-12">
              <Spinner className="w-8 h-8 animate-spin text-primary" />
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
                <Select value={cmeiFilter || "all"} onValueChange={(v) => { setCmeiFilter(v === "all" ? "" : v); setPage(1); }}>
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

                <Select value={prioridadeFilter} onValueChange={(v) => { setPrioridadeFilter(v); setPage(1); }}>
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

                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
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
              {loadingStats || loadingMinhas ? (
                <div className="flex justify-center py-12">
                  <Spinner className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !filaOrdenada || filaOrdenada.length === 0 ? (
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
                  <div className="border rounded-lg overflow-hidden overflow-x-auto [&_table]:text-xs [&_th]:h-9 [&_th]:px-2 [&_th]:py-1.5 [&_td]:p-2 [&_td]:align-top [&_td]:leading-tight">
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
                              )}
                              style={c.width ? { width: `${c.width}px` } : undefined}
                            >
                              <div className="pr-3">{c.label}</div>
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
                        {paginatedFila.map((crianca) => {
                          const isMinhaCrianca = minhasCriancasIds.includes(crianca.id);
                          const isConvocado = crianca.status === "Convocado";
                          const temRemanejamento = !!crianca.cmei_remanejamento_id;
                          const posicao = posicaoMap.get(crianca.id) ?? "?";
                          
                          // Calcular idade
                          const idade = calcularIdade(crianca.data_nascimento);
                          const menorDe6Meses = idade.meses < 6;
                          
                          // Calcular tempo na fila
                          const diasNaFila = crianca.created_at 
                            ? differenceInDays(new Date(), new Date(crianca.created_at))
                            : 0;
                          
                          return (
                            <TableRow 
                              key={crianca.id}
                              className={cn(
                                menorDe6Meses
                                  ? "bg-red-200/70 hover:bg-red-200/80 dark:bg-red-950/30 dark:hover:bg-red-950/40"
                                  : isMinhaCrianca && "bg-primary/10 hover:bg-primary/15"
                              )}
                            >
                              {visibleColumns.map((c) => {
                                switch (c.key) {
                                  case "posicao":
                                    return (
                                      <TableCell key={c.key} className="sticky left-0 z-10 bg-background">
                                        {isConvocado ? (
                                          <Badge
                                            variant="secondary"
                                            className="rounded-md w-8 h-8 flex items-center justify-center text-[11px]"
                                          >
                                            Conv.
                                          </Badge>
                                        ) : (
                                          <div
                                            className={cn(
                                              "w-8 h-8 rounded-md flex items-center justify-center font-bold text-[12px]",
                                              isMinhaCrianca
                                                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                                                : "bg-primary text-primary-foreground",
                                            )}
                                          >
                                            #{posicao}
                                          </div>
                                        )}
                                      </TableCell>
                                    );
                                  case "crianca":
                                    return (
                                      <TableCell key={c.key}>
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-2">
                                            {isMinhaCrianca && (
                                              <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
                                            )}
                                            <span className={cn("font-medium", isMinhaCrianca && "text-primary")}>
                                              {crianca.nome}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 flex-wrap">
                                            <span className="text-xs text-muted-foreground">{idade.texto}</span>
                                            {menorDe6Meses && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1 py-0 border-pink-500 text-pink-600 dark:text-pink-400"
                                              >
                                                &lt;6m
                                              </Badge>
                                            )}
                                            {temRemanejamento && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1 py-0 border-blue-500 text-blue-600 dark:text-blue-400"
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
                                      <TableCell key={c.key} className="text-xs text-muted-foreground">
                                        {crianca.data_nascimento
                                          ? format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })
                                          : "-"}
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
                                      <TableCell key={c.key} className="text-xs">
                                        {turnoInteresse[crianca.id] || crianca.periodo || "-"}
                                      </TableCell>
                                    );
                                  case "preferencias":
                                    return (
                                      <TableCell key={c.key}>
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs">{crianca.cmei1_nome || "-"}</span>
                                          <span className="text-xs text-muted-foreground">{crianca.cmei2_nome || "-"}</span>
                                          {preferenciasCmeiQtd === 3 && (
                                            <span className="text-xs text-muted-foreground">{crianca.cmei3_nome || "-"}</span>
                                          )}
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
                                        <span className="text-xs text-muted-foreground">{crianca.responsavel_nome || "N/I"}</span>
                                      </TableCell>
                                    );
                                  case "tempo":
                                    return (
                                      <TableCell key={c.key}>
                                        <div className="flex flex-col">
                                          <span
                                            className={cn(
                                              "text-xs",
                                              diasNaFila >= 180
                                                ? "text-red-600 font-semibold"
                                                : diasNaFila >= 90
                                                  ? "text-orange-600 font-medium"
                                                  : diasNaFila >= 30
                                                    ? "text-yellow-600"
                                                    : "",
                                            )}
                                          >
                                            {diasNaFila}d
                                          </span>
                                        </div>
                                      </TableCell>
                                    );
                                  case "prioridade":
                                    return (
                                      <TableCell key={c.key}>
                                        {(crianca.pontos_prioridades || 0) > 0 ? (
                                          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                                            Com prioridade
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-xs">
                                            Sem prioridade
                                          </Badge>
                                        )}
                                      </TableCell>
                                    );
                                  case "status":
                                    return (
                                      <TableCell key={c.key}>
                                        <div className="flex flex-col gap-1">
                                          {getStatusBadge(crianca.status)}
                                          {isConvocado && crianca.convocacao_deadline && (
                                            <span className="text-xs text-muted-foreground">
                                              Prazo:{" "}
                                              {format(new Date(crianca.convocacao_deadline), "dd/MM/yyyy", {
                                                locale: ptBR,
                                              })}
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

                  <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400 border rounded-lg bg-red-50/80 dark:bg-red-950/20">
                    Linhas destacadas em vermelho referem-se a crianças com menos de 6 meses de idade.
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages} ({totalCount} registros)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
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
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Criança</TableHead>
                              <TableHead>Ação</TableHead>
                              <TableHead className="hidden sm:table-cell">Status Atual</TableHead>
                              <TableHead>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historicoFila.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  <div className="flex flex-col">
                                    <span>{ocultarNomeHistorico(item.crianca?.nome)}</span>
                                    {item.crianca?.data_nascimento && (
                                      <span className="text-xs text-muted-foreground">
                                        ({calcularIdade(item.crianca.data_nascimento).texto})
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    item.acao === "Matrícula Confirmada" ? "default" :
                                    item.acao === "Desistência" ? "secondary" :
                                    item.acao === "Recusada" ? "destructive" :
                                    "outline"
                                  } className={cn(
                                    "text-xs",
                                    item.acao === "Matrícula Confirmada" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  )}>
                                    {item.acao}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  {item.crianca?.status ? (
                                    <Badge 
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
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
                                <TableCell className="text-sm text-muted-foreground">
                                  {format(new Date(item.created_at), "dd/MM/yyyy - HH:mm", { locale: ptBR })}
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
    </ResponsavelLayout>
  );
};

export default FilaEspera;
