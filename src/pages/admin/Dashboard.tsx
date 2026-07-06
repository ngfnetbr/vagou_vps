import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Building2, RefreshCw, Users, School, ListOrdered, TrendingUp, Clock, Activity, Bell, GraduationCap, UserPlus, XCircle, LogOut, RotateCcw, ArrowRightLeft, FileText, FileCheck, FileX, Send, Eye, Inbox } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { useDashboardStats } from "@/hooks/api/admin-hooks";
import { useConvocacoesPendentes, useAtividadesRecentes } from "@/hooks/api/criancas-hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCriancasRealtimeUpdates, useHistoricoRealtimeUpdates } from "@/hooks/use-realtime-updates";
import { OcupacaoChart } from "@/components/admin/charts/OcupacaoChart";
import { MatriculasPieChart } from "@/components/admin/charts/MatriculasPieChart";
import { SexoChart } from "@/components/admin/charts/SexoChart";
import { AlertaCriancasAntigas } from "@/components/admin/AlertaCriancasAntigas";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/utils/error-utils";
import { fixMojibake } from "@/utils/encoding-fix";
import { useDashboardInscricoesNotifications } from "@/hooks/use-dashboard-inscricoes-notifications";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BIContent } from "./BI.tsx";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { PageHeader } from "@/components/common/page-header";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  iconBgClass: string;
  isLoading?: boolean;
}

function StatCard({ title, value, description, icon, iconBgClass, isLoading }: StatCardProps) {
  return (
    <Card className="bg-card border-0 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg animate-fade-up">
      <CardContent className="p-3 md:p-5">
        <div className="flex items-start justify-between mb-2 md:mb-3">
          <span className="text-xs md:text-sm font-medium text-muted-foreground line-clamp-1">{title}</span>
          <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}>
            {icon}
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-7 md:h-9 w-20 md:w-24 mb-1" />
        ) : (
          <p className="text-xl md:text-3xl font-bold text-foreground mb-0.5 md:mb-1">
            {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
          </p>
        )}
        <p className="text-[10px] md:text-xs text-muted-foreground leading-snug whitespace-normal break-words">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}


const acoesConfig: Record<string, { label: string; icon: React.ReactNode; color: string; highlight?: boolean }> = {
  // Notificações
  'notificacao_matricula': { label: 'Notificação de matrícula', icon: <WhatsAppIcon className="h-4 w-4 fill-current" />, color: 'text-blue-500 bg-blue-500/10' },
  'notificacao_convocacao': { label: 'Notificação de convocação', icon: <Bell className="h-4 w-4" />, color: 'text-amber-500 bg-amber-500/10' },
  'notificacao_documentos_aprovados': { label: 'Documentos aprovados', icon: <FileCheck className="h-4 w-4" />, color: 'text-green-500 bg-green-500/10' },
  'notificacao_documentacao_pendente': { label: 'Documentos solicitados', icon: <FileText className="h-4 w-4" />, color: 'text-orange-500 bg-orange-500/10' },
  'notificacao_lembrete': { label: 'Lembrete de prazo', icon: <Clock className="h-4 w-4" />, color: 'text-purple-500 bg-purple-500/10' },
  'notificacao_inscricao_fila': { label: 'Confirmação de inscrição', icon: <Send className="h-4 w-4" />, color: 'text-cyan-500 bg-cyan-500/10' },
  // Ações do sistema
  'Inscrição Realizada': { label: 'Nova inscrição', icon: <UserPlus className="h-4 w-4" />, color: 'text-primary bg-primary/10', highlight: true },
  'Matrícula Efetivada': { label: 'Matrícula confirmada', icon: <GraduationCap className="h-4 w-4" />, color: 'text-green-600 bg-green-600/10' },
  'Convocação Realizada': { label: 'Criança convocada', icon: <Bell className="h-4 w-4" />, color: 'text-amber-500 bg-amber-500/10' },
  'Recusa de Convocação': { label: 'Convocação recusada', icon: <XCircle className="h-4 w-4" />, color: 'text-red-500 bg-red-500/10' },
  'Desistência Registrada': { label: 'Desistência registrada', icon: <LogOut className="h-4 w-4" />, color: 'text-gray-500 bg-gray-500/10' },
  'Fim de Fila Aplicado': { label: 'Movido para fim da fila', icon: <ListOrdered className="h-4 w-4" />, color: 'text-orange-500 bg-orange-500/10' },
  'Reativação Realizada': { label: 'Reativado na fila', icon: <RotateCcw className="h-4 w-4" />, color: 'text-teal-500 bg-teal-500/10' },
  'Realocação de Turma': { label: 'Realocado de turma', icon: <ArrowRightLeft className="h-4 w-4" />, color: 'text-indigo-500 bg-indigo-500/10' },
  'Transferência Realizada': { label: 'Transferência realizada', icon: <ArrowRightLeft className="h-4 w-4" />, color: 'text-violet-500 bg-violet-500/10' },
  'Remanejamento Solicitado': { label: 'Remanejamento solicitado', icon: <ArrowRightLeft className="h-4 w-4" />, color: 'text-pink-500 bg-pink-500/10' },
  'Documento Enviado': { label: 'Documento enviado', icon: <FileText className="h-4 w-4" />, color: 'text-blue-500 bg-blue-500/10' },
  'Documento Aprovado': { label: 'Documento aprovado', icon: <FileCheck className="h-4 w-4" />, color: 'text-green-500 bg-green-500/10' },
  'Documento Recusado': { label: 'Documento recusado', icon: <FileX className="h-4 w-4" />, color: 'text-red-500 bg-red-500/10' },
};

function getAcaoConfig(acao: string) {
  const normalized = fixMojibake(acao) ?? acao;
  return acoesConfig[normalized] || { 
    label: normalized, 
    icon: <Activity className="h-4 w-4" />, 
    color: 'text-muted-foreground bg-muted',
    highlight: false,
  };
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);

  const {
    data: stats,
    isLoading,
    isFetching: isFetchingStats,
    isError: isStatsError,
    error: statsError,
    refetch: refetchStats,
    dataUpdatedAt,
  } = useDashboardStats();
  const {
    data: convocacoes,
    isLoading: isLoadingConvocacoes,
    isFetching: isFetchingConvocacoes,
    isError: isConvocacoesError,
    error: convocacoesError,
    refetch: refetchConvocacoes,
  } = useConvocacoesPendentes();
  const {
    data: atividades,
    isLoading: isLoadingAtividades,
    isFetching: isFetchingAtividades,
    isError: isAtividadesError,
    error: atividadesError,
    refetch: refetchAtividades,
  } = useAtividadesRecentes();
  const {
    notifications: novasInscricoes,
    dismissItem: dismissNovaInscricao,
    dismissAll: dismissTodasNovasInscricoes,
    isLoading: isLoadingNovasInscricoes,
    error: novasInscricoesError,
  } = useDashboardInscricoesNotifications();

  // Habilitar atualizações em tempo real
  useCriancasRealtimeUpdates(false);
  useHistoricoRealtimeUpdates(false);

  const isRefreshing = isFetchingStats || isFetchingConvocacoes || isFetchingAtividades;

  const handleRefresh = async () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return (
          key === "dashboard-stats" ||
          key === "convocacoes-pendentes" ||
          key === "atividades-recentes" ||
          key === "dashboard-novas-inscricoes" ||
          key === "dashboard-ocupacao-cmei" ||
          key === "dashboard-status-distribuicao" ||
          key === "dashboard-sexo-distribuicao"
        );
      },
    });

    await Promise.all([refetchStats(), refetchConvocacoes(), refetchAtividades()]);
    setLastUpdatedAt(Date.now());
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title="Dashboard"
          description="Visão geral do sistema de gestão de vagas"
          actions={(
            <>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Atualizado às {format(new Date(dataUpdatedAt || lastUpdatedAt), "HH:mm", { locale: ptBR })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                {isRefreshing ? (
                  <Spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>
            </>
          )}
        />

        <Tabs defaultValue="visao" className="space-y-4 md:space-y-6">
            <TabsList className="w-fit">
            <TabsTrigger value="visao">Visão geral</TabsTrigger>
              <TabsTrigger value="bi">Painel Analítico</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="mt-0 space-y-4 md:space-y-6">
            {isStatsError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Não foi possível carregar o dashboard</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span className="text-sm">{getErrorMessage(statsError)}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => refetchStats()}>
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {isLoadingNovasInscricoes ? null : novasInscricoesError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro ao carregar notificações de novas inscrições</AlertTitle>
                <AlertDescription>{getErrorMessage(novasInscricoesError)}</AlertDescription>
              </Alert>
            ) : novasInscricoes.length > 0 ? (
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Novas inscrições</CardTitle>
                        <CardDescription>
                          {novasInscricoes.length}{" "}
                          {novasInscricoes.length === 1 ? "inscrição nova visualizada" : "inscrições novas visualizadas"} nesta sessão.
                        </CardDescription>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={dismissTodasNovasInscricoes}>
                      <Eye className="h-4 w-4" />
                      Marcar todas como vistas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {novasInscricoes.map((crianca) => (
                    <div
                      key={crianca.id}
                      className="flex items-start justify-between gap-3 rounded-lg border bg-background/90 p-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-sm">{crianca.nome}</p>
                        <p className="text-xs text-muted-foreground">Responsável: {crianca.responsavel_nome || "Não informado"}</p>
                        <p className="text-xs text-muted-foreground">
                          1ª opção: {crianca.cmei1?.nome || "Não informada"} •{" "}
                          {format(new Date(crianca.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => dismissNovaInscricao(crianca.id)}
                      >
                        <Inbox className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-6">
              <AlertaCriancasAntigas />

              <div className="grid gap-2 md:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                  title="Total Cadastrado"
                  value={stats?.totalCriancas || 0}
                  description="Crianças cadastradas no sistema."
                  icon={<Users className="h-5 w-5 text-primary" />}
                  iconBgClass="bg-primary/10"
                  isLoading={isLoading}
                />

                <StatCard
                  title="Matriculados"
                  value={stats?.matriculadas || 0}
                  description={`Com matrícula ativa em ${singular}/turma.`}
                  icon={<School className="h-5 w-5 text-[hsl(142,76%,36%)]" />}
                  iconBgClass="bg-[hsl(142,76%,36%)]/10"
                  isLoading={isLoading}
                />

                <StatCard
                  title="Aguardando Vaga"
                  value={stats?.naFila || 0}
                  description="Aguardando vaga na fila de espera."
                  icon={<ListOrdered className="h-5 w-5 text-[hsl(48,100%,40%)]" />}
                  iconBgClass="bg-[hsl(48,100%,50%)]/20"
                  isLoading={isLoading}
                />

                <StatCard
                  title="Ocupação"
                  value={`${stats?.taxaOcupacao || 0}%`}
                  description="Percentual de vagas ocupadas."
                  icon={<TrendingUp className="h-5 w-5 text-primary" />}
                  iconBgClass="bg-primary/10"
                  isLoading={isLoading}
                />

                <StatCard
                  title={`${plural} Ativas`}
                  value={stats?.cmeisAtivos || 0}
                  description="Unidades ativas no sistema."
                  icon={<Building2 className="h-5 w-5 text-[hsl(214,73%,38%)]" />}
                  iconBgClass="bg-[hsl(214,73%,38%)]/10"
                  isLoading={isLoading}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-card border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[hsl(0,84%,60%)]/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-[hsl(0,84%,60%)]" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Convocações Pendentes</CardTitle>
                        <CardDescription className="text-xs">{convocacoes?.length || 0} aguardando confirmação</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {isLoadingConvocacoes ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                            <div className="space-y-2 w-full">
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-3 w-28" />
                            </div>
                          </div>
                        ))
                      ) : isConvocacoesError ? (
                        <p className="text-sm text-destructive text-center py-6">{getErrorMessage(convocacoesError)}</p>
                      ) : convocacoes?.length ? (
                        convocacoes.slice(0, 4).map((crianca) => (
                          <div key={crianca.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{crianca.nome}</p>
                              <p className="text-xs text-muted-foreground">{crianca.cmei1?.nome || `${singular} não especificado`}</p>
                            </div>
                            <Badge
                              variant={
                                crianca.convocacao_deadline && new Date(crianca.convocacao_deadline) < new Date()
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {crianca.convocacao_deadline && new Date(crianca.convocacao_deadline) < new Date()
                                ? "Expirado"
                                : "Pendente"}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma convocação pendente</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[hsl(214,73%,38%)]/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-[hsl(214,73%,38%)]" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Atividades Recentes</CardTitle>
                        <CardDescription className="text-xs">Últimas ações no sistema</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {isLoadingAtividades ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <div key={idx} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <Skeleton className="h-4 w-44" />
                                <Skeleton className="h-3 w-10 shrink-0" />
                              </div>
                              <Skeleton className="h-3 w-32" />
                            </div>
                          </div>
                        ))
                      ) : isAtividadesError ? (
                        <p className="text-sm text-destructive text-center py-6">{getErrorMessage(atividadesError)}</p>
                      ) : atividades?.length ? (
                        atividades.slice(0, 4).map((atividade) => {
                          const config = getAcaoConfig(atividade.acao);
                          const rowClassName = config.highlight
                            ? "flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-2"
                            : "flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0";
                          const iconClassName = config.highlight
                            ? `h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${config.color} ring-1 ring-primary/20`
                            : `h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`;
                          return (
                            <div key={atividade.id} className={rowClassName}>
                              <div className={iconClassName}>{config.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className={`font-medium text-sm truncate inline-block max-w-full ${
                                      config.highlight ? "text-primary font-semibold" : ""
                                    }`}
                                  >
                                    {config.label}
                                  </p>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {atividade.created_at &&
                                      format(new Date(atividade.created_at), "dd/MM", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{atividade.crianca?.nome || "Criança não identificada"}</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade recente</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <OcupacaoChart compact />
                <MatriculasPieChart compact />
                <SexoChart compact />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bi" className="mt-0">
            <BIContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

