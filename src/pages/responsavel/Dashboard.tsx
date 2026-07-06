import { useState, useEffect, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Link } from "react-router-dom";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserCheck, Clock, AlertCircle, Eye, History, MapPin, Calendar, Phone, CheckCircle2, XCircle, ArrowRightLeft, Download, FileText, AlertTriangle, Edit, Printer } from "lucide-react";
import { 
  useMinhasCriancas, 
  useResponsavelStats, 
  useHistoricoCrianca,
  useRecusarConvocacao,
  useCancelarRemanejamentoResponsavel,
} from "@/hooks/api/responsavel-hooks";
import { MatriculaDialog } from "@/components/responsavel/MatriculaDialog";
import { SolicitarRemanejamentoDialog } from "@/components/responsavel/SolicitarRemanejamentoDialog";

import { DocumentosPendentesCard } from "@/components/responsavel/DocumentosPendentesCard";
import { StatusTimeline } from "@/components/responsavel/StatusTimeline";
import { EditarCriancaDialog } from "@/components/responsavel/EditarCriancaDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { gerarComprovantePDF, gerarFichaPDF } from "@/utils/pdf-utils";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calcularResumoDocumentacaoObrigatoria } from "@/utils/documentos-obrigatorios";
import { labelCorRaca, labelEtniaIndigena, labelFormaMoradia, labelNacionalidade, formatSimNao } from "@/utils/crianca-labels";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { buildVisibleFilaPositionMap } from "@/utils/fila-score";

const ResponsavelDashboard = () => {
  const { userProfile } = useAuth();
  const { data: config } = useConfiguracoesPublicas();
  const { singular, plural } = getUnidadeLabels(config as any);
  const { data: criancas, isLoading: loadingCriancas } = useMinhasCriancas();
  const { data: stats } = useResponsavelStats();
  const { data: filaPublicaCompleta } = useQuery({
    queryKey: ["fila-publica-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_fila_publica");
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        status?: string | null;
        cmei_remanejamento_id?: string | null;
        posicao_fila?: number | null;
        posicao_fila_cmei2?: number | null;
        posicao_fila_cmei3?: number | null;
      }>;
    },
    staleTime: 60000,
    gcTime: 300000,
  });
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    criancaId?: string;
  }>({ open: false });
  const [historicoDialog, setHistoricoDialog] = useState<{
    open: boolean;
    criancaId?: string;
  }>({ open: false });
  const [matriculaDialog, setMatriculaDialog] = useState<{
    open: boolean;
    criancaId?: string;
  }>({ open: false });
  const [remanejamentoDialog, setRemanejamentoDialog] = useState<{
    open: boolean;
    criancaId?: string;
  }>({ open: false });
  const [editarDialog, setEditarDialog] = useState<{
    open: boolean;
    criancaId?: string;
  }>({ open: false });

  const posicaoMap = useMemo(
    () => buildVisibleFilaPositionMap(filaPublicaCompleta || []),
    [filaPublicaCompleta],
  );

  const { data: historico, isLoading: loadingHistorico } = useHistoricoCrianca(
    historicoDialog.criancaId
  );

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const anos = hoje.getFullYear() - nascimento.getFullYear();
    const meses = hoje.getMonth() - nascimento.getMonth();

    if (anos === 0) {
      return `${meses} meses`;
    } else if (anos === 1) {
      return "1 ano";
    } else {
      return `${anos} anos`;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Matriculado":
      case "Matriculada":
        return "default";
      case "Convocado":
        return "secondary";
      case "Aguardando Documentação":
        return "secondary";
      case "Aguardando Assinatura":
        return "secondary";
      case "Fila de Espera":
        return "outline";
      case "Remanejamento Solicitado":
        return "secondary";
      case "Desistente":
      case "Recusada":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusInfo = (status: string, deadline?: string | null, cmeiRemanejamentoId?: string | null, cmeiAtual?: any) => {
    if (status === "Convocado" && deadline) {
      const dias = differenceInDays(new Date(deadline), new Date());
      
      if (dias < 0) {
        return {
          variant: "destructive" as const,
          message: "Prazo vencido! Entre em contato com a secretaria.",
          urgent: true,
        };
      } else if (dias <= 3) {
        return {
          variant: "warning" as const,
          message: `Atenção! Você tem ${dias} ${dias === 1 ? 'dia' : 'dias'} para responder à convocação.`,
          urgent: true,
        };
      } else {
        return {
          variant: "info" as const,
          message: `Você foi convocado! Responda até ${format(new Date(deadline), "dd/MM/yyyy", { locale: ptBR })}.`,
          urgent: false,
        };
      }
    }
    
    if (status === "Aguardando Documentação") {
      return {
        variant: "warning" as const,
        message: "Envie os documentos necessários para prosseguir com a matrícula.",
        urgent: true,
      };
    }

    if (status === "Aguardando Assinatura") {
      const dias = deadline ? differenceInDays(new Date(deadline), new Date()) : null;
      const cmeiNome = cmeiAtual?.nome || `${singular} designada`;
      
      if (dias !== null && dias < 0) {
        return {
          variant: "destructive" as const,
          message: `Prazo vencido! Compareça imediatamente em ${cmeiNome} ou à Secretaria de Educação para assinar a matrícula.`,
          urgent: true,
        };
      } else if (dias !== null && dias <= 3) {
        return {
          variant: "warning" as const,
          message: `Atenção! Compareça em ${cmeiNome} ou à Secretaria de Educação em até ${dias} ${dias === 1 ? 'dia' : 'dias'} para assinar a matrícula.`,
          urgent: true,
        };
      } else {
        const prazoFormatado = deadline ? format(new Date(deadline), "dd/MM/yyyy", { locale: ptBR }) : "";
        return {
          variant: "info" as const,
          message: `Documentos aprovados! Compareça em ${cmeiNome} ou à Secretaria de Educação${prazoFormatado ? ` até ${prazoFormatado}` : ""} para assinar a matrícula.`,
          urgent: false,
        };
      }
    }
    
    // Verifica se tem remanejamento solicitado (pelo cmei_remanejamento_id, não pelo status)
    if (cmeiRemanejamentoId) {
      return {
        variant: "info" as const,
        message: "Remanejamento solicitado. Você continua matriculado e aguarda vaga na fila com prioridade máxima.",
        urgent: false,
      };
    }
    
    return null;
  };

  const criancaDetails = criancas?.find((c) => c.id === detailsDialog.criancaId);
  const criancaMatricula = criancas?.find((c) => c.id === matriculaDialog.criancaId);
  const criancaRemanejamento = criancas?.find((c) => c.id === remanejamentoDialog.criancaId);

  const { data: resumoDocs, isLoading: loadingResumoDocs } = useQuery({
    queryKey: ["resumo-documentacao-obrigatoria", detailsDialog.criancaId],
    queryFn: async () => {
      if (!detailsDialog.criancaId) return null;
      return await calcularResumoDocumentacaoObrigatoria(detailsDialog.criancaId);
    },
    enabled: detailsDialog.open && !!detailsDialog.criancaId,
  });

  // Hooks para ações
  const recusarConvocacao = useRecusarConvocacao();
  const cancelarRemanejamento = useCancelarRemanejamentoResponsavel();

  // Função para baixar comprovante usando gerarComprovantePDF
  const handleDownloadComprovante = async (criancaId: string, tipo: "inscricao" | "matricula" | "convocacao") => {
    try {
      await gerarComprovantePDF(criancaId, tipo);
      toast.success("Comprovante gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar comprovante:", error);
      toast.error("Erro ao gerar comprovante");
    }
  };

  // Realtime subscription para atualizar posição na fila
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('criancas-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'criancas'
        },
        () => {
          // Invalidar queries para atualizar dados
          queryClient.invalidateQueries({ queryKey: ['minhas-criancas'] });
          queryClient.invalidateQueries({ queryKey: ['responsavel-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Função para baixar ficha completa
  const handleDownloadFicha = async (criancaId: string) => {
    try {
      await gerarFichaPDF(criancaId);
      toast.success("Ficha gerada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar ficha:", error);
      toast.error("Erro ao gerar ficha");
    }
  };

  return (
    <ResponsavelLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Minhas Inscrições</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Acompanhe o status das inscrições de seus filhos
          </p>
        </div>

        {/* Alerta CPF pendente */}
        {!userProfile?.cpf && (
          <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Complete seu cadastro</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Seu CPF não está cadastrado. Inscrições feitas anteriormente com seu CPF serão vinculadas automaticamente após você{" "}
              <Link to="/modulo/vagou/responsavel/perfil" className="font-medium underline hover:no-underline">
                completar seu perfil
              </Link>.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalInscricoes || 0}</div>
              <p className="text-xs text-muted-foreground">inscrições</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Matriculadas</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.matriculadas || 0}</div>
              <p className="text-xs text-muted-foreground">em {plural}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fila de Espera</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.filaEspera || 0}</div>
              <p className="text-xs text-muted-foreground">aguardando</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convocadas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.convocadas || 0}</div>
              <p className="text-xs text-muted-foreground">para responder</p>
            </CardContent>
          </Card>
        </div>


        {/* Documentos Pendentes - mostrar para crianças aguardando documentação */}
        {criancas?.filter(c => c.status === "Aguardando Documentação").map((crianca) => (
          <DocumentosPendentesCard
            key={`docs-${crianca.id}`}
            criancaId={crianca.id}
            criancaNome={crianca.nome}
          />
        ))}


        {/* Lista de Crianças */}
        {loadingCriancas ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !criancas || criancas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Você ainda não possui inscrições cadastradas.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {criancas.map((crianca) => {
              const statusInfo = getStatusInfo(crianca.status, crianca.convocacao_deadline, crianca.cmei_remanejamento_id, crianca.cmei_atual);

              return (
                <Card key={crianca.id} className={statusInfo?.urgent ? "border-warning" : ""}>
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <CardTitle className="text-lg md:text-xl truncate">{crianca.nome}</CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          {calcularIdade(crianca.data_nascimento)} • {crianca.sexo}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusBadgeVariant(crianca.status)} className="text-xs flex-shrink-0">
                        {crianca.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
                    {/* Alert para convocações */}
                    {statusInfo && (
                      <div className={`p-3 md:p-4 rounded-lg ${
                        statusInfo.variant === "destructive" 
                          ? "bg-destructive/10 text-destructive" 
                          : statusInfo.variant === "warning"
                          ? "bg-warning/10 text-warning-foreground"
                          : "bg-primary/10 text-primary"
                      }`}>
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 md:h-5 md:w-5 mt-0.5 flex-shrink-0" />
                          <p className="text-xs md:text-sm font-medium">{statusInfo.message}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {/* Posição na Fila */}
                      {crianca.status === "Fila de Espera" && posicaoMap.has(crianca.id) && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm md:text-base flex-shrink-0">
                            {posicaoMap.get(crianca.id)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">Posição na Fila</p>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              Prioridade: {crianca.prioridade}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* CMEI Atual */}
                      {crianca.cmei_atual && (
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs md:text-sm font-medium">{singular} Matriculado</p>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {crianca.cmei_atual.nome}
                          </p>
                          {crianca.turma_atual && (
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              Turma: {crianca.turma_atual.nome} - {crianca.turma_atual.turno}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Preferências */}
                      {(crianca.cmei1 || crianca.cmei2) && (
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs md:text-sm font-medium">Preferências de {singular}</p>
                          {crianca.cmei1 && (
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              1ª: {crianca.cmei1.nome}
                            </p>
                          )}
                          {crianca.cmei2 && (
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              2ª: {crianca.cmei2.nome}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                      {crianca.status === "Convocado" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              setMatriculaDialog({ open: true, criancaId: crianca.id })
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Efetivar Matrícula
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setMatriculaDialog({ open: true, criancaId: crianca.id })
                            }
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Recusar
                          </Button>
                        </>
                      )}
                      {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && !crianca.cmei_remanejamento_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRemanejamentoDialog({ open: true, criancaId: crianca.id })
                          }
                        >
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Solicitar Remanejamento
                        </Button>
                      )}
                      {crianca.cmei_remanejamento_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelarRemanejamento.mutate({ criancaId: crianca.id })}
                          disabled={cancelarRemanejamento.isPending}
                          className="text-purple-600 border-purple-300 hover:bg-purple-50"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancelar Remanejamento
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditarDialog({ open: true, criancaId: crianca.id })
                        }
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDetailsDialog({ open: true, criancaId: crianca.id })
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setHistoricoDialog({ open: true, criancaId: crianca.id })
                        }
                      >
                        <History className="mr-2 h-4 w-4" />
                        Histórico
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadComprovante(crianca.id, "inscricao")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Comprovante
                      </Button>
                      {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadComprovante(crianca.id, "matricula")}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Comprovante Matrícula
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detalhes Dialog */}
      <Dialog
        open={detailsDialog.open}
        onOpenChange={(open) => setDetailsDialog({ ...detailsDialog, open })}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Detalhes da Inscrição</DialogTitle>
            <DialogDescription>
              Informações completas do cadastro
            </DialogDescription>
          </DialogHeader>

          {criancaDetails ? (
            <ScrollArea className="max-h-[60vh] pr-2 sm:pr-4">
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <h3 className="font-semibold mb-3">Status Atual</h3>
                  <Badge variant={getStatusBadgeVariant(criancaDetails.status)} className="text-base px-3 py-1">
                    {criancaDetails.status}
                  </Badge>
                  {criancaDetails.status === "Fila de Espera" && posicaoMap.has(criancaDetails.id) && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Posição na fila: {posicaoMap.get(criancaDetails.id)}ª • Prioridade: {criancaDetails.prioridade}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Timeline de Status */}
                <div>
                  <h3 className="font-semibold mb-3">Linha do Tempo</h3>
                  <StatusTimeline criancaId={criancaDetails.id} maxItems={5} />
                </div>

                <Separator />

                {/* Botões de Download */}
                <div>
                  <h3 className="font-semibold mb-3">Documentos</h3>
                  {loadingResumoDocs ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Spinner className="h-4 w-4 animate-spin" />
                      Carregando status da documentação...
                    </div>
                  ) : resumoDocs ? (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={resumoDocs.pendentes > 0 ? "secondary" : "default"}>
                          {resumoDocs.aprovados}/{resumoDocs.total} obrigatórios aprovados
                        </Badge>
                        {resumoDocs.pendentes > 0 && (
                          <Badge variant="destructive">{resumoDocs.pendentes} pendente(s)</Badge>
                        )}
                      </div>
                      {resumoDocs.pendentes > 0 && resumoDocs.nomesPendentes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Pendentes: {resumoDocs.nomesPendentes.join(", ")}
                        </p>
                      )}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadComprovante(criancaDetails.id, "inscricao")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Comprovante Inscrição
                    </Button>
                    {(criancaDetails.status === "Matriculado" || criancaDetails.status === "Matriculada") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadComprovante(criancaDetails.id, "matricula")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Comprovante Matrícula
                      </Button>
                    )}
                    {criancaDetails.status === "Convocado" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadComprovante(criancaDetails.id, "convocacao")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Comprovante Convocação
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadFicha(criancaDetails.id)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Ficha Completa
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* CMEI Atual */}
                {criancaDetails.cmei_atual && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-3">{singular} Matriculado</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{criancaDetails.cmei_atual.nome}</p>
                            <p className="text-muted-foreground">{criancaDetails.cmei_atual.endereco}</p>
                          </div>
                        </div>
                        {criancaDetails.cmei_atual.telefone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <p className="text-muted-foreground">{criancaDetails.cmei_atual.telefone}</p>
                          </div>
                        )}
                        {criancaDetails.turma_atual && (
                          <p className="text-muted-foreground">
                            Turma: {criancaDetails.turma_atual.nome} - {criancaDetails.turma_atual.turno}
                          </p>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Preferências */}
                <div>
                  <h3 className="font-semibold mb-3">Preferências de {singular}</h3>
                  <div className="text-sm space-y-2">
                    {criancaDetails.cmei1 && (
                      <div>
                        <span className="text-muted-foreground">1ª Opção:</span>
                        <p className="font-medium">{criancaDetails.cmei1.nome}</p>
                      </div>
                    )}
                    {criancaDetails.cmei2 && (
                      <div>
                        <span className="text-muted-foreground">2ª Opção:</span>
                        <p className="font-medium">{criancaDetails.cmei2.nome}</p>
                      </div>
                    )}
                    {criancaDetails.cmei3 && (
                      <div>
                        <span className="text-muted-foreground">3ª Opção:</span>
                        <p className="font-medium">{criancaDetails.cmei3.nome}</p>
                      </div>
                    )}
                    {criancaDetails.aceita_qualquer_cmei && (
                      <p className="text-muted-foreground italic">
                        Aceita qualquer {singular} disponível
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Data de Nascimento */}
                <div>
                  <h3 className="font-semibold mb-3">Informações da Criança</h3>
                  <div className="text-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Data de Nascimento:</span>
                        <p className="font-medium">
                          {format(new Date(criancaDetails.data_nascimento), "dd/MM/yyyy", {
                            locale: ptBR,
                          })} ({calcularIdade(criancaDetails.data_nascimento)})
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
                        <p className="font-medium mt-1">{criancaDetails.cpf_crianca || "Não informado"}</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Certidão</p>
                        <p className="font-medium mt-1">{criancaDetails.certidao_nascimento || "Não informado"}</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">NIS</p>
                        <p className="font-medium mt-1">{criancaDetails.nis || "Não informado"}</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Nacionalidade</p>
                        <p className="font-medium mt-1">
                          {criancaDetails.nacionalidade
                            ? `${labelNacionalidade(criancaDetails.nacionalidade)}${criancaDetails.nacionalidade === "estrangeira" ? ` | Possui documentos: ${formatSimNao(criancaDetails.estrangeiro_possui_documentos)}` : ""}`
                            : "Não informado"}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Cor/Raça (Autodecl.)</p>
                        <p className="font-medium mt-1">{criancaDetails.cor_raca_autodeclarada ? labelCorRaca(criancaDetails.cor_raca_autodeclarada) : "Não informado"}</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Etnia Indígena</p>
                        <p className="font-medium mt-1">{criancaDetails.etnia_indigena ? labelEtniaIndigena(criancaDetails.etnia_indigena, criancaDetails.etnia_indigena_outra) : "Não informado"}</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-lg sm:col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Moradia</p>
                        <p className="font-medium mt-1">
                          {criancaDetails.forma_ocupacao_moradia
                            ? labelFormaMoradia(criancaDetails.forma_ocupacao_moradia, criancaDetails.forma_ocupacao_moradia_outro)
                            : "Não informado"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Histórico Dialog */}
      <Dialog
        open={historicoDialog.open}
        onOpenChange={(open) => setHistoricoDialog({ ...historicoDialog, open })}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Histórico</DialogTitle>
            <DialogDescription>
              Todas as movimentações e alterações de status
            </DialogDescription>
          </DialogHeader>

          {loadingHistorico ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : historico && historico.length > 0 ? (
            <ScrollArea className="max-h-[60vh] pr-2 sm:pr-4">
              <div className="space-y-4">
                {historico.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{item.acao}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.created_at!), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      {item.status_novo && (
                        <Badge variant={getStatusBadgeVariant(item.status_novo)}>
                          {item.status_novo}
                        </Badge>
                      )}
                    </div>

                    {item.descricao && (
                      <p className="text-sm">{item.descricao}</p>
                    )}

                    {(item.status_anterior || item.cmei_anterior_nome || item.turma_anterior_nome) && (
                      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                        {item.status_anterior && item.status_novo && (
                          <div>
                            Status: {item.status_anterior} → {item.status_novo}
                          </div>
                        )}
                        {item.cmei_anterior_nome && item.cmei_novo_nome && (
                          <div>
                            {singular}: {item.cmei_anterior_nome.nome} → {item.cmei_novo_nome.nome}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum histórico disponível.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Matrícula Dialog */}
      <MatriculaDialog
        open={matriculaDialog.open}
        onOpenChange={(open) => setMatriculaDialog({ ...matriculaDialog, open })}
        crianca={criancaMatricula}
      />

      {/* Remanejamento Dialog */}
      <SolicitarRemanejamentoDialog
        open={remanejamentoDialog.open}
        onOpenChange={(open) => setRemanejamentoDialog({ ...remanejamentoDialog, open })}
        crianca={criancaRemanejamento ? {
          id: criancaRemanejamento.id,
          nome: criancaRemanejamento.nome,
          cmei_atual: criancaRemanejamento.cmei_atual,
          cmei_atual_id: criancaRemanejamento.cmei_atual_id,
        } : null}
      />

      {/* Editar Dialog */}
      <EditarCriancaDialog
        open={editarDialog.open}
        onOpenChange={(open) => setEditarDialog({ ...editarDialog, open })}
        criancaId={editarDialog.criancaId}
      />
    </ResponsavelLayout>
  );
};

export default ResponsavelDashboard;

