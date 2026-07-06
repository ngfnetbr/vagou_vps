import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { gerarFichaPDF } from "@/utils/pdf-utils";
import { toast } from "sonner";
import { ArrowLeft, FileText, Edit, Trash2, User, Calendar, MapPin, Phone, Mail, School, Users, CheckCircle2, Clock, RefreshCcw, XCircle, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CriancaEditDialog } from "@/components/admin/CriancaEditDialog";
import { DesistenteDialog } from "@/components/admin/DesistenteDialog";
import { RealocacaoDialog } from "@/components/admin/RealocacaoDialog";
import { getAcaoLabel } from "@/utils/historico-utils";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const MatriculasDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [desistenteDialogOpen, setDesistenteDialogOpen] = useState(false);
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);

  // Mutations para ações
  const reativarMutation = useMutation({
    mutationFn: async (criancaId: string) => {
      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Fila de Espera",
          data_penalidade: null,
        })
        .eq("id", criancaId);
      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Criança Reativada",
        status_novo: "Fila de Espera",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca-matricula-detalhes", id] });
      queryClient.invalidateQueries({ queryKey: ["crianca-historico", id] });
      queryClient.invalidateQueries({ queryKey: ["fila-espera"] });
      toast.success("Criança reativada!");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const confirmarMatriculaMutation = useMutation({
    mutationFn: async (criancaId: string) => {
      const { error } = await supabase
        .from("criancas")
        .update({
          status: "Matriculado",
          convocacao_deadline: null,
          data_convocacao: null,
        })
        .eq("id", criancaId);
      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Matrícula Confirmada",
        status_anterior: "Convocado",
        status_novo: "Matriculado",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca-matricula-detalhes", id] });
      queryClient.invalidateQueries({ queryKey: ["crianca-historico", id] });
      queryClient.invalidateQueries({ queryKey: ["fila-espera"] });
      toast.success("Matrícula confirmada!");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const recusarMutation = useMutation({
    mutationFn: async (criancaId: string) => {
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
      queryClient.invalidateQueries({ queryKey: ["crianca-matricula-detalhes", id] });
      queryClient.invalidateQueries({ queryKey: ["crianca-historico", id] });
      queryClient.invalidateQueries({ queryKey: ["fila-espera"] });
      toast.success("Convocação recusada. Criança voltou para fim de fila.");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const cancelarRemanejamentoMutation = useMutation({
    mutationFn: async (criancaId: string) => {
      const { error } = await supabase
        .from("criancas")
        .update({
          cmei_remanejamento_id: null,
          justificativa_remanejamento: null,
        })
        .eq("id", criancaId);
      if (error) throw error;

      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Remanejamento Cancelado",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca-matricula-detalhes", id] });
      queryClient.invalidateQueries({ queryKey: ["crianca-historico", id] });
      toast.success("Remanejamento cancelado.");
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Buscar detalhes da criança
  const { data: crianca, isLoading } = useQuery({
    queryKey: ["crianca-matricula-detalhes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(nome, endereco, bairro, telefone, email),
          turma_atual:turmas!criancas_turma_atual_id_fkey(nome, turno, capacidade),
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome),
          cmei2:cmeis!criancas_cmei2_preferencia_fkey(nome)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Buscar histórico
  const { data: historico } = useQuery({
    queryKey: ["crianca-historico", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico")
        .select(`
          *,
          cmei_anterior_nome:cmeis!historico_cmei_anterior_fkey(nome),
          cmei_novo_nome:cmeis!historico_cmei_novo_fkey(nome),
          turma_anterior_nome:turmas!historico_turma_anterior_fkey(nome),
          turma_novo_nome:turmas!historico_turma_novo_fkey(nome)
        `)
        .eq("crianca_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const diffTime = Math.abs(hoje.getTime() - nascimento.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    const anos = Math.floor(diffDays / 365);
    const meses = Math.floor((diffDays % 365) / 30);
    const dias = Math.floor((diffDays % 365) % 30);
    
    if (anos > 0) {
      return `${anos} ano${anos > 1 ? 's' : ''}${meses > 0 ? `, ${meses} ${meses > 1 ? 'meses' : 'mês'}` : ''}${dias > 0 ? ` e ${dias} dia${dias > 1 ? 's' : ''}` : ''}`;
    } else if (meses > 0) {
      return `${meses} ${meses > 1 ? 'meses' : 'mês'}${dias > 0 ? ` e ${dias} dia${dias > 1 ? 's' : ''}` : ''}`;
    } else {
      return `${dias} dia${dias > 1 ? 's' : ''}`;
    }
  };

  const handleGerarPDF = async () => {
    if (!id) return;
    
    setGerandoPDF(true);
    try {
      await gerarFichaPDF(id);
      toast.success("Ficha gerada com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar ficha em PDF");
      console.error(error);
    } finally {
      setGerandoPDF(false);
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

  if (!crianca) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Criança não encontrada</p>
          <Button onClick={() => navigate("/modulo/vagou/admin/matriculas")} className="mt-4">
            Voltar para Lista
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/modulo/vagou/admin/matriculas")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Lista
            </Button>
            <h1 className="text-3xl font-bold">{crianca.nome}</h1>
            <p className="text-muted-foreground">
              {calcularIdade(crianca.data_nascimento)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleGerarPDF} disabled={gerandoPDF}>
              {gerandoPDF ? (
                <>
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            
            {/* Ações baseadas no status */}
            {(crianca.status === "Desistente" || crianca.status === "Recusada") && (
              <Button 
                variant="outline" 
                onClick={() => id && reativarMutation.mutate(id)}
                disabled={reativarMutation.isPending}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reativar
              </Button>
            )}
            
            {crianca.status === "Convocado" && (
              <>
                <Button 
                  variant="default" 
                  onClick={() => id && confirmarMatriculaMutation.mutate(id)}
                  disabled={confirmarMatriculaMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Matrícula
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => id && recusarMutation.mutate(id)}
                  disabled={recusarMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Recusar
                </Button>
              </>
            )}
            
            {(crianca.status === "Matriculado" || crianca.status === "Matriculada") && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/modulo/vagou/admin/criancas/${id}`)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Ver Detalhes Completos
              </Button>
            )}
            
            {crianca.status !== "Desistente" && crianca.status !== "Recusada" && (
              <Button variant="destructive" onClick={() => setDesistenteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Desistente
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Status Atual */}
          <Card>
            <CardHeader>
              <CardTitle>Status Atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge className="bg-green-500 text-white">
                  {crianca.status}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Matriculado(a) no {crianca.cmei_atual?.nome}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detalhes da Vaga */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Vaga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <School className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Turma Atual: {crianca.turma_atual?.nome}</p>
                  <p className="text-muted-foreground text-xs">
                    Turno: {crianca.turma_atual?.turno || 'Não informado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prazo de Resposta */}
          <Card>
            <CardHeader>
              <CardTitle>Prazo de Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {crianca.convocacao_deadline ? (
                  <>
                    <Clock className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">
                        Prazo: {format(new Date(crianca.convocacao_deadline), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-muted-foreground">
                      Não aplicável (Criança não convocada).
                    </p>
                  </>
                )}
              </div>
              {crianca.aceita_qualquer_cmei && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Aceita qualquer {singular}: Sim
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dados Cadastrais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Cadastrais</CardTitle>
            <CardDescription>
              Informações completas da criança e do responsável.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Criança */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Criança</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome Completo:</span>
                    <p className="font-medium">{crianca.nome}</p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Data Nasc:</span>
                    <p className="font-medium">
                      {format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Sexo:</span>
                    <p className="font-medium">{crianca.sexo}</p>
                  </div>

                  {crianca.cpf_crianca && (
                    <div>
                      <span className="text-muted-foreground">CPF:</span>
                      <p className="font-medium">{crianca.cpf_crianca}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2 text-sm">Preferências de {singular}:</h4>
                  <div className="space-y-1 text-sm">
                    {crianca.cmei1?.nome && (
                      <p className="text-muted-foreground">1ª Opção: {crianca.cmei1.nome}</p>
                    )}
                    {crianca.cmei2?.nome && (
                      <p className="text-muted-foreground">2ª Opção: {crianca.cmei2.nome}</p>
                    )}
                    {!crianca.cmei1 && !crianca.cmei2 && (
                      <p className="text-muted-foreground">Nenhuma preferência cadastrada</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Responsável */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Responsável</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{crianca.responsavel_nome}</p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">CPF:</span>
                    <p className="font-medium">{crianca.responsavel_cpf}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {crianca.responsavel_telefone}
                    </span>
                  </div>

                  {crianca.responsavel_celular && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {crianca.responsavel_celular}
                      </span>
                    </div>
                  )}

                  {crianca.responsavel_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {crianca.responsavel_email}
                      </span>
                    </div>
                  )}
                </div>
              </div>
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

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico da Criança
            </CardTitle>
            <CardDescription>
              Registro de todas as ações importantes no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historico && historico.length > 0 ? (
              <ScrollArea className="h-[300px]">
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
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum histórico encontrado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {id && crianca && (
        <>
          <CriancaEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            criancaId={id}
          />
          <DesistenteDialog
            open={desistenteDialogOpen}
            onOpenChange={setDesistenteDialogOpen}
            criancaId={id}
            criancaNome={crianca.nome}
            statusAtual={crianca.status || undefined}
          />
        </>
      )}
    </AdminLayout>
  );
};

export default MatriculasDetalhes;

