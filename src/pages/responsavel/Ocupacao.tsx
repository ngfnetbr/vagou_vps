import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users, Building2, GraduationCap, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { useOcupacaoCMEIs, useOcupacaoTurmas } from "@/hooks/api/supabase-hooks";
import { Badge } from "@/components/ui/badge";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const Ocupacao = () => {
  const { data: config } = useConfiguracoesPublicas();
  const { singular, plural } = getUnidadeLabels(config as any);
  const { data: cmeis, isLoading: isLoadingCmeis } = useOcupacaoCMEIs();
  const { data: turmas, isLoading: isLoadingTurmas } = useOcupacaoTurmas();
  const [filtroTurmaCmei, setFiltroTurmaCmei] = useState<string>("todos");

  const isLoading = isLoadingCmeis || isLoadingTurmas;

  // Filtrar turmas por CMEI
  const turmasFiltradas = turmas?.filter(turma => 
    filtroTurmaCmei === "todos" || turma.cmei_id === filtroTurmaCmei
  ) || [];

  // Agrupar turmas por turma_base para resumo
  const resumoPorTurmaBase = turmas?.reduce((acc, turma) => {
    const base = turma.turma_base;
    if (!acc[base]) {
      acc[base] = { capacidade: 0, ocupados: 0 };
    }
    acc[base].capacidade += turma.capacidade;
    acc[base].ocupados += turma.ocupados;
    return acc;
  }, {} as Record<string, { capacidade: number; ocupados: number }>) || {};

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

  // Cálculo dos totais
  const totais = cmeis?.reduce((acc, cmei) => ({
    capacidade: acc.capacidade + cmei.capacidade_total,
    ocupados: acc.ocupados + cmei.ocupados,
    disponiveis: acc.disponiveis + (cmei.capacidade_total - cmei.ocupados)
  }), { capacidade: 0, ocupados: 0, disponiveis: 0 }) || { capacidade: 0, ocupados: 0, disponiveis: 0 };

  return (
    <ResponsavelLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Ocupação de {plural}</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Consulte a capacidade e ocupação atual de cada {singular} e turma
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Spinner className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dados de ocupação...</p>
          </div>
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 md:p-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary">
                    {totais.capacidade}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Capacidade</div>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
                <CardContent className="p-3 md:p-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-emerald-600">
                    {totais.ocupados}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Ocupadas</div>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                <CardContent className="p-3 md:p-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-amber-600">
                    {totais.disponiveis}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Disponíveis</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="cmeis" className="space-y-4 md:space-y-6">
              <TabsList className="grid w-full max-w-sm grid-cols-2 mx-auto">
                <TabsTrigger value="cmeis" className="flex items-center gap-2 text-xs md:text-sm">
                  <Building2 className="w-4 h-4" />
                  <span className="hidden xs:inline">Por</span> {singular}
                </TabsTrigger>
                <TabsTrigger value="turmas" className="flex items-center gap-2 text-xs md:text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span className="hidden xs:inline">Por</span> Turma
                </TabsTrigger>
              </TabsList>

              {/* Tab CMEIs */}
              <TabsContent value="cmeis" className="space-y-4 md:space-y-6 mt-4">
                {!cmeis || cmeis.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Building2 className="w-12 h-12 mb-4 opacity-30" />
                      <p>Nenhuma {singular} cadastrada no momento.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                    {cmeis.map((cmei) => (
                      <Card key={cmei.id} className="hover:shadow-md transition-all duration-200 overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base md:text-lg truncate">
                                {cmei.nome}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-1.5 mt-1 text-xs md:text-sm">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{cmei.endereco || "Endereço não informado"}</span>
                              </CardDescription>
                            </div>
                            {getStatusBadge(cmei.percentual)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div>
                            <div className="flex justify-between text-xs md:text-sm mb-2">
                              <span className="text-muted-foreground">Ocupação</span>
                              <span className="font-semibold">
                                <span className={getOcupacaoColor(cmei.percentual)}>{cmei.percentual}%</span>
                                <span className="text-muted-foreground font-normal ml-2">
                                  ({cmei.ocupados}/{cmei.capacidade_total})
                                </span>
                              </span>
                            </div>
                            <Progress 
                              value={cmei.percentual} 
                              className={`h-2 ${getProgressColor(cmei.percentual)}`}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-1.5 text-xs md:text-sm">
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Vagas livres:</span>
                            </div>
                            <span className="text-lg md:text-xl font-bold text-primary">
                              {cmei.capacidade_total - cmei.ocupados}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab Turmas */}
              <TabsContent value="turmas" className="space-y-4 md:space-y-6 mt-4">
                {!turmas || turmas.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <GraduationCap className="w-12 h-12 mb-4 opacity-30" />
                      <p>Nenhuma turma cadastrada no momento.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Filtro por CMEI */}
                    <div className="flex flex-col gap-4">
                      <Select value={filtroTurmaCmei} onValueChange={setFiltroTurmaCmei}>
                        <SelectTrigger className="w-full md:w-72">
                          <SelectValue placeholder={`Filtrar por ${singular}`} />
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

                    {/* Resumo por Turma Base */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                      {Object.entries(resumoPorTurmaBase).map(([turmaBase, dados]: [string, { capacidade: number; ocupados: number }]) => {
                        const percentual = dados.capacidade > 0 
                          ? Math.round((dados.ocupados / dados.capacidade) * 100) 
                          : 0;
                        return (
                          <Card key={turmaBase} className="overflow-hidden">
                            <CardContent className="p-3 text-center">
                              <div className="font-semibold text-xs md:text-sm mb-1 truncate">{turmaBase}</div>
                              <div className={`text-xl md:text-2xl font-bold ${getOcupacaoColor(percentual)}`}>
                                {percentual}%
                              </div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">
                                {dados.ocupados}/{dados.capacidade}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Lista de Turmas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {turmasFiltradas.map((turma) => (
                        <Card key={turma.id} className="hover:shadow-md transition-all duration-200">
                          <CardHeader className="pb-2 p-3 md:p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm md:text-base truncate">{turma.nome}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  <div className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    <span className="truncate">{turma.cmei_nome}</span>
                                  </div>
                                  {turma.turno && (
                                    <span className="text-[10px] mt-0.5 block">Turno: {turma.turno}</span>
                                  )}
                                </CardDescription>
                              </div>
                              <span className={`text-lg font-bold ${getOcupacaoColor(turma.percentual)}`}>
                                {turma.percentual}%
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 p-3 md:p-4 pt-0">
                            <Progress 
                              value={turma.percentual} 
                              className={`h-1.5 ${getProgressColor(turma.percentual)}`}
                            />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {turma.ocupados}/{turma.capacidade} vagas
                              </span>
                              <span className="font-semibold text-primary">
                                {turma.capacidade - turma.ocupados} livres
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {turmasFiltradas.length === 0 && (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                          <GraduationCap className="w-10 h-10 mb-3 opacity-30" />
                          <p className="text-sm">Nenhuma turma encontrada com os filtros selecionados.</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </ResponsavelLayout>
  );
};

export default Ocupacao;

