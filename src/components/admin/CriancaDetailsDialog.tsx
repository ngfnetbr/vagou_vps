import { useRef, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useCMEIs, useTurmas } from "@/hooks/api/supabase-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { toast } from "sonner";
import { Save, User, Users, MapPin, Calendar, CheckCircle2, Clock, XCircle, RefreshCcw, IdCard, Home, Bell } from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ImprimirComprovanteButton } from "@/components/admin/ImprimirComprovanteButton";
import { useHistoricoRealtimeUpdates } from "@/hooks/use-realtime-updates";
import { CamposCustomizadosCard } from "@/components/responsavel/CamposCustomizadosCard";
import { getAcaoLabel } from "@/utils/historico-utils";
import { labelCanalNotificacao, labelCorRaca, labelEtniaIndigena, labelFormaMoradia, labelNacionalidade, labelParentesco, formatSimNao } from "@/utils/crianca-labels";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface CriancaDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId?: string;
}

export function CriancaDetailsDialog({ open, onOpenChange, criancaId }: CriancaDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [tab, setTab] = useState<"dados" | "matricula" | "adicionais" | "historico">("dados");
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  // Habilitar atualizações em tempo real do histórico
  useHistoricoRealtimeUpdates(false);
  
  const { data: cmeis } = useCMEIs();

  // Mutations para ações rápidas
  const reativarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Fila de Espera",
          data_penalidade: null,
          data_retorno_fila: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: id,
        acao: "Criança Reativada",
        status_novo: "Fila de Espera",
      });

      return id;
    },
    onSuccess: async (reativadoId) => {
      queryClient.invalidateQueries({ queryKey: ["crianca-details-dialog", criancaId] });
      queryClient.invalidateQueries({ queryKey: ["crianca-historico-dialog", criancaId] });
      queryClient.invalidateQueries({ queryKey: ["fila-espera"] });
      toast.success("Criança reativada!");

      // Enviar notificação de inscrição (reativação)
      try {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            crianca_id: reativadoId,
            tipo: 'inscricao_realizada'
          }
        });
      } catch (e) {
        console.error('Erro ao enviar notificação de reativação:', e);
      }
    },
    onError: (error: any) => toast.error(error.message),
  });

  const desistenteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Desistente",
          cmei_atual_id: null,
          turma_atual_id: null,
        })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: id,
        acao: "Marcado como Desistente",
        status_novo: "Desistente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca-details-dialog", criancaId] });
      queryClient.invalidateQueries({ queryKey: ["crianca-historico-dialog", criancaId] });
      queryClient.invalidateQueries({ queryKey: ["fila-espera"] });
      toast.success("Criança marcada como desistente.");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const confirmarMatriculaMutation = useMutation({
    mutationFn: async (id: string) => {
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
        status_anterior: "Convocado",
        status_novo: "Matriculado",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca-details-dialog", criancaId] });
      queryClient.invalidateQueries({ queryKey: ["crianca-historico-dialog", criancaId] });
      queryClient.invalidateQueries({ queryKey: ["fila-espera"] });
      toast.success("Matrícula confirmada!");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const recusarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Fila de Espera",
          data_penalidade: new Date().toISOString(),
          cmei_atual_id: null,
          turma_atual_id: null,
          convocacao_deadline: null,
          data_convocacao: null,
        })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: id,
        acao: "Convocação Recusada",
        status_anterior: "Convocado",
        status_novo: "Fila de Espera",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca-details-dialog", criancaId] });
      queryClient.invalidateQueries({ queryKey: ["crianca-historico-dialog", criancaId] });
      queryClient.invalidateQueries({ queryKey: ["fila-espera"] });
      toast.success("Convocação recusada. Criança voltou para fim de fila.");
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Buscar detalhes da criança
  const { data: crianca, isLoading } = useQuery({
    queryKey: ["crianca-details-dialog", criancaId],
    queryFn: async () => {
      if (!criancaId) return null;

      const { data, error } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, endereco, bairro),
          turma_atual:turmas!criancas_turma_atual_id_fkey(nome, turno),
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome),
          cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome),
          cmei3:cmeis!criancas_cmei3_preferencia_fkey(nome)
        `)
        .eq("id", criancaId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!criancaId,
  });

  // Buscar histórico
  const { data: historico } = useQuery({
    queryKey: ["crianca-historico-dialog", criancaId],
    queryFn: async () => {
      if (!criancaId) return null;

      const { data, error } = await supabase
        .from("historico")
        .select(`
          *,
          cmei_anterior_nome:cmeis!historico_cmei_anterior_fkey(nome),
          cmei_novo_nome:cmeis!historico_cmei_novo_fkey(nome),
          turma_anterior_nome:turmas!historico_turma_anterior_fkey(nome),
          turma_novo_nome:turmas!historico_turma_novo_fkey(nome)
        `)
        .eq("crianca_id", criancaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open && !!criancaId,
  });

  // Calcular turma compatível baseado na data de nascimento
  const getTurmaCompativel = () => {
    if (!crianca?.data_nascimento) return null;
    
    const dataNascimento = new Date(crianca.data_nascimento);
    const dataCorte = new Date(new Date().getFullYear(), 2, 31); // 31 de março
    const idadeMeses = differenceInMonths(dataCorte, dataNascimento);
    
    const anos = Math.floor(idadeMeses / 12);
    
    if (anos === 0) return "Infantil 0";
    if (anos === 1) return "Infantil 1";
    if (anos === 2) return "Infantil 2";
    if (anos === 3) return "Infantil 3";
    if (anos === 4) return "Infantil 4";
    if (anos === 5) return "Infantil 5";
    
    return null;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Carregando Detalhes da Criança</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!crianca) {
    return null;
  }

  const turmaCompativel = getTurmaCompativel();
  const handleTabChange = (value: string) => {
    setTab(value as typeof tab);
    requestAnimationFrame(() => {
      const viewport = scrollAreaRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement | null;
      viewport?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{crianca.nome}</DialogTitle>
          <DialogDescription>
            {format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })} 
            {turmaCompativel && (
              <Badge variant="outline" className="ml-2">
                Turma Compatível (Corte 31/03): {turmaCompativel}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
            <TabsTrigger value="matricula">Matrícula</TabsTrigger>
            <TabsTrigger value="adicionais">Adicionais</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <ScrollArea ref={scrollAreaRef} className="h-[500px] mt-4">
            <TabsContent value="dados" className="space-y-6">
              {/* Dados da Criança */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      <CardTitle>Dados da Criança</CardTitle>
                    </div>
                    <ImprimirComprovanteButton 
                      criancaId={crianca.id}
                      tipo="inscricao"
                      variant="outline"
                      size="sm"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Nome Completo</Label>
                      <p className="font-medium">{crianca.nome}</p>
                    </div>
                    {crianca.protocolo && (
                      <div>
                        <Label className="text-muted-foreground">Protocolo</Label>
                        <p className="font-medium">{crianca.protocolo}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">Data de Nascimento</Label>
                      <p className="font-medium">
                        {format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Sexo</Label>
                      <p className="font-medium">{crianca.sexo}</p>
                    </div>
                    {crianca.cpf_crianca && (
                      <div>
                        <Label className="text-muted-foreground">CPF</Label>
                        <p className="font-medium">{crianca.cpf_crianca}</p>
                      </div>
                    )}
                    {crianca.certidao_nascimento && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Certidão de Nascimento</Label>
                        <p className="font-medium">{crianca.certidao_nascimento}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground">Preferências de {singular}</Label>
                    <div className="space-y-1 mt-2 text-sm">
                      {crianca.cmei1?.nome && (
                        <p>1ª Opção: <span className="font-medium">{crianca.cmei1.nome}</span></p>
                      )}
                      {crianca.cmei2?.nome && (
                        <p>2ª Opção: <span className="font-medium">{crianca.cmei2.nome}</span></p>
                      )}
                      {crianca.cmei3?.nome && (
                        <p>3ª Opção: <span className="font-medium">{crianca.cmei3.nome}</span></p>
                      )}
                      {crianca.aceita_qualquer_cmei && (
                        <Badge variant="secondary" className="mt-2">
                          Aceita qualquer {singular}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Responsável */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <CardTitle>Responsável</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Nome</Label>
                      <p className="font-medium">{crianca.responsavel_nome}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">CPF</Label>
                      <p className="font-medium">{crianca.responsavel_cpf}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Telefone</Label>
                      <p className="font-medium">{crianca.responsavel_telefone}</p>
                    </div>
                    {crianca.responsavel_celular && (
                      <div>
                        <Label className="text-muted-foreground">Celular</Label>
                        <p className="font-medium">{crianca.responsavel_celular}</p>
                      </div>
                    )}
                    {crianca.responsavel_email && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{crianca.responsavel_email}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Endereço */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <CardTitle>Endereço</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {crianca.logradouro || crianca.bairro ? (
                    <div className="text-sm space-y-1">
                      {crianca.logradouro && <p>{crianca.logradouro}, {crianca.numero || 'S/N'}</p>}
                      {crianca.complemento && <p>{crianca.complemento}</p>}
                      {crianca.bairro && <p>{crianca.bairro}</p>}
                      {crianca.cidade && crianca.estado && <p>{crianca.cidade} - {crianca.estado}</p>}
                      {crianca.cep && <p>CEP: {crianca.cep}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Não informado</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matricula" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Informações da Matrícula</CardTitle>
                    <div className="flex gap-2">
                      {crianca.status === "Convocado" && (
                        <ImprimirComprovanteButton 
                          criancaId={crianca.id}
                          tipo="convocacao"
                          variant="outline"
                          size="sm"
                        />
                      )}
                      {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && (
                        <ImprimirComprovanteButton 
                          criancaId={crianca.id}
                          tipo="matricula"
                          variant="outline"
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge className="mt-1 bg-green-500">{crianca.status}</Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{singular} Atual</Label>
                      <p className="font-medium mt-1">{crianca.cmei_atual?.nome || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Turma Atual</Label>
                      <p className="font-medium mt-1">{crianca.turma_atual?.nome || "-"}</p>
                    </div>
                    {crianca.data_convocacao && (
                      <div>
                        <Label className="text-muted-foreground">Data da Convocação</Label>
                        <p className="font-medium mt-1">
                          {format(new Date(crianca.data_convocacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                    {crianca.prioridade && (
                      <div>
                        <Label className="text-muted-foreground">Prioridade</Label>
                        <Badge variant="outline" className="mt-1">{crianca.prioridade}</Badge>
                      </div>
                    )}
                    {crianca.programas_sociais && (
                      <div>
                        <Label className="text-muted-foreground">Programas Sociais</Label>
                        <Badge variant="secondary" className="mt-1">Sim</Badge>
                      </div>
                    )}
                  </div>

                  {crianca.observacoes && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">Observações</Label>
                        <p className="text-sm mt-1">{crianca.observacoes}</p>
                      </div>
                    </>
                  )}

                  {/* Ações rápidas */}
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Ações Rápidas</Label>
                    <div className="flex flex-wrap gap-2">
                      {(crianca.status === "Desistente" || crianca.status === "Recusada") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => criancaId && reativarMutation.mutate(criancaId)}
                          disabled={reativarMutation.isPending}
                        >
                          <RefreshCcw className="h-4 w-4 mr-1" />
                          Reativar
                        </Button>
                      )}
                      {crianca.status === "Convocado" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => criancaId && confirmarMatriculaMutation.mutate(criancaId)}
                            disabled={confirmarMatriculaMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Confirmar Matrícula
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => criancaId && recusarMutation.mutate(criancaId)}
                            disabled={recusarMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Recusar Convocação
                          </Button>
                        </>
                      )}
                      {crianca.status !== "Desistente" && crianca.status !== "Recusada" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => criancaId && desistenteMutation.mutate(criancaId)}
                          disabled={desistenteMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Marcar Desistente
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adicionais" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <IdCard className="h-5 w-5" />
                      <CardTitle>Dados Adicionais da Criança</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Certidão</Label>
                        <p className="font-medium">{crianca.certidao_nascimento || "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">NIS</Label>
                        <p className="font-medium">{crianca.nis || "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Cor/Raça (Autodecl.)</Label>
                        <p className="font-medium">{crianca.cor_raca_autodeclarada ? labelCorRaca(crianca.cor_raca_autodeclarada) : "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Cor/Raça (Certidão)</Label>
                        <p className="font-medium">{crianca.cor_raca_certidao ? labelCorRaca(crianca.cor_raca_certidao) : "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Etnia Indígena</Label>
                        <p className="font-medium">{crianca.etnia_indigena ? labelEtniaIndigena(crianca.etnia_indigena, crianca.etnia_indigena_outra) : "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Quilombo</Label>
                        <p className="font-medium">
                          {crianca.quilombo_remanescente === null || crianca.quilombo_remanescente === undefined
                            ? "Não informado"
                            : `${formatSimNao(crianca.quilombo_remanescente)}${crianca.quilombo_nome ? ` (${crianca.quilombo_nome})` : ""}`}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Nacionalidade</Label>
                        <p className="font-medium">
                          {crianca.nacionalidade
                            ? `${labelNacionalidade(crianca.nacionalidade)}${crianca.nacionalidade === "estrangeira" ? ` | Possui documentos: ${formatSimNao(crianca.estrangeiro_possui_documentos)}` : ""}`
                            : "Não informado"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      <CardTitle>Responsável (Complementares)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">RG</Label>
                        <p className="font-medium">{crianca.responsavel_rg || "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Parentesco</Label>
                        <p className="font-medium">{crianca.responsavel_parentesco ? labelParentesco(crianca.responsavel_parentesco, crianca.responsavel_parentesco_outro) : "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Telefone Comercial</Label>
                        <p className="font-medium">{crianca.responsavel_telefone_comercial || "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Canal Preferido</Label>
                        <p className="font-medium">{crianca.canal_notificacao_preferido ? labelCanalNotificacao(crianca.canal_notificacao_preferido) : "Não informado"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      <CardTitle>Moradia</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Unidade Consumidora</Label>
                        <p className="font-medium">{crianca.unidade_consumidora || "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Forma de Ocupação</Label>
                        <p className="font-medium">{crianca.forma_ocupacao_moradia ? labelFormaMoradia(crianca.forma_ocupacao_moradia, crianca.forma_ocupacao_moradia_outro) : "Não informado"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <CamposCustomizadosCard criancaId={crianca.id} criancaNome={crianca.nome} />
            </TabsContent>

            <TabsContent value="historico" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <CardTitle>Histórico da Criança</CardTitle>
                  </div>
                  <CardDescription>
                    Registro de todas as ações importantes no sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historico && historico.length > 0 ? (
                    <div className="space-y-4">
                      {historico.map((item) => (
                        <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm">{getAcaoLabel(item.acao)}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            {item.descricao && (
                              <p className="text-sm text-muted-foreground">{item.descricao}</p>
                            )}
                            {item.justificativa && (
                              <p className="text-sm text-muted-foreground italic mt-1">
                                Motivo: {item.justificativa}
                              </p>
                            )}
                            {(item.status_anterior || item.status_novo) && (
                              <div className="flex gap-2 mt-2 text-xs">
                                {item.status_anterior && (
                                  <Badge variant="outline">{item.status_anterior}</Badge>
                                )}
                                {item.status_anterior && item.status_novo && (
                                  <span className="text-muted-foreground">→</span>
                                )}
                                {item.status_novo && (
                                  <Badge>{item.status_novo}</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum histórico encontrado.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


