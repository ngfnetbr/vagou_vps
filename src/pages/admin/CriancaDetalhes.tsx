import { useState, useRef } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, User, Phone, Mail, MapPin, School, Users, History, Edit, CheckCircle2, XCircle, RefreshCcw, ArrowRightLeft, AlertCircle, FileDown, FileText, Calendar, Clock, Baby, Star, Upload, RotateCw, IdCard, Home, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConvocacaoDialog } from "@/components/admin/ConvocacaoDialog";
import { RealocacaoDialog } from "@/components/admin/RealocacaoDialog";
import { RemanejamentoDialog } from "@/components/admin/RemanejamentoDialog";
import { TransferenciaDialog } from "@/components/admin/TransferenciaDialog";
import { ImprimirComprovanteButton } from "@/components/admin/ImprimirComprovanteButton";
import { CriancaEditDialog } from "@/components/admin/CriancaEditDialog";
import { useVerificarDocumentosCompletos } from "@/hooks/api/documentos-hooks";
import { usePermission } from "@/hooks/api/permissoes-hooks";
import { gerarFichaCompletaPDF, gerarRequerimentoSerePDF } from "@/utils/pdf-utils";
import { DocumentosDialog } from "@/components/admin/DocumentosDialog";
import { cn } from "@/utils/utils";
import { downloadFromUrl } from "@/utils/download";
import {
  useDocumentosCrianca,
  useDocumentosTiposAtivos,
  useUploadDocumento,
  useAprovarDocumento,
  useRecusarDocumento,
  getSignedDocumentUrl,
  type DocumentoCrianca,
} from "@/hooks/api/documentos-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  useSolicitarRemanejamento,
  useEfetivarTransferencia,
  useCancelarRemanejamento,
  useRealocarTurma,
} from "@/hooks/api/admin-hooks";
import { CamposCustomizadosCard } from "@/components/responsavel/CamposCustomizadosCard";
import { labelCanalNotificacao, labelCorRaca, labelEtniaIndigena, labelFormaMoradia, labelNacionalidade, labelParentesco, formatSimNao } from "@/utils/crianca-labels";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const CriancaDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, hasRole, isAdmin } = useAuth();
  const isDiretor = hasRole("diretor_cmei");
  const canManage = isAdmin() && !isDiretor;
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);

  // Estados para dialogs
  const [convocacaoDialog, setConvocacaoDialog] = useState(false);
  const [realocacaoDialog, setRealocacaoDialog] = useState(false);
  const [remanejamentoDialog, setRemanejamentoDialog] = useState(false);
  const [documentosDialog, setDocumentosDialog] = useState(false);
  const [transferenciaDialog, setTransferenciaDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tab, setTab] = useState<"dados" | "matricula" | "documentos" | "adicionais" | "historico">("dados");
  
  // Estados para documentos inline
  const [recusarDialogOpen, setRecusarDialogOpen] = useState(false);
  const [loadingUrlId, setLoadingUrlId] = useState<string | null>(null);
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoCrianca | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const handleTabChange = (value: string) => {
    setTab(value as typeof tab);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  // Mutations
  const solicitarRemanejamento = useSolicitarRemanejamento();
  const efetivarTransferencia = useEfetivarTransferencia();
  const cancelarRemanejamento = useCancelarRemanejamento();
  const realocarTurma = useRealocarTurma();
  const { data: resumoDocs } = useVerificarDocumentosCompletos(id);
  const podeConvocarPorPermissao = usePermission("fila.convocar");
  const canConvocar = canManage || (isDiretor && podeConvocarPorPermissao);

  // Mutation para confirmar matrícula
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
      queryClient.invalidateQueries({ queryKey: ["crianca-detalhes", id] });
      toast.success("Matrícula confirmada!");
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Mutation para recusar convocação
  const recusarConvocacao = useMutation({
    mutationFn: async (criancaId: string) => {
      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Fila de Espera",
          cmei_atual_id: null,
          turma_atual_id: null,
          convocacao_deadline: null,
          data_convocacao: null,
        })
        .eq("id", criancaId);
      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Convocação Recusada",
        status_anterior: "Convocado",
        status_novo: "Fila de Espera",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca-detalhes", id] });
      toast.success("Criança voltou para fila de espera.");
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Mutation para marcar desistente
  const marcarDesistente = useMutation({
    mutationFn: async (criancaId: string) => {
      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Desistente",
          cmei_atual_id: null,
          turma_atual_id: null,
        })
        .eq("id", criancaId);
      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Marcado como Desistente",
        status_novo: "Desistente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca-detalhes", id] });
      toast.success("Criança marcada como desistente.");
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Mutation para reativar
  const reativarCrianca = useMutation({
    mutationFn: async (criancaId: string) => {
      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Fila de Espera",
          data_penalidade: null,
          data_retorno_fila: new Date().toISOString(),
        })
        .eq("id", criancaId);
      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Criança Reativada",
        status_novo: "Fila de Espera",
      });

      return criancaId;
    },
    onSuccess: async (criancaId) => {
      queryClient.invalidateQueries({ queryKey: ["crianca-detalhes", id] });
      toast.success("Criança reativada e voltou para fila.");

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
    onError: (error: any) => toast.error(error.message),
  });

  // Query para buscar dados da criança
  const { data: crianca, isLoading, error } = useQuery({
    queryKey: ["crianca-detalhes", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(id, nome, endereco, telefone, email),
          turma_atual:turmas!criancas_turma_atual_id_fkey(id, nome, turno, capacidade),
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(id, nome),
          cmei2:cmeis!criancas_cmei2_preferencia_fkey(id, nome),
          cmei3:cmeis!criancas_cmei3_preferencia_fkey(id, nome),
          cmei_remanejamento:cmeis!criancas_cmei_remanejamento_id_fkey(id, nome)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Query para histórico
  const { data: historico, isLoading: loadingHistorico } = useQuery({
    queryKey: ["crianca-historico", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("historico")
        .select(`
          *,
          cmei_anterior_rel:cmeis!historico_cmei_anterior_fkey(nome),
          cmei_novo_rel:cmeis!historico_cmei_novo_fkey(nome),
          turma_anterior_rel:turmas!historico_turma_anterior_fkey(nome),
          turma_novo_rel:turmas!historico_turma_novo_fkey(nome)
        `)
        .eq("crianca_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Hooks para documentos
  const { data: documentos, isLoading: loadingDocs } = useDocumentosCrianca(id);
  const { data: tiposDocumentos, isLoading: loadingTipos } = useDocumentosTiposAtivos();
  const uploadMutation = useUploadDocumento();
  const aprovarMutation = useAprovarDocumento();
  const recusarMutation = useRecusarDocumento();

  // Handlers para documentos
  const handleViewDoc = async (documento: DocumentoCrianca) => {
    setLoadingUrlId(documento.id);
    try {
      const url = await getSignedDocumentUrl(documento.arquivo_url);
      if (url) {
        await downloadFromUrl(url, documento.arquivo_nome || "documento");
        toast.success("Download iniciado");
      } else {
        toast.error("Não foi possível gerar o link de download.");
      }
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
      toast.error("Erro ao baixar o documento.");
    } finally {
      setLoadingUrlId(null);
    }
  };

  const handleFileChange = async (tipoId: string, file: File | null) => {
    if (!file || !user || !id) return;
    await uploadMutation.mutateAsync({
      criancaId: id,
      tipoDocumentoId: tipoId,
      file,
      userId: user.id,
    });
  };

  const handleAprovarDoc = async (documento: DocumentoCrianca) => {
    if (!user || !id) return;
    await aprovarMutation.mutateAsync({
      id: documento.id,
      criancaId: id,
      userId: user.id,
    });
  };

  const handleRecusarDoc = (documento: DocumentoCrianca) => {
    setSelectedDocumento(documento);
    setMotivoRecusa("");
    setRecusarDialogOpen(true);
  };

  const handleConfirmRecusar = async () => {
    if (!selectedDocumento || !motivoRecusa.trim() || !id) return;
    await recusarMutation.mutateAsync({
      id: selectedDocumento.id,
      criancaId: id,
      motivo: motivoRecusa,
    });
    setRecusarDialogOpen(false);
  };

  const getDocumentoByTipo = (tipoId: string) => {
    return documentos?.find((d) => d.tipo_documento_id === tipoId);
  };

  const getStatusBadgeDoc = (documento: DocumentoCrianca | undefined) => {
    if (!documento) {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Não enviado
        </Badge>
      );
    }
    switch (documento.status) {
      case "aprovado":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Aprovado
          </Badge>
        );
      case "recusado":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Recusado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Spinner className="h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !crianca) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Criança não encontrada</h2>
          <Button variant="outline" onClick={() => navigate("/modulo/vagou/admin/criancas")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para lista
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const calcularIdade = () => {
    const hoje = new Date();
    const nascimento = parseDate(crianca.data_nascimento);
    if (!nascimento) return "-";
    const meses = differenceInMonths(hoje, nascimento);
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;

    if (anos === 0) return `${meses} meses`;
    if (mesesRestantes === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
    return `${anos} ${anos === 1 ? "ano" : "anos"} e ${mesesRestantes} ${mesesRestantes === 1 ? "mês" : "meses"}`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Matriculado":
      case "Matriculada":
        return "default";
      case "Convocado":
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

  const getPrazoInfo = () => {
    if (crianca.status !== "Convocado" || !crianca.convocacao_deadline) return null;
    const dias = differenceInDays(new Date(crianca.convocacao_deadline), new Date());
    return { dias, vencido: dias < 0 };
  };

  const prazoInfo = getPrazoInfo();
  const parseDate = (input?: string | null) => {
    if (!input) return null;
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  };
  const formatDate = (input?: string | null) => {
    const d = parseDate(input);
    return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "-";
  };

  return (
    <AdminLayout>
      <div className="space-y-3">
        {/* Header Melhorado */}
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 sm:p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_55%)]" />
            <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className={cn(
                    "flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ring-2 shadow-sm",
                    crianca.sexo === "Feminino"
                      ? "bg-pink-100 text-pink-600 ring-pink-100/60 dark:bg-pink-950/40 dark:text-pink-300 dark:ring-pink-900/40"
                      : crianca.sexo === "Masculino"
                      ? "bg-blue-100 text-blue-600 ring-blue-100/60 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/40"
                      : "bg-primary/15 text-primary ring-primary/10"
                  )}>
                    <User className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-lg sm:text-xl md:text-2xl font-bold tracking-tight">{crianca.nome}</h1>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(crianca.data_nascimento)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {calcularIdade()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {crianca.sexo}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {canManage && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
                <Badge variant={getStatusBadgeVariant(crianca.status)} className="px-2.5 py-1 text-xs">
                  {crianca.status}
                </Badge>
                {crianca.prioridade && crianca.prioridade !== "Geral" && (
                  <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs">
                    <Star className="h-3 w-3" />
                    {crianca.prioridade}
                  </Badge>
                )}
              </div>
            </div>

            {/* Info rápida */}
            <div className="relative mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-3 md:grid-cols-4">
              {[
                { icon: User, label: "Responsável", value: crianca.responsavel_nome, show: true },
                { icon: Phone, label: "Telefone", value: crianca.responsavel_telefone, show: true },
                { icon: School, label: `${singular} Atual`, value: crianca.cmei_atual?.nome, show: !!crianca.cmei_atual },
                { icon: Users, label: "Turma", value: crianca.turma_atual?.nome, show: !!crianca.turma_atual },
                { icon: Clock, label: "Posição na Fila", value: crianca.posicao_fila ? `#${crianca.posicao_fila}` : null, show: !!crianca.posicao_fila && crianca.status === "Fila de Espera" },
              ].filter((i) => i.show).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-background/60 p-2 ring-1 ring-border/40">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="truncate text-xs sm:text-sm font-semibold">{item.value || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Alerta de Prazo */}
        {prazoInfo && (
          <Card className={prazoInfo.vencido ? "border-destructive bg-destructive/5" : prazoInfo.dias <= 3 ? "border-warning bg-warning/5" : ""}>
            <CardContent className="py-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className={`h-4 w-4 shrink-0 ${prazoInfo.vencido ? "text-destructive" : "text-warning"}`} />
                <div>
                  <p className="text-sm font-medium">
                    {prazoInfo.vencido
                      ? "Prazo de convocação vencido!"
                      : prazoInfo.dias === 0
                      ? "Último dia para responder à convocação!"
                      : `${prazoInfo.dias} ${prazoInfo.dias === 1 ? "dia" : "dias"} restantes para responder`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Prazo: {format(new Date(crianca.convocacao_deadline), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações Rápidas */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <RefreshCcw className="h-3.5 w-3.5 text-primary" />
              </span>
              Ações
            </CardTitle>
          </CardHeader>

          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-2">
              {crianca.status === "Fila de Espera" && canConvocar && (
                <Button size="sm" onClick={() => setConvocacaoDialog(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Convocar
                </Button>
              )}
              {crianca.status === "Convocado" && (canManage || isDiretor) && (
                <>
                  <Button
                    size="sm"
                    onClick={() => confirmarMatricula.mutate(crianca.id)}
                    disabled={confirmarMatricula.isPending || (isDiretor && (resumoDocs?.pendentes ?? 0) > 0)}
                    title={
                      isDiretor && (resumoDocs?.pendentes ?? 0) > 0
                        ? `Documentos pendentes: ${(resumoDocs?.nomesPendentes || []).join(", ")}`
                        : undefined
                    }
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmar Matrícula
                  </Button>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => recusarConvocacao.mutate(crianca.id)}
                      disabled={recusarConvocacao.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Recusar
                    </Button>
                  )}
                </>
              )}
              {canManage && (
                <>
                  {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && (
                    <>
                      {canManage && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setRealocacaoDialog(true)}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Realocar Turma
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setRemanejamentoDialog(true)}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            Solicitar Remanejamento
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => marcarDesistente.mutate(crianca.id)}
                            disabled={marcarDesistente.isPending}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Marcar Desistente
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {crianca.status === "Remanejamento Solicitado" && (
                    <>
                      {canManage && (
                        <>
                          <Button size="sm" onClick={() => setTransferenciaDialog(true)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Efetivar Transferência
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelarRemanejamento.mutate(crianca.id)}
                            disabled={cancelarRemanejamento.isPending}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar Remanejamento
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {(crianca.status === "Desistente" || crianca.status === "Recusada") && (
                    canManage ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reativarCrianca.mutate(crianca.id)}
                        disabled={reativarCrianca.isPending}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reativar
                      </Button>
                    ) : null
                  )}
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDocumentosDialog(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Documentos
              </Button>

              {canManage && <Separator orientation="vertical" className="h-8" />}

              <ImprimirComprovanteButton criancaId={crianca.id} tipo="inscricao" />
              {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && (
                <ImprimirComprovanteButton criancaId={crianca.id} tipo="matricula" />
              )}
              {crianca.status === "Convocado" && (
                <ImprimirComprovanteButton criancaId={crianca.id} tipo="convocacao" />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    toast.loading("Gerando ficha completa...");
                    await gerarFichaCompletaPDF(crianca.id);
                    toast.dismiss();
                    toast.success("Ficha completa gerada com sucesso!");
                  } catch (error: any) {
                    toast.dismiss();
                    toast.error("Erro ao gerar ficha: " + error.message);
                  }
                }}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Ficha Completa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    toast.loading("Gerando requerimento SERE...");
                    await gerarRequerimentoSerePDF(crianca.id);
                    toast.dismiss();
                    toast.success("Requerimento SERE gerado com sucesso!");
                  } catch (error: any) {
                    toast.dismiss();
                    toast.error("Erro ao gerar requerimento: " + error.message);
                  }
                }}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Requerimento SERE
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs com informações detalhadas */}
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
            <TabsTrigger value="dados" className="gap-1.5 flex-shrink-0">
              <IdCard className="h-4 w-4" />
              <span className="hidden sm:inline">Dados Cadastrais</span>
              <span className="sm:hidden">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="matricula" className="gap-1.5 flex-shrink-0">
              <School className="h-4 w-4" />
              Matrícula
            </TabsTrigger>
            <TabsTrigger value="documentos" className="gap-1.5 flex-shrink-0">
              <FileText className="h-4 w-4" />
              Documentos
              {(() => {
                const pendentes = documentos?.filter(d => d.status === "pendente").length || 0;
                const obrigatoriosIds = tiposDocumentos?.filter(t => t.obrigatorio).map(t => t.id) || [];
                const enviadosIds = documentos?.map(d => d.tipo_documento_id) || [];
                const faltantes = obrigatoriosIds.filter(id => !enviadosIds.includes(id)).length;
                
                if (pendentes > 0) {
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs cursor-help">
                            {pendentes}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{pendentes} documento{pendentes > 1 ? 's' : ''} pendente{pendentes > 1 ? 's' : ''} de aprovação</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                if (faltantes > 0) {
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs cursor-help">
                            {faltantes}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{faltantes} documento{faltantes > 1 ? 's' : ''} obrigatório{faltantes > 1 ? 's' : ''} não enviado{faltantes > 1 ? 's' : ''}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                return null;
              })()}
            </TabsTrigger>
            <TabsTrigger value="adicionais" className="gap-1.5 flex-shrink-0">
              <Star className="h-4 w-4" />
              Adicionais
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5 flex-shrink-0">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Dados da Criança */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    Dados da Criança
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  <div className="space-y-4">
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Nome Completo</p>
                      <p className="font-semibold text-lg mt-1">{crianca.nome}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Data de Nascimento</p>
                        <p className="font-medium mt-1">
                          {formatDate(crianca.data_nascimento)}
                        </p>
                      </div>
                      <div className="p-2.5 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Idade</p>
                        <p className="font-medium mt-1">{calcularIdade()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Sexo</p>
                        <p className="font-medium mt-1">{crianca.sexo}</p>
                      </div>
                      <div className="p-2.5 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
                        <p className="font-medium mt-1">{crianca.cpf_crianca || "Não informado"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant={crianca.programas_sociais ? "default" : "outline"}>
                        {crianca.programas_sociais ? "Participa de Programas Sociais" : "Não participa de Programas Sociais"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Responsável */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    Responsável
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  <div className="space-y-4">
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Nome Completo</p>
                      <p className="font-semibold text-lg mt-1">{crianca.responsavel_nome}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
                      <p className="font-medium mt-1">{crianca.responsavel_cpf}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <Phone className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <p className="font-medium">{crianca.responsavel_telefone}</p>
                        </div>
                      </div>
                      {crianca.responsavel_celular && (
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                          <Phone className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Celular</p>
                            <p className="font-medium">{crianca.responsavel_celular}</p>
                          </div>
                        </div>
                      )}
                      {crianca.responsavel_email && (
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                          <Mail className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">E-mail</p>
                            <p className="font-medium">{crianca.responsavel_email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Endereço */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  {crianca.logradouro ? (
                    <div className="space-y-3">
                      <div className="p-2.5 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Logradouro</p>
                        <p className="font-medium mt-1">
                          {crianca.logradouro}, {crianca.numero}
                          {crianca.complemento && ` - ${crianca.complemento}`}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-2.5 bg-muted/20 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Bairro</p>
                          <p className="font-medium mt-1">{crianca.bairro || "-"}</p>
                        </div>
                        <div className="p-2.5 bg-muted/20 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">CEP</p>
                          <p className="font-medium mt-1">{crianca.cep || "-"}</p>
                        </div>
                      </div>
                      <div className="p-2.5 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Cidade/Estado</p>
                        <p className="font-medium mt-1">
                          {crianca.cidade || "-"} {crianca.estado && `- ${crianca.estado}`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Endereço não informado</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preferências */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <School className="h-4 w-4 text-primary" />
                    </div>
                    Preferências de {singular}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  <div className="space-y-3">
                    {crianca.cmei1 && (
                      <div className="p-2.5 bg-muted/20 rounded-lg border-l-4 border-primary">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">1ª Preferência</p>
                        <p className="font-medium mt-1">{crianca.cmei1.nome}</p>
                      </div>
                    )}
                    {crianca.cmei2 && (
                      <div className="p-2.5 bg-muted/20 rounded-lg border-l-4 border-secondary">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">2ª Preferência</p>
                        <p className="font-medium mt-1">{crianca.cmei2.nome}</p>
                      </div>
                    )}
                    {crianca.cmei3 && (
                      <div className="p-2.5 bg-muted/20 rounded-lg border-l-4 border-muted-foreground/40">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">3ª Preferência</p>
                        <p className="font-medium mt-1">{crianca.cmei3.nome}</p>
                      </div>
                    )}
                    {!crianca.cmei1 && !crianca.cmei2 && !crianca.cmei3 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>Nenhuma preferência informada</p>
                      </div>
                    )}
                    <div className="pt-2">
                      <Badge variant={crianca.aceita_qualquer_cmei ? "default" : "outline"} className="w-full justify-center py-1.5">
                        {crianca.aceita_qualquer_cmei ? `Aceita qualquer ${singular}` : "Apenas opções selecionadas"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          <TabsContent value="adicionais" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <IdCard className="h-4 w-4 text-primary" />
                    </div>
                    Dados Adicionais da Criança
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Certidão</p>
                      <p className="font-medium mt-1">{crianca.certidao_nascimento || "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">NIS</p>
                      <p className="font-medium mt-1">{crianca.nis || "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Cor/Raça (Autodecl.)</p>
                      <p className="font-medium mt-1">{crianca.cor_raca_autodeclarada ? labelCorRaca(crianca.cor_raca_autodeclarada) : "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Cor/Raça (Certidão)</p>
                      <p className="font-medium mt-1">{crianca.cor_raca_certidao ? labelCorRaca(crianca.cor_raca_certidao) : "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Etnia Indígena</p>
                      <p className="font-medium mt-1">{crianca.etnia_indigena ? labelEtniaIndigena(crianca.etnia_indigena, crianca.etnia_indigena_outra) : "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Quilombo</p>
                      <p className="font-medium mt-1">
                        {crianca.quilombo_remanescente === null || crianca.quilombo_remanescente === undefined
                          ? "Não informado"
                          : `${formatSimNao(crianca.quilombo_remanescente)}${crianca.quilombo_nome ? ` (${crianca.quilombo_nome})` : ""}`}
                      </p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg sm:col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Nacionalidade</p>
                      <p className="font-medium mt-1">
                        {crianca.nacionalidade
                          ? `${labelNacionalidade(crianca.nacionalidade)}${crianca.nacionalidade === "estrangeira" ? ` | Possui documentos: ${formatSimNao(crianca.estrangeiro_possui_documentos)}` : ""}`
                          : "Não informado"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-primary" />
                    </div>
                    Dados do Responsável (Complementares)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">RG</p>
                      <p className="font-medium mt-1">{crianca.responsavel_rg || "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Parentesco</p>
                      <p className="font-medium mt-1">{crianca.responsavel_parentesco ? labelParentesco(crianca.responsavel_parentesco, crianca.responsavel_parentesco_outro) : "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefone Comercial</p>
                      <p className="font-medium mt-1">{crianca.responsavel_telefone_comercial || "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Canal Preferido</p>
                      <p className="font-medium mt-1">{crianca.canal_notificacao_preferido ? labelCanalNotificacao(crianca.canal_notificacao_preferido) : "Não informado"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden md:col-span-2">
                <CardHeader className="bg-muted/30 border-b py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    Filiação
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="space-y-2">
                      <div className="p-2.5 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Filiação 1</p>
                        <p className="font-medium mt-1">{crianca.filiacao1_nao_declarada ? "Não declarada" : (crianca.filiacao1_nome || "Não informado")}</p>
                      </div>
                      {!crianca.filiacao1_nao_declarada && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2.5 bg-muted/20 rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">RG</p>
                            <p className="font-medium mt-1">{crianca.filiacao1_rg || "Não informado"}</p>
                          </div>
                          <div className="p-2.5 bg-muted/20 rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
                            <p className="font-medium mt-1">{crianca.filiacao1_cpf || "Não informado"}</p>
                          </div>
                          <div className="p-2.5 bg-muted/20 rounded-lg sm:col-span-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">E-mail</p>
                            <p className="font-medium mt-1">{crianca.filiacao1_email || "Não informado"}</p>
                          </div>
                          <div className="p-2.5 bg-muted/20 rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Celular</p>
                            <p className="font-medium mt-1">{crianca.filiacao1_celular || "Não informado"}</p>
                          </div>
                          <div className="p-2.5 bg-muted/20 rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tel. Comercial</p>
                            <p className="font-medium mt-1">{crianca.filiacao1_telefone_comercial || "Não informado"}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="p-2.5 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Filiação 2</p>
                        <p className="font-medium mt-1">{crianca.filiacao2_nao_declarada ? "Não declarada" : (crianca.filiacao2_nome || "Não informado")}</p>
                      </div>
                      {!crianca.filiacao2_nao_declarada && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2.5 bg-muted/20 rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">RG</p>
                            <p className="font-medium mt-1">{crianca.filiacao2_rg || "Não informado"}</p>
                          </div>
                          <div className="p-2.5 bg-muted/20 rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF</p>
                            <p className="font-medium mt-1">{crianca.filiacao2_cpf || "Não informado"}</p>
                          </div>
                          <div className="p-2.5 bg-muted/20 rounded-lg sm:col-span-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">E-mail</p>
                            <p className="font-medium mt-1">{crianca.filiacao2_email || "Não informado"}</p>
                          </div>
                          <div className="p-2.5 bg-muted/20 rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Celular</p>
                            <p className="font-medium mt-1">{crianca.filiacao2_celular || "Não informado"}</p>
                          </div>
                          <div className="p-2.5 bg-muted/20 rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tel. Comercial</p>
                            <p className="font-medium mt-1">{crianca.filiacao2_telefone_comercial || "Não informado"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Home className="h-4 w-4 text-primary" />
                    </div>
                    Moradia
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Unidade Consumidora</p>
                      <p className="font-medium mt-1">{crianca.unidade_consumidora || "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Forma de Ocupação</p>
                      <p className="font-medium mt-1">{crianca.forma_ocupacao_moradia ? labelFormaMoradia(crianca.forma_ocupacao_moradia, crianca.forma_ocupacao_moradia_outro) : "Não informado"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <CamposCustomizadosCard criancaId={crianca.id} />
            </div>
          </TabsContent>

          <TabsContent value="matricula" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Status atual */}
              <Card>
                <CardHeader>
                  <CardTitle>Status da Matrícula</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(crianca.status)} className="text-base px-3 py-1">
                      {crianca.status}
                    </Badge>
                    {crianca.prioridade && (
                      <Badge variant={crianca.prioridade === "Social" ? "default" : "outline"}>
                        {crianca.prioridade}
                      </Badge>
                    )}
                  </div>

                  {crianca.posicao_fila && crianca.status === "Fila de Espera" && (
                    <div>
                      <p className="text-sm text-muted-foreground">Posição na Fila</p>
                      <p className="text-2xl font-bold">{crianca.posicao_fila}ª</p>
                    </div>
                  )}

                  {crianca.data_penalidade && (
                    <div className="p-3 bg-warning/10 rounded-lg">
                      <p className="text-sm font-medium text-warning-foreground">Penalidade Aplicada</p>
                      <p className="text-sm text-muted-foreground">
                        Em {format(new Date(crianca.data_penalidade), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Unidade Atual */}
              {crianca.cmei_atual && (
                <Card>
                  <CardHeader>
                    <CardTitle>{singular} Matriculado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-lg font-semibold">{crianca.cmei_atual.nome}</p>
                      {crianca.cmei_atual.endereco && (
                        <p className="text-sm text-muted-foreground">{crianca.cmei_atual.endereco}</p>
                      )}
                    </div>
                    {crianca.turma_atual && (
                      <div>
                        <p className="text-sm text-muted-foreground">Turma</p>
                        <p className="font-medium">
                          {crianca.turma_atual.nome} - {crianca.turma_atual.turno}
                        </p>
                      </div>
                    )}
                    {crianca.cmei_atual.telefone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {crianca.cmei_atual.telefone}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Remanejamento Solicitado */}
              {crianca.cmei_remanejamento && (
                <Card className="border-warning">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRightLeft className="h-5 w-5 text-warning" />
                      Remanejamento Pendente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{singular} Destino Solicitado</p>
                      <p className="font-semibold">{crianca.cmei_remanejamento.nome}</p>
                    </div>
                    {crianca.justificativa_remanejamento && (
                      <div>
                        <p className="text-sm text-muted-foreground">Justificativa</p>
                        <p className="text-sm">{crianca.justificativa_remanejamento}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Convocação */}
              {crianca.status === "Convocado" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Dados da Convocação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {crianca.data_convocacao && (
                      <div>
                        <p className="text-sm text-muted-foreground">Data da Convocação</p>
                        <p className="font-medium">
                          {format(new Date(crianca.data_convocacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                    {crianca.convocacao_deadline && (
                      <div>
                        <p className="text-sm text-muted-foreground">Prazo para Resposta</p>
                        <p className="font-medium">
                          {format(new Date(crianca.convocacao_deadline), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Preferências */}
              {(crianca.cmei1 || crianca.cmei2 || crianca.cmei3 || crianca.aceita_qualquer_cmei) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preferências de {singular}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {crianca.cmei1 && (
                      <div>
                        <p className="text-sm text-muted-foreground">1ª Preferência</p>
                        <p className="font-medium">{crianca.cmei1.nome}</p>
                      </div>
                    )}
                    {crianca.cmei2 && (
                      <div>
                        <p className="text-sm text-muted-foreground">2ª Preferência</p>
                        <p className="font-medium">{crianca.cmei2.nome}</p>
                      </div>
                    )}
                    {crianca.cmei3 && (
                      <div>
                        <p className="text-sm text-muted-foreground">3ª Preferência</p>
                        <p className="font-medium">{crianca.cmei3.nome}</p>
                      </div>
                    )}
                    <div className="pt-2">
                      <Badge variant={crianca.aceita_qualquer_cmei ? "default" : "outline"}>
                        {crianca.aceita_qualquer_cmei ? `Aceita qualquer ${singular}` : `Não aceita qualquer ${singular}`}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Movimentações
                </CardTitle>
                <CardDescription>Todas as ações realizadas nesta inscrição</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistorico ? (
                  <div className="flex justify-center py-8">
                    <Spinner className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : historico && historico.length > 0 ? (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {historico.map((item, index) => (
                        <div key={item.id} className="relative pl-6 pb-4">
                          {index < historico.length - 1 && (
                            <div className="absolute left-2 top-4 bottom-0 w-px bg-border" />
                          )}
                          <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary" />
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{item.acao}</p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            {item.descricao && (
                              <p className="text-sm text-muted-foreground">{item.descricao}</p>
                            )}
                            {item.justificativa && (
                              <p className="text-sm italic text-muted-foreground">
                                "{item.justificativa}"
                              </p>
                            )}
                            {(item.status_anterior || item.status_novo) && (
                              <div className="flex items-center gap-2 text-sm">
                                {item.status_anterior && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.status_anterior}
                                  </Badge>
                                )}
                                {item.status_anterior && item.status_novo && <span>→</span>}
                                {item.status_novo && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.status_novo}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {(item.cmei_anterior_rel || item.cmei_novo_rel) && (
                              <p className="text-xs text-muted-foreground">
                                {singular}: {item.cmei_anterior_rel?.nome || "—"} → {item.cmei_novo_rel?.nome || "—"}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">Nenhum histórico disponível</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Documentos */}
          <TabsContent value="documentos" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos
                </CardTitle>
                <CardDescription>
                  Gerencie os documentos necessários para matrícula
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDocs || loadingTipos ? (
                  <div className="flex justify-center py-8">
                    <Spinner className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tiposDocumentos?.map((tipo) => {
                      const documento = getDocumentoByTipo(tipo.id);
                      return (
                        <div
                          key={tipo.id}
                          className={cn(
                            "p-5 border rounded-xl transition-all duration-200 shadow-sm border-l-4",
                            documento?.status === "aprovado"
                              ? "bg-green-50/30 dark:bg-green-950/10 border-green-500 border-y-border border-r-border"
                              : documento?.status === "recusado"
                              ? "bg-destructive/5 border-destructive border-y-border border-r-border"
                              : documento?.status === "pendente"
                              ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-500 border-y-border border-r-border"
                              : "bg-muted/20 border-muted-foreground/20 border-y-border border-r-border"
                          )}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-base">{tipo.nome}</span>
                                {tipo.obrigatorio && (
                                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-background/50">
                                    Obrigatório
                                  </Badge>
                                )}
                              </div>
                              {tipo.descricao && (
                                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{tipo.descricao}</p>
                              )}
                            </div>
                            {documento ? (
                              documento.status === "aprovado" ? (
                                <Badge variant="default" className="gap-1.5 bg-green-600 hover:bg-green-600 shadow-sm px-2.5 py-0.5">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Aprovado
                                </Badge>
                              ) : documento.status === "recusado" ? (
                                <Badge variant="destructive" className="gap-1.5 shadow-sm px-2.5 py-0.5">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Recusado
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-sm px-2.5 py-0.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  Pendente
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="gap-1.5 text-muted-foreground border-muted-foreground/30 px-2.5 py-0.5">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Ausente
                              </Badge>
                            )}
                          </div>

                          {documento && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/20 rounded-lg border border-border/50 shadow-inner">
                                <div className="flex items-center gap-3 text-sm font-medium min-w-0">
                                  <div className={cn(
                                    "p-2 rounded-md",
                                    documento.status === "aprovado" ? "bg-green-100 dark:bg-green-900/40 text-green-600" :
                                    documento.status === "recusado" ? "bg-destructive/10 text-destructive" :
                                    "bg-amber-100 dark:bg-amber-900/40 text-amber-600"
                                  )}>
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <span className="truncate">{documento.arquivo_nome || "documento"}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleViewDoc(documento)}
                                    disabled={loadingUrlId === documento.id}
                                    className="h-9 px-3 font-bold"
                                  >
                                    {loadingUrlId === documento.id ? (
                                      <Spinner className="h-4 w-4 animate-spin mr-1.5" />
                                    ) : (
                                      <FileDown className="h-4 w-4 mr-1.5" />
                                    )}
                                    Baixar
                                  </Button>
                                  {documento.status === "pendente" && (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleAprovarDoc(documento)}
                                        disabled={aprovarMutation.isPending}
                                        className="h-9 px-3 bg-green-600 hover:bg-green-700 font-bold"
                                      >
                                        {aprovarMutation.isPending ? (
                                          <Spinner className="h-4 w-4 animate-spin mr-1.5" />
                                        ) : (
                                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                        )}
                                        Aprovar
                                      </Button>
                                      <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={() => handleRecusarDoc(documento)}
                                        className="h-9 px-3 font-bold"
                                      >
                                        <XCircle className="h-4 w-4 mr-1.5" />
                                        Recusar
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {documento.status === "recusado" && documento.motivo_recusa && (
                                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive text-sm flex gap-2">
                                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="font-bold uppercase text-xs">Motivo da recusa:</strong>
                                    <p className="mt-0.5">{documento.motivo_recusa}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {(!documento || documento.status === "recusado" || documento.status === "aprovado") && (
                            <div className={cn("mt-4 pt-4 border-t border-dashed", documento && "mt-3 pt-3")}>
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 opacity-50" />
                                  {documento?.status === "aprovado" 
                                    ? "Deseja atualizar este documento aprovado?" 
                                    : !documento 
                                    ? "Nenhum arquivo enviado."
                                    : "Substituir arquivo atual?"
                                  }
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fileInputRefs.current[tipo.id]?.click()}
                                  disabled={uploadMutation.isPending}
                                  className="h-9 px-4 gap-2 shrink-0 font-bold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                                >
                                  {uploadMutation.isPending ? (
                                    <Spinner className="h-4 w-4 animate-spin" />
                                  ) : documento?.status === "aprovado" ? (
                                    <RotateCw className="h-4 w-4" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                  {documento?.status === "aprovado" ? "Atualizar Arquivo" : "Enviar Arquivo"}
                                </Button>
                              </div>
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                ref={(el) => { fileInputRefs.current[tipo.id] = el; }}
                                onChange={(e) => handleFileChange(tipo.id, e.target.files?.[0] || null)}
                                className="hidden"
                              />
                              <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider font-medium opacity-70">Formatos aceitos: PDF, JPG, PNG (máx. 10MB)</p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {(!tiposDocumentos || tiposDocumentos.length === 0) && (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Nenhum tipo de documento configurado</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Dialog de Recusa de Documento */}
      <AlertDialog open={recusarDialogOpen} onOpenChange={setRecusarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da recusa. O responsável será notificado e poderá enviar um novo documento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motivo">Motivo da recusa *</Label>
            <Textarea
              id="motivo"
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              placeholder="Ex: Documento ilegível, data de validade expirada..."
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRecusar}
              disabled={!motivoRecusa.trim() || recusarMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {recusarMutation.isPending && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              Recusar Documento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      {canConvocar && (
        <ConvocacaoDialog
          open={convocacaoDialog}
          onOpenChange={setConvocacaoDialog}
          criancaId={crianca.id}
          criancaNome={crianca.nome}
        />
      )}

      {canManage && (
        <>
          <CriancaEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} criancaId={crianca.id} />

          <RealocacaoDialog
            open={realocacaoDialog}
            onOpenChange={setRealocacaoDialog}
            crianca={{
              id: crianca.id,
              nome: crianca.nome,
              data_nascimento: crianca.data_nascimento,
              cmei_atual_id: crianca.cmei_atual_id || undefined,
              cmei_atual: crianca.cmei_atual ? { id: crianca.cmei_atual.id, nome: crianca.cmei_atual.nome } : undefined,
              turma_atual_id: crianca.turma_atual_id || undefined,
              turma_atual: crianca.turma_atual ? { id: crianca.turma_atual.id, nome: crianca.turma_atual.nome, turno: crianca.turma_atual.turno } : undefined,
            }}
            onConfirm={(turmaId, motivo) => {
              realocarTurma.mutate(
                { criancaId: crianca.id, turmaNova: turmaId, motivo },
                { onSuccess: () => setRealocacaoDialog(false) }
              );
            }}
            loading={realocarTurma.isPending}
          />

          <RemanejamentoDialog
            open={remanejamentoDialog}
            onOpenChange={setRemanejamentoDialog}
            crianca={{
              id: crianca.id,
              nome: crianca.nome,
              cmei_atual: crianca.cmei_atual ? { id: crianca.cmei_atual.id, nome: crianca.cmei_atual.nome } : undefined,
              status: crianca.status,
            }}
            onConfirm={(cmeiDestinoId, justificativa) => {
              solicitarRemanejamento.mutate(
                { criancaId: crianca.id, cmeiDestinoId, justificativa },
                { onSuccess: () => setRemanejamentoDialog(false) }
              );
            }}
            loading={solicitarRemanejamento.isPending}
          />

          <TransferenciaDialog
            open={transferenciaDialog}
            onOpenChange={setTransferenciaDialog}
            crianca={{
              id: crianca.id,
              nome: crianca.nome,
              cmei_atual: crianca.cmei_atual ? { id: crianca.cmei_atual.id, nome: crianca.cmei_atual.nome } : undefined,
              cmei_remanejamento_id: crianca.cmei_remanejamento_id || undefined,
              justificativa_remanejamento: crianca.justificativa_remanejamento || undefined,
            }}
            onConfirm={() => {
              efetivarTransferencia.mutate(crianca.id, {
                onSuccess: () => setTransferenciaDialog(false),
              });
            }}
            loading={efetivarTransferencia.isPending}
          />
        </>
      )}

      <DocumentosDialog
        open={documentosDialog}
        onOpenChange={setDocumentosDialog}
        criancaId={crianca.id}
        criancaNome={crianca.nome}
        readOnly={false}
      />
    </AdminLayout>
  );
};

export default CriancaDetalhes;
