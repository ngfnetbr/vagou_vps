import { useState, useEffect, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ChevronLeft, Star, Sparkles, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInMonths } from "date-fns";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { useAuth } from "@/contexts/AuthContext";

interface ConvocacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId?: string;
  criancaNome?: string;
}

interface Turma {
  id: string;
  nome: string;
  capacidade: number;
  ocupadas: number;
  idade_minima: number;
  idade_maxima: number;
}

type TurmaRecomendada = Turma & {
  vagasDisponiveis: number;
  distanciaIdade: number;
};

interface CMEI {
  id: string;
  nome: string;
  turmas: Turma[];
}

type CMEIRecomendado = Omit<CMEI, "turmas"> & {
  turmas: TurmaRecomendada[];
  ehPreferencia: boolean;
  ordemPreferencia: number;
  melhorTurma: TurmaRecomendada | null;
};

export function ConvocacaoDialog({
  open,
  onOpenChange,
  criancaId,
  criancaNome,
}: ConvocacaoDialogProps) {
  const queryClient = useQueryClient();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  const { userRoles } = useAuth();
  const isSuperAdmin = userRoles.includes("superadmin");
  const [selectedCMEI, setSelectedCMEI] = useState<string | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<string | null>(null);
  const [prazo, setPrazo] = useState("7");
  const [showConfirm, setShowConfirm] = useState(false);

  // Buscar informações da criança
  const { data: crianca } = useQuery({
    queryKey: ["crianca-preferencias", criancaId],
    queryFn: async () => {
      if (!criancaId) return null;
      const { data, error } = await supabase
        .from("criancas")
        .select(`
          *,
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(id, nome),
          cmei2:cmeis!criancas_cmei2_preferencia_fkey(id, nome),
          cmei3:cmeis!criancas_cmei3_preferencia_fkey(id, nome),
          cmei_remanejamento:cmeis!criancas_cmei_remanejamento_id_fkey(id, nome),
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(id, nome)
        `)
        .eq("id", criancaId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!criancaId,
  });

  // Verificar se é remanejamento
  const isRemanejamento = crianca?.cmei_remanejamento_id && 
    (crianca?.status === "Matriculado" || crianca?.status === "Matriculada");

  // Calcular idade em meses
  const idadeEmMeses = useMemo(() => {
    if (!crianca?.data_nascimento) return NaN;
    const dataNascimento = new Date(crianca.data_nascimento);
    if (Number.isNaN(dataNascimento.getTime())) return NaN;
    return differenceInMonths(new Date(), dataNascimento);
  }, [crianca?.data_nascimento]);

  const idadeEmMesesKey = Number.isFinite(idadeEmMeses) ? idadeEmMeses : "desconhecida";

  // Buscar CMEIs e turmas disponíveis
  const { data: cmeisDisponiveis, isLoading } = useQuery({
    queryKey: ["cmeis-disponiveis", criancaId, idadeEmMesesKey, isRemanejamento, crianca?.cmei_remanejamento_id, isSuperAdmin],
    queryFn: async () => {
      if (!crianca) return [];

      const { data: allCMEIs, error: cmeisError } = await supabase
        .from("cmeis")
        .select("id, nome")
        .eq("ativo", true)
        .eq("tipo_unidade", "cmei_creche")
        .order("nome");

      if (cmeisError) throw cmeisError;

      const cmeisComTurmas = await Promise.all(
        allCMEIs.map(async (cmei) => {
          const { data: turmas, error: turmasError } = await supabase
            .from("turmas")
            .select(`
              id,
              nome,
              capacidade,
              idade_minima,
              idade_maxima,
              criancas:criancas(count)
            `)
            .eq("cmei_id", cmei.id)
            .eq("ativo", true);

          if (turmasError) throw turmasError;

          const turmasCompativeis = turmas
            .filter((turma: any) => {
              const ocupadas = turma.criancas?.[0]?.count || 0;
              const temVaga = ocupadas < turma.capacidade;
              const idadeConhecida = Number.isFinite(idadeEmMeses);
              const idadeCompativel = !idadeConhecida
                ? isSuperAdmin
                : (!turma.idade_minima || idadeEmMeses >= turma.idade_minima) &&
                  (!turma.idade_maxima || idadeEmMeses <= turma.idade_maxima);
              return temVaga && idadeCompativel;
            })
            .map((turma: any) => ({
              id: turma.id,
              nome: turma.nome,
              capacidade: turma.capacidade,
              ocupadas: turma.criancas?.[0]?.count || 0,
              idade_minima: turma.idade_minima,
              idade_maxima: turma.idade_maxima,
            }));

          return {
            id: cmei.id,
            nome: cmei.nome,
            turmas: turmasCompativeis,
          };
        })
      );

      let cmeisComVagas = cmeisComTurmas.filter((cmei) => cmei.turmas.length > 0);

      if (isRemanejamento && crianca.cmei_remanejamento_id) {
        cmeisComVagas = cmeisComVagas.filter((cmei) => cmei.id === crianca.cmei_remanejamento_id);
      } else if (!crianca.aceita_qualquer_cmei && !isSuperAdmin) {
        const preferencias = [
          crianca.cmei1?.id,
          crianca.cmei2?.id,
          crianca.cmei3?.id,
        ].filter(Boolean);
        cmeisComVagas = cmeisComVagas.filter((cmei) =>
          preferencias.includes(cmei.id)
        );
      }

      return cmeisComVagas;
    },
    enabled: open && !!crianca,
  });

  const cmeisRecomendados = useMemo((): CMEIRecomendado[] => {
    if (!cmeisDisponiveis || !crianca) return [];

    const preferencia1Id = crianca.cmei1?.id;
    const preferencia2Id = crianca.cmei2?.id;
    const preferencia3Id = crianca.cmei3?.id;

    return cmeisDisponiveis
      .map((cmei) => {
        const turmasRecomendadas = cmei.turmas
          .map((turma) => {
            const vagasDisponiveis = turma.capacidade - turma.ocupadas;
            const meioFaixa = (turma.idade_minima + turma.idade_maxima) / 2;
            const distanciaIdade = Number.isFinite(meioFaixa) && Number.isFinite(idadeEmMeses)
              ? Math.abs(idadeEmMeses - meioFaixa)
              : 0;
            return { ...turma, vagasDisponiveis, distanciaIdade };
          })
          .sort((a, b) => {
            if (b.vagasDisponiveis !== a.vagasDisponiveis) return b.vagasDisponiveis - a.vagasDisponiveis;
            if (a.distanciaIdade !== b.distanciaIdade) return a.distanciaIdade - b.distanciaIdade;
            return a.nome.localeCompare(b.nome);
          });

        const ehPreferencia = cmei.id === preferencia1Id || cmei.id === preferencia2Id || cmei.id === preferencia3Id;
        const ordemPreferencia =
          cmei.id === preferencia1Id ? 1 : cmei.id === preferencia2Id ? 2 : cmei.id === preferencia3Id ? 3 : 4;
        const melhorTurma = turmasRecomendadas[0] ?? null;

        return {
          ...cmei,
          turmas: turmasRecomendadas,
          ehPreferencia,
          ordemPreferencia,
          melhorTurma,
        };
      })
      .sort((a, b) => {
        if (a.ordemPreferencia !== b.ordemPreferencia) {
          return a.ordemPreferencia - b.ordemPreferencia;
        }
        const vagasA = a.melhorTurma?.vagasDisponiveis ?? 0;
        const vagasB = b.melhorTurma?.vagasDisponiveis ?? 0;
        if (vagasB !== vagasA) return vagasB - vagasA;
        const distA = a.melhorTurma?.distanciaIdade ?? 0;
        const distB = b.melhorTurma?.distanciaIdade ?? 0;
        if (distA !== distB) return distA - distB;
        return a.nome.localeCompare(b.nome);
      });
  }, [cmeisDisponiveis, crianca, idadeEmMeses]);

  // Melhor sugestão geral
  const melhorSugestao = useMemo(() => {
    if (!cmeisRecomendados.length) return null;
    const melhorCmei = cmeisRecomendados[0];
    const melhorTurma = melhorCmei.melhorTurma;
    if (!melhorTurma) return null;
    return { cmei: melhorCmei, turma: melhorTurma };
  }, [cmeisRecomendados]);

  // Mutation para convocar
  const convocarMutation = useMutation({
    mutationFn: async () => {
      if (!criancaId || !selectedCMEI || !selectedTurma) {
        throw new Error(`Selecione ${singular} e turma`);
      }

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + parseInt(prazo));

      const { error } = await supabase.rpc("convocar_crianca", {
        p_crianca_id: criancaId,
        p_turma_id: selectedTurma,
        p_prazo_dias: parseInt(prazo),
      });

      if (error) throw error;

      // Enviar notificação
      try {
        await supabase.functions.invoke("enviar-notificacao", {
          body: {
            crianca_id: criancaId,
            tipo: "convocacao",
            dados_adicionais: {
              prazo_dias: parseInt(prazo),
              deadline: deadline.toISOString(),
            },
          },
        });
      } catch (notifError) {
        console.error("Erro ao enviar notificação:", notifError);
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["admin-fila"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["convocacoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["historico-matriculas-desistencias"] });
      
      toast.success("Criança convocada com sucesso!");
      onOpenChange(false);
      resetState();
    },
    onError: (error: any) => {
      toast.error("Erro ao processar: " + error.message);
    },
  });

  const resetState = () => {
    setSelectedCMEI(null);
    setSelectedTurma(null);
    setPrazo("7");
    setShowConfirm(false);
  };

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      resetState();
    } else if (isRemanejamento && crianca?.cmei_remanejamento_id && cmeisRecomendados?.length) {
      const cmeiRemanejamento = cmeisRecomendados.find(c => c.id === crianca.cmei_remanejamento_id);
      if (cmeiRemanejamento) {
        setSelectedCMEI(cmeiRemanejamento.id);
      }
    }
  }, [open, isRemanejamento, crianca?.cmei_remanejamento_id, cmeisRecomendados]);

  const cmeiSelecionado = cmeisRecomendados?.find((c) => c.id === selectedCMEI);
  const turmaSelecionada = cmeiSelecionado?.turmas.find((t) => t.id === selectedTurma);

  const selecionarMelhorOpcao = () => {
    if (melhorSugestao) {
      setSelectedCMEI(melhorSugestao.cmei.id);
      setSelectedTurma(melhorSugestao.turma.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRemanejamento ? (
              <>
                <ArrowRightLeft className="h-5 w-5 text-purple-600" />
                Convocação para Remanejamento
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-primary" />
                Convocação Inteligente
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isRemanejamento 
              ? `Transferência de ${crianca?.cmei_atual?.nome || `${singular} atual`} para ${crianca?.cmei_remanejamento?.nome || `${singular} solicitado`}`
              : `Selecione ${singular} e turma para convocar a criança`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 pr-4 overflow-y-auto min-h-0">
          {/* Alerta de remanejamento */}
          {isRemanejamento && (
            <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-sm mb-4">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium mb-1">
                <ArrowRightLeft className="h-4 w-4" />
                Remanejamento em andamento
              </div>
              <p className="text-purple-600 dark:text-purple-400">
                Esta criança está <strong>matriculada</strong> em <strong>{crianca?.cmei_atual?.nome}</strong> e solicitou transferência para <strong>{crianca?.cmei_remanejamento?.nome}</strong>.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : showConfirm ? (
            // Tela de confirmação
            <div className="space-y-4 py-4">
              <Card className="border-primary">
                <CardContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-lg">Confirmar Convocação</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Criança:</strong> {criancaNome}</p>
                    <p><strong>{singular}:</strong> {cmeiSelecionado?.nome}</p>
                    <p><strong>Turma:</strong> {turmaSelecionada?.nome}</p>
                    <p><strong>Prazo para resposta:</strong> {prazo} dias úteis</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Preferências da Criança */}
              {crianca && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium mb-1">Preferências:</p>
                        <p>1ª: {crianca.cmei1?.nome || "—"}</p>
                        <p>2ª: {crianca.cmei2?.nome || "—"}</p>
                        <p>3ª: {crianca.cmei3?.nome || "—"}</p>
                      </div>
                      <div>
                        <p className="font-medium mb-1">Aceita qualquer {singular}:</p>
                        <Badge variant={crianca.aceita_qualquer_cmei ? "success" : "secondary"}>
                          {crianca.aceita_qualquer_cmei ? "Sim" : "Não"}
                        </Badge>
                        <p className="mt-2">
                          <span className="font-medium">Idade:</span>{" "}
                          {Number.isFinite(idadeEmMeses)
                            ? `${Math.floor(idadeEmMeses / 12)} anos e ${idadeEmMeses % 12} meses`
                            : "Não informada"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sugestão Inteligente */}
              {melhorSugestao && !selectedCMEI && (
                <Card className="border-primary bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-5 w-5 text-amber-500" />
                          <span className="font-semibold">Sugestão Inteligente</span>
                        </div>
                        <p className="text-sm">
                          <strong>{melhorSugestao.cmei.nome}</strong> - {melhorSugestao.turma.nome}
                        </p>
                      </div>
                      <Button size="sm" onClick={selecionarMelhorOpcao}>
                        Usar Sugestão
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!selectedCMEI ? (
                // Seleção de CMEI
                <div className="space-y-3">
                  <Label>Selecione o CMEI</Label>
                  {cmeisRecomendados && cmeisRecomendados.length > 0 ? (
                    <div className="space-y-2">
                      {cmeisRecomendados.map((cmei, index) => {
                        const isBestCmei = index === 0;
                        return (
                          <Card
                            key={cmei.id}
                            className={`cursor-pointer transition-colors ${
                              isBestCmei ? "border-primary/50 bg-primary/5" : "hover:border-primary"
                            }`}
                            onClick={() => setSelectedCMEI(cmei.id)}
                          >
                            <CardContent className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{cmei.nome}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {cmei.turmas.length} turma(s)
                                    {cmei.melhorTurma ? ` • ${cmei.melhorTurma.vagasDisponiveis} vaga(s)` : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {cmei.ehPreferencia && (
                                  <Badge variant="outline">
                                    {cmei.ordemPreferencia === 1 ? "1ª Escolha" : "2ª Escolha"}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma turma compatível com vagas disponíveis
                      {!isRemanejamento && !crianca?.aceita_qualquer_cmei && !isSuperAdmin && " nas preferências informadas"}.
                    </p>
                  )}
                </div>
              ) : (
                // Seleção de Turma e Opções
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCMEI(null);
                        setSelectedTurma(null);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Voltar
                    </Button>
                    <div>
                      <p className="font-medium">{cmeiSelecionado?.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Selecione uma turma
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {cmeiSelecionado?.turmas.map((turma, index) => {
                      const isBestTurma = index === 0;
                      return (
                        <Card
                          key={turma.id}
                          className={`cursor-pointer transition-colors ${
                            selectedTurma === turma.id
                              ? "border-primary bg-primary/10"
                              : isBestTurma
                              ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedTurma(turma.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{turma.nome}</p>
                                  {selectedTurma === turma.id && (
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {turma.ocupadas}/{turma.capacidade} ocupadas
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {isBestTurma && (
                                  <Badge variant="secondary">Recomendado</Badge>
                                )}
                                <Badge variant="success">
                                  {turma.vagasDisponiveis} vagas
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {selectedTurma && (
                    <>
                      {/* Prazo de Resposta */}
                      <div className="space-y-2">
                        <Label htmlFor="prazo">Prazo de Resposta (dias)</Label>
                        <Input
                          id="prazo"
                          type="number"
                          min="1"
                          max="30"
                          value={prazo}
                          onChange={(e) => setPrazo(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Padrão: 7 dias
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {showConfirm ? (
            <>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Voltar
              </Button>
              <Button
                onClick={() => convocarMutation.mutate()}
                disabled={convocarMutation.isPending}
              >
                {convocarMutation.isPending && (
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar Convocação
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={!selectedCMEI || !selectedTurma}
              >
                Revisar e Convocar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
