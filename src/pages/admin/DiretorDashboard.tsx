import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { School, Users, GraduationCap, UserCheck, Search, Building, ChevronRight, AlertCircle, FileCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { useDocumentosPendentesCount } from "@/hooks/api/documentos-hooks";
import {
  useDiretorCmeis,
  useDiretorStats,
  useDiretorCriancas,
  useDiretorTurmas,
  useDiretorOcupacao,
  useDiretorFilaEspera,
  useDiretorConvocados,
} from "@/hooks/api/diretor-hooks";

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DiretorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [turmaFilter, setTurmaFilter] = useState<string>("all");
  const [turmaBaseFilter, setTurmaBaseFilter] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);

  const { data: cmeis, isLoading: loadingCmeis } = useDiretorCmeis();
  const { data: stats, isLoading: loadingStats } = useDiretorStats();
  const { data: turmas, isLoading: loadingTurmas } = useDiretorTurmas();
  const { data: ocupacao, isLoading: loadingOcupacao } = useDiretorOcupacao();
  const { data: filaEspera, isLoading: loadingFilaEspera } = useDiretorFilaEspera();
  const { data: convocados, isLoading: loadingConvocados } = useDiretorConvocados();
  const { data: documentosPendentesAprovacao = 0, isLoading: loadingDocumentosPendentes } =
    useDocumentosPendentesCount();
  const { data: criancas, isLoading: loadingCriancas } = useDiretorCriancas(
    statusFilter !== "all" ? statusFilter : undefined,
    turmaFilter !== "all" ? turmaFilter : undefined,
    turmaBaseFilter !== "all" ? turmaBaseFilter : undefined,
    dataInicio || undefined,
    dataFim || undefined
  );

  // Extrair turmas base únicas das turmas
  const turmasBaseUnicas = [...new Set(turmas?.map((t: any) => t.turma_base).filter(Boolean) || [])];

  // Filtrar crianças por busca
  const criancasFiltradas = criancas?.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.responsavel_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filaFiltrada = filaEspera?.filter((c: any) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const convocadosFiltrados = convocados?.filter((c: any) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const confirmarMatricula = useMutation({
    mutationFn: async (criancaId: string) => {
      const { error } = await supabase.rpc("confirmar_matricula_crianca", {
        p_crianca_id: criancaId,
      });
      if (error) throw error;

      try {
        await supabase.functions.invoke("enviar-notificacao", {
          body: {
            crianca_id: criancaId,
            tipo: "matricula",
            dados_adicionais: { origem: "diretor" },
          },
        });
      } catch {
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diretor-convocados"] });
      queryClient.invalidateQueries({ queryKey: ["diretor-stats"] });
      queryClient.invalidateQueries({ queryKey: ["diretor-criancas"] });
      toast.success("Matrícula confirmada!");
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (loadingCmeis) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!cmeis || cmeis.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <CardTitle>Sem {plural} Vinculados</CardTitle>
              </div>
              <CardDescription>
                Você não possui vínculo com nenhum(a) {singular}. Entre em contato com
                o administrador do sistema para solicitar o vínculo.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard do Diretor</h1>
          <p className="text-muted-foreground">
            Visão geral de {plural} vinculados
          </p>
        </div>

        {/* CMEIs Badges */}
        <div className="flex flex-wrap gap-2">
          {cmeis.map((cmei: any) => (
            <Badge key={cmei.id} variant="secondary" className="text-sm py-1 px-3">
              <School className="h-3 w-3 mr-1" />
              {cmei.nome}
            </Badge>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Matriculados"
            value={stats?.totalMatriculados || 0}
            icon={Users}
            description="Crianças matriculadas"
            loading={loadingStats}
          />
          <StatsCard
            title="Convocados"
            value={stats?.totalConvocados || 0}
            icon={UserCheck}
            description="Aguardando confirmação"
            loading={loadingStats}
          />
          <StatsCard
            title="Vagas Disponíveis"
            value={stats?.vagas || 0}
            icon={Building}
            description={`de ${stats?.capacidadeTotal || 0} total`}
            loading={loadingStats}
          />
          <StatsCard
            title="Total de Turmas"
            value={stats?.totalTurmas || 0}
            icon={GraduationCap}
            description="Turmas ativas"
            loading={loadingStats}
          />
          <StatsCard
            title="Docs p/ aprovar"
            value={documentosPendentesAprovacao}
            icon={FileCheck}
            description="Pendentes de aprovação"
            loading={loadingDocumentosPendentes}
          />
        </div>

        {/* Ocupação Progress */}
        {stats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Taxa de Ocupação Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={stats.percentualOcupacao} className="flex-1 h-3" />
                <span className="text-2xl font-bold">{stats.percentualOcupacao}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="ocupacao" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ocupacao">Ocupação por {singular}</TabsTrigger>
            <TabsTrigger value="turmas">Turmas</TabsTrigger>
            <TabsTrigger value="fila">Fila de Espera</TabsTrigger>
            <TabsTrigger value="convocados">Convocados</TabsTrigger>
            <TabsTrigger value="criancas">Crianças</TabsTrigger>
          </TabsList>

          {/* Ocupação por CMEI */}
          <TabsContent value="ocupacao" className="space-y-4">
            {loadingOcupacao ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {ocupacao?.map((cmei: any) => (
                  <Card key={cmei.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{cmei.nome}</CardTitle>
                        <Badge
                          variant={cmei.percentual >= 90 ? "destructive" : cmei.percentual >= 70 ? "secondary" : "default"}
                        >
                          {cmei.percentual}%
                        </Badge>
                      </div>
                      {cmei.bairro && (
                        <CardDescription>{cmei.bairro}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Progress value={cmei.percentual} className="h-2 mb-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{cmei.ocupados} matriculados</span>
                        <span>{cmei.vagas} vagas</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Turmas */}
          <TabsContent value="turmas" className="space-y-4">
            {loadingTurmas ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Turmas Ativas</CardTitle>
                  <CardDescription>
                    Turmas de {plural} vinculados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Turma</TableHead>
                          <TableHead>{singular}</TableHead>
                          <TableHead>Turno</TableHead>
                          <TableHead className="text-center">Ocupação</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {turmas?.map((turma: any) => (
                          <TableRow key={turma.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{turma.nome}</p>
                                <p className="text-sm text-muted-foreground">
                                  {turma.turma_base}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{turma.cmei?.nome}</TableCell>
                            <TableCell>{turma.turno || "-"}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-medium">
                                  {turma.ocupados}/{turma.capacidade}
                                </span>
                                <Progress
                                  value={(turma.ocupados / turma.capacidade) * 100}
                                  className="w-16 h-2"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/modulo/vagou/admin/turmas/${turma.id}`)}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Crianças */}
          <TabsContent value="criancas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Crianças</CardTitle>
                <CardDescription>
                  Lista de crianças em {plural}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="Matriculado">Matriculado</SelectItem>
                        <SelectItem value="Matriculada">Matriculada</SelectItem>
                        <SelectItem value="Convocado">Convocado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Turma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as turmas</SelectItem>
                        {turmas?.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Filtros avançados */}
                  <div className="flex flex-col sm:flex-row gap-3 p-3 bg-muted/30 rounded-lg">
                    <Select value={turmaBaseFilter} onValueChange={setTurmaBaseFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Turma Base" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as turmas base</SelectItem>
                        {turmasBaseUnicas.map((tb) => (
                          <SelectItem key={tb} value={tb}>
                            {tb}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Período:</span>
                      <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full sm:w-auto"
                        placeholder="Data início"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full sm:w-auto"
                        placeholder="Data fim"
                      />
                    </div>
                    {(turmaBaseFilter !== "all" || dataInicio || dataFim) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTurmaBaseFilter("all");
                          setDataInicio("");
                          setDataFim("");
                        }}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tabela */}
                {loadingCriancas ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Turma</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {criancasFiltradas?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Nenhuma criança encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          criancasFiltradas?.map((crianca: any) => (
                            <TableRow key={crianca.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{crianca.nome}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{crianca.responsavel_nome}</TableCell>
                              <TableCell>
                                <div>
                                  <p>{crianca.turma_atual?.nome || "-"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {crianca.cmei_atual?.nome}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    crianca.status === "Convocado"
                                      ? "secondary"
                                      : "default"
                                  }
                                >
                                  {crianca.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/modulo/vagou/admin/criancas/${crianca.id}`)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fila" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fila de Espera</CardTitle>
                <CardDescription>
                  Crianças na fila para {singular}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFilaEspera ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Posição</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Data Nasc.</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filaFiltrada?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhuma criança encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          filaFiltrada?.map((crianca: any) => (
                            <TableRow key={crianca.id}>
                              <TableCell className="font-medium">
                                {crianca.posicao ? `#${crianca.posicao}` : "-"}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{crianca.nome}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {crianca.prioridade && crianca.prioridade !== "Geral" ? crianca.prioridade : ""}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/modulo/vagou/admin/criancas/${crianca.id}`)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="convocados" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Convocados</CardTitle>
                <CardDescription>
                  Confirmação de matrícula só é liberada após documentação obrigatória completa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingConvocados ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Prazo</TableHead>
                          <TableHead>Documentos</TableHead>
                          <TableHead className="w-[220px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {convocadosFiltrados?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhuma criança encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          convocadosFiltrados?.map((crianca: any) => {
                            const docs = crianca.documentacao;
                            const canConfirm = !!docs?.completos;
                            return (
                              <TableRow key={crianca.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{crianca.nome}</p>
                                    {crianca.responsavel_nome && (
                                      <p className="text-sm text-muted-foreground">{crianca.responsavel_nome}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {crianca.convocacao_deadline
                                    ? format(new Date(crianca.convocacao_deadline), "dd/MM/yyyy", { locale: ptBR })
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {canConfirm ? (
                                    <Badge>Completa</Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      Pendentes ({docs?.pendentes ?? 0}/{docs?.total ?? 0})
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/modulo/vagou/admin/criancas/${crianca.id}`)}
                                    >
                                      Detalhes
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={!canConfirm || confirmarMatricula.isPending}
                                      onClick={() => confirmarMatricula.mutate(crianca.id)}
                                      title={
                                        !canConfirm && (docs?.nomesPendentes?.length || 0) > 0
                                          ? `Pendentes: ${docs.nomesPendentes.join(", ")}`
                                          : undefined
                                      }
                                    >
                                      Confirmar
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

