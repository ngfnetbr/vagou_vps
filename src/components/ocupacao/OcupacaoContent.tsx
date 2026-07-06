import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Users, Building2, GraduationCap, TrendingUp, AlertCircle, CheckCircle2, Download, RotateCcw, Search, X } from "lucide-react";
import { useOcupacaoCMEIs, useOcupacaoTurmas } from "@/hooks/api/supabase-hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

type OcupacaoTurma = {
  id: string;
  nome: string;
  turma_base: string;
  turno: string | null;
  capacidade: number;
  ocupados: number;
  percentual: number;
  cmei_id: string | null;
  cmei_nome: string;
};

type OcupacaoCmei = {
  id: string;
  nome: string;
  capacidade_total: number;
  ocupados: number;
  endereco?: string | null;
  percentual: number;
};

export function OcupacaoContent() {
  const { data: config } = useConfiguracoesPublicas();
  const { singular, plural } = getUnidadeLabels(config as any);
  const {
    data: cmeis,
    isLoading: isLoadingCmeis,
    isFetching: isFetchingCmeis,
    refetch: refetchCmeis,
    dataUpdatedAt: cmeisUpdatedAt,
  } = useOcupacaoCMEIs();
  const {
    data: turmas,
    isLoading: isLoadingTurmas,
    isFetching: isFetchingTurmas,
    refetch: refetchTurmas,
    dataUpdatedAt: turmasUpdatedAt,
  } = useOcupacaoTurmas();
  const [filtroTurmaCmei, setFiltroTurmaCmei] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  const isLoading = isLoadingCmeis || isLoadingTurmas;

  const statusKey = (percentual: number) => {
    if (percentual >= 90) return "lotado";
    if (percentual >= 75) return "alta";
    return "disponivel";
  };

  const buscaNorm = busca.trim().toLowerCase();

  const cmeisList = (cmeis as OcupacaoCmei[] | undefined) || [];
  const turmasList = (turmas as OcupacaoTurma[] | undefined) || [];

  const turmasResumoPorCmei = turmasList.reduce((acc, turma) => {
    if (!turma.cmei_id) return acc;

    const atual = acc.get(turma.cmei_id) || { capacidade: 0, ocupados: 0 };
    atual.capacidade += turma.capacidade || 0;
    atual.ocupados += turma.ocupados || 0;
    acc.set(turma.cmei_id, atual);
    return acc;
  }, new Map<string, { capacidade: number; ocupados: number }>());

  const cmeisComMetricas = cmeisList.map((cmei) => {
    const resumoTurmas = turmasResumoPorCmei.get(cmei.id);
    const capacidadeFallback = resumoTurmas?.capacidade || 0;
    const ocupadosFallback = resumoTurmas?.ocupados || 0;
    const capacidade = cmei.capacidade_total > 0 ? cmei.capacidade_total : capacidadeFallback;
    const ocupados = cmei.capacidade_total > 0 ? cmei.ocupados : ocupadosFallback;
    const percentual = capacidade > 0 ? Math.round((ocupados / capacidade) * 100) : 0;

    return {
      ...cmei,
      capacidade_exibida: capacidade,
      ocupados_exibidos: ocupados,
      percentual_exibido: percentual,
    };
  });

  const cmeisFiltrados = cmeisComMetricas.filter((cmei) => {
    const matchBusca = !buscaNorm || cmei.nome.toLowerCase().includes(buscaNorm) || (cmei.endereco || "").toLowerCase().includes(buscaNorm);
    const matchStatus = filtroStatus === "todos" || statusKey(cmei.percentual_exibido) === filtroStatus;
    return matchBusca && matchStatus;
  });

  const turmasFiltradas = ((turmas as OcupacaoTurma[] | undefined)?.filter((turma) => {
    const matchCmei = filtroTurmaCmei === "todos" || turma.cmei_id === filtroTurmaCmei;
    const matchBusca = !buscaNorm || turma.nome.toLowerCase().includes(buscaNorm) || (turma.cmei_nome || "").toLowerCase().includes(buscaNorm);
    const matchStatus = filtroStatus === "todos" || statusKey(turma.percentual) === filtroStatus;
    return matchCmei && matchBusca && matchStatus;
  }) || []) as OcupacaoTurma[];

  const turmasPorCmei = turmasFiltradas.reduce((acc, turma) => {
    const cmeiId = turma.cmei_id || "sem-cmei";
    const cmeiNome = turma.cmei_nome || `Sem ${singular}`;
    const existing = acc.get(cmeiId);

    if (existing) {
      existing.turmas.push(turma);
      return acc;
    }

    acc.set(cmeiId, { cmeiId, cmeiNome, turmas: [turma] });
    return acc;
  }, new Map<string, { cmeiId: string; cmeiNome: string; turmas: OcupacaoTurma[] }>());

  const cmeiOrderIndex = new Map<string, number>();
  cmeisComMetricas.forEach((cmei, index) => {
    cmeiOrderIndex.set(cmei.id, index);
  });

  const turmasPorCmeiOrdenadas = Array.from(turmasPorCmei.values()).sort((a, b) => {
    const aIsSem = a.cmeiId === "sem-cmei";
    const bIsSem = b.cmeiId === "sem-cmei";
    if (aIsSem !== bIsSem) return aIsSem ? 1 : -1;

    const aIndex = cmeiOrderIndex.get(a.cmeiId) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = cmeiOrderIndex.get(b.cmeiId) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;

    return a.cmeiNome.localeCompare(b.cmeiNome, "pt-BR");
  });

  const filtrosAtivos = buscaNorm !== "" || filtroStatus !== "todos" || filtroTurmaCmei !== "todos";


  const getOcupacaoColor = (percentual: number) => {
    if (percentual >= 90) return "text-destructive";
    if (percentual >= 75) return "text-amber-500";
    return "text-emerald-600";
  };

  const getProgressColor = (percentual: number) => {
    if (percentual >= 90) return "[&>div]:bg-destructive";
    if (percentual >= 75) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-emerald-500";
  };

  const getStatusBadge = (percentual: number) => {
    if (percentual >= 90) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Lotado
        </Badge>
      );
    }
    if (percentual >= 75) {
      return (
        <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
          <TrendingUp className="w-3 h-3" />
          Alta
        </Badge>
      );
    }
    return (
      <Badge className="gap-1 bg-emerald-500 hover:bg-emerald-600">
        <CheckCircle2 className="w-3 h-3" />
        Disponível
      </Badge>
    );
  };

  const getTurmaStatusDescricao = (percentual: number) => {
    if (percentual >= 100) return "Capacidade máxima";
    if (percentual >= 90) return "Atingindo o limite";
    if (percentual >= 70) return "Ocupação moderada";
    if (percentual >= 40) return "Baixa ocupação";
    return "Alta disponibilidade";
  };

  const exportarTurmasCSV = () => {
    const headers = [
      singular,
      "Turma",
      "Modelo",
      "Turno",
      "Capacidade",
      "Ocupados",
      "Livres",
      "Ocupação (%)",
      "Status",
    ];

    const rows = turmasPorCmeiOrdenadas.flatMap((grupo) =>
      grupo.turmas.map((turma) => {
        const livres = turma.capacidade - turma.ocupados;
        return [
          grupo.cmeiNome,
          turma.nome,
          turma.turma_base,
          turma.turno || "",
          turma.capacidade,
          turma.ocupados,
          livres,
          turma.percentual,
          getTurmaStatusDescricao(turma.percentual),
        ];
      })
    );

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ocupacao_turmas_${format(new Date(), "yyyy-MM-dd_HHmm", { locale: ptBR })}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lastUpdatedAt = Math.max(cmeisUpdatedAt || 0, turmasUpdatedAt || 0);
  const isRefreshing = isFetchingCmeis || isFetchingTurmas;

  const totais = cmeisComMetricas.reduce(
    (acc, cmei) => ({
      capacidade: acc.capacidade + cmei.capacidade_exibida,
      ocupados: acc.ocupados + cmei.ocupados_exibidos,
      disponiveis: acc.disponiveis + (cmei.capacidade_exibida - cmei.ocupados_exibidos),
    }),
    { capacidade: 0, ocupados: 0, disponiveis: 0 }
  );

  const taxaOcupacao =
    totais.capacidade > 0 ? Math.round((totais.ocupados / totais.capacidade) * 100) : 0;

  return (
    <div className="bg-muted/40 min-h-[80vh]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:py-10 space-y-6 md:space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border bg-card shadow-sm text-center">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative p-6 md:p-10 flex flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5" />
              Transparência em tempo real
            </span>
            <h1 className="mt-4 text-2xl md:text-4xl font-bold tracking-tight">
              Ocupação de {plural}
            </h1>
            <p className="mt-2 max-w-xl text-sm md:text-base text-muted-foreground">
              Acompanhe a capacidade e a ocupação atual de cada {singular} e turma.
            </p>

            {!isLoading && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-primary">{taxaOcupacao}%</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Taxa de ocupação geral</div>
                </div>
                <div className="h-10 w-px bg-border hidden sm:block" />
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-foreground">{totais.disponiveis}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Vagas disponíveis</div>
                </div>
              </div>
            )}
          </div>
        </div>



        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Spinner className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dados de ocupação...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div className="rounded-2xl border bg-card p-4 md:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[11px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Capacidade
                  </span>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-primary">{totais.capacidade}</div>
              </div>
              <div className="rounded-2xl border bg-card p-4 md:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-[11px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Ocupadas
                  </span>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-emerald-600">{totais.ocupados}</div>
              </div>
              <div className="rounded-2xl border bg-card p-4 md:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-[11px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Disponíveis
                  </span>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-amber-600">{totais.disponiveis}</div>
              </div>
            </div>

            {/* Filtros */}
            <div className="rounded-2xl border bg-card p-3 md:p-4 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder={`Buscar ${singular} ou turma...`}
                    className="pl-9 rounded-full"
                  />
                </div>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-full md:w-56 rounded-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="alta">Alta ocupação</SelectItem>
                    <SelectItem value="lotado">Lotado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroTurmaCmei} onValueChange={setFiltroTurmaCmei}>
                  <SelectTrigger className="w-full md:w-60 rounded-full">
                    <SelectValue placeholder={`Filtrar por ${singular}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">{plural} (todas)</SelectItem>
                    {cmeisList.map((cmei) => (
                      <SelectItem key={cmei.id} value={cmei.id}>
                        {cmei.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RotateCcw className="w-3 h-3" />
                  Atualizado às {lastUpdatedAt ? format(new Date(lastUpdatedAt), "HH:mm", { locale: ptBR }) : "--:--"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {filtrosAtivos && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setBusca("");
                        setFiltroStatus("todos");
                        setFiltroTurmaCmei("todos");
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={async () => {
                      await Promise.all([refetchCmeis(), refetchTurmas()]);
                    }}
                    disabled={isRefreshing}
                  >
                    <RotateCcw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={exportarTurmasCSV} disabled={turmasFiltradas.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </div>


            <Tabs defaultValue="cmeis" className="space-y-4 md:space-y-6">
              <TabsList className="grid w-full max-w-sm grid-cols-2 mx-auto rounded-full p-1">
                <TabsTrigger value="cmeis" className="flex items-center gap-2 text-xs md:text-sm rounded-full">
                  <Building2 className="w-4 h-4" />
                  <span className="hidden xs:inline">Por</span> {singular}
                </TabsTrigger>
                <TabsTrigger value="turmas" className="flex items-center gap-2 text-xs md:text-sm rounded-full">
                  <GraduationCap className="w-4 h-4" />
                  <span className="hidden xs:inline">Por</span> Turma
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cmeis" className="space-y-4 md:space-y-6 mt-4">
                {!cmeis || cmeis.length === 0 ? (
                  <div className="rounded-2xl border bg-card flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Building2 className="w-12 h-12 mb-4 opacity-30" />
                    <p>Nenhuma {singular} cadastrada no momento.</p>
                  </div>
                ) : cmeisFiltrados.length === 0 ? (
                  <div className="rounded-2xl border bg-card flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mb-4 opacity-30" />
                    <p>Nenhuma {singular} encontrada com os filtros selecionados.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                    {cmeisFiltrados.map((cmei) => (
                      <div key={cmei.id} className="group rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-semibold truncate">{cmei.nome}</h3>
                            <p className="flex items-center gap-1.5 mt-1 text-xs md:text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{cmei.endereco || "Endereço não informado"}</span>
                            </p>
                          </div>
                          {getStatusBadge(cmei.percentual)}
                        </div>

                        <div className="flex justify-between text-xs md:text-sm mb-2">
                          <span className="text-muted-foreground">Ocupação</span>
                          <span className="font-semibold">
                            <span className={getOcupacaoColor(cmei.percentual_exibido)}>{cmei.percentual_exibido}%</span>
                            <span className="text-muted-foreground font-normal ml-2">
                              ({cmei.ocupados_exibidos}/{cmei.capacidade_exibida})
                            </span>
                          </span>
                        </div>
                        <Progress
                          value={cmei.percentual_exibido}
                          className={`h-2 ${getProgressColor(cmei.percentual_exibido)}`}
                          aria-label={`Ocupação ${cmei.nome}: ${cmei.percentual_exibido}%`}
                        />

                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="flex items-center gap-1.5 text-xs md:text-sm">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Vagas livres</span>
                          </div>
                          <span className="text-lg md:text-xl font-bold text-primary">
                            {cmei.capacidade_exibida - cmei.ocupados_exibidos}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </TabsContent>

              <TabsContent value="turmas" className="space-y-4 md:space-y-6 mt-4">
                {!turmas || turmas.length === 0 ? (
                  <div className="rounded-2xl border bg-card flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <GraduationCap className="w-12 h-12 mb-4 opacity-30" />
                    <p>Nenhuma turma cadastrada no momento.</p>
                  </div>
                ) : (
                  <>


                    <div className="space-y-4">
                      {turmasPorCmeiOrdenadas.map((grupo) => (
                        <div key={grupo.cmeiId} className="rounded-2xl border bg-card p-5 shadow-sm">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1.5 rounded-lg bg-primary/10">
                                <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                              </div>
                              <h3 className="text-base md:text-lg font-semibold truncate">{grupo.cmeiNome}</h3>
                            </div>
                            <Badge variant="secondary" className="rounded-full">{grupo.turmas.length}</Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {grupo.turmas.map((turma) => (
                              <div key={turma.id} className="rounded-xl border bg-background p-3 md:p-4 hover:shadow-sm hover:border-primary/30 transition-all duration-200">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm md:text-base font-semibold truncate">{turma.nome}</h4>
                                    <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                      <span className="block">Modelo: {turma.turma_base}</span>
                                      {turma.turno && <span className="block">Turno: {turma.turno}</span>}
                                      <span className="block">Status: {getTurmaStatusDescricao(turma.percentual)}</span>
                                    </div>
                                  </div>
                                  <span className={`text-lg font-bold ${getOcupacaoColor(turma.percentual)}`}>
                                    {turma.percentual}%
                                  </span>
                                </div>
                                <Progress
                                  value={turma.percentual}
                                  className={`h-1.5 ${getProgressColor(turma.percentual)}`}
                                  aria-label={`Ocupação ${turma.nome}: ${turma.percentual}%`}
                                />
                                <div className="flex items-center justify-between text-xs mt-2">
                                  <span className="text-muted-foreground">
                                    {turma.ocupados}/{turma.capacidade} vagas
                                  </span>
                                  <span className="font-semibold text-primary">{turma.capacidade - turma.ocupados} livres</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {turmasFiltradas.length === 0 && (
                      <div className="rounded-2xl border bg-card flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <GraduationCap className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm">Nenhuma turma encontrada com os filtros selecionados.</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

