import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Users, Clock, AlertTriangle, FileWarning } from "lucide-react";
import { useTurmasDisponiveis, useAceitarConvocacao, useRecusarConvocacao } from "@/hooks/api/responsavel-hooks";
import { useVerificarDocumentosCompletos } from "@/hooks/api/documentos-hooks";
import { differenceInMonths } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

interface MatriculaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crianca: {
    id: string;
    nome: string;
    data_nascimento: string;
    cmei1_preferencia: string | null;
    cmei2_preferencia: string | null;
    aceita_qualquer_cmei: boolean;
    cmei1?: { nome: string };
    cmei2?: { nome: string };
  } | null;
}

export function MatriculaDialog({ open, onOpenChange, crianca }: MatriculaDialogProps) {
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [showRecusa, setShowRecusa] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const navigate = useNavigate();
  const { data: config } = useConfiguracoesPublicas();
  const { singular } = getUnidadeLabels(config as any);

  const idadeMeses = crianca 
    ? differenceInMonths(new Date(), new Date(crianca.data_nascimento))
    : 0;

  // Buscar turmas disponíveis no CMEI de preferência (priorizar 1ª opção)
  const cmeiId = crianca?.cmei1_preferencia || crianca?.cmei2_preferencia;
  const { data: turmas, isLoading: loadingTurmas } = useTurmasDisponiveis(cmeiId, idadeMeses);

  // Verificar se documentos estão completos
  const { data: docsStatus, isLoading: loadingDocs } = useVerificarDocumentosCompletos(crianca?.id);
  const documentosPendentes = docsStatus && !docsStatus.completos;

  const aceitarMutation = useAceitarConvocacao();
  const recusarMutation = useRecusarConvocacao();

  useEffect(() => {
    if (open) {
      setSelectedTurma("");
      setShowRecusa(false);
      setMotivoRecusa("");
    }
  }, [open]);

  const handleAceitar = () => {
    if (!crianca || !selectedTurma || !cmeiId) return;

    aceitarMutation.mutate(
      {
        criancaId: crianca.id,
        cmeiId,
        turmaId: selectedTurma,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleRecusar = () => {
    if (!crianca) return;

    recusarMutation.mutate(
      {
        criancaId: crianca.id,
        motivo: motivoRecusa,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!crianca) return null;

  const cmeiNome = crianca.cmei1?.nome || crianca.cmei2?.nome || singular;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {showRecusa ? "Recusar Convocação" : "Efetivar Matrícula"}
          </DialogTitle>
          <DialogDescription>
            {showRecusa 
              ? "Deseja realmente recusar esta convocação?"
              : "Parabéns! Você foi convocado. Complete a matrícula selecionando a turma."}
          </DialogDescription>
        </DialogHeader>

        {!showRecusa ? (
          <>
            {/* Alerta de documentos pendentes */}
            {documentosPendentes && (
              <Alert variant="destructive" className="mb-4">
                <FileWarning className="h-4 w-4" />
                <AlertTitle>Documentos Pendentes</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Você possui {docsStatus.pendentes} documento(s) obrigatório(s) pendente(s) de aprovação.
                    A matrícula só pode ser efetivada após todos os documentos serem aprovados.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/modulo/vagou/responsavel/documentos");
                    }}
                  >
                    Ir para Documentos
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Informações da Criança */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Criança</h3>
                <p className="text-lg">{crianca.nome}</p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">CMEI</h3>
                <p className="text-lg">{cmeiNome}</p>
              </div>

              <Separator />

              {/* Seleção de Turma */}
              <div className="space-y-3">
                <h3 className="font-semibold">Selecione a Turma</h3>
                
                {loadingTurmas ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !turmas || turmas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Não há turmas disponíveis no momento.</p>
                    <p className="text-sm mt-2">Entre em contato com a secretaria.</p>
                  </div>
                ) : (
                  <RadioGroup value={selectedTurma} onValueChange={setSelectedTurma}>
                    <div className="space-y-3">
                      {turmas.map((turma) => (
                        <div
                          key={turma.id}
                          className={`flex items-start space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                            selectedTurma === turma.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() => setSelectedTurma(turma.id)}
                        >
                          <RadioGroupItem value={turma.id} id={turma.id} />
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={turma.id} className="cursor-pointer text-base font-medium">
                              {turma.nome}
                            </Label>
                            <div className="flex flex-wrap gap-2 text-sm">
                              <Badge variant="outline">
                                <Clock className="mr-1 h-3 w-3" />
                                {turma.turno}
                              </Badge>
                              <Badge variant="secondary">
                                <Users className="mr-1 h-3 w-3" />
                                {turma.vagas_disponiveis} {turma.vagas_disponiveis === 1 ? 'vaga' : 'vagas'}
                              </Badge>
                              {turma.idade_minima !== null && turma.idade_maxima !== null && (
                                <Badge variant="outline">
                                  {turma.idade_minima}-{turma.idade_maxima} anos
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRecusa(true)}
                disabled={aceitarMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Recusar
              </Button>
              <Button
                onClick={handleAceitar}
                disabled={!selectedTurma || aceitarMutation.isPending || !turmas || turmas.length === 0 || documentosPendentes || loadingDocs}
              >
                {aceitarMutation.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Efetivando...
                  </>
                ) : loadingDocs ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Verificando documentos...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Aceitar e Efetivar Matrícula
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Recusa */}
            <div className="space-y-4">
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <p className="text-sm text-warning-foreground">
                  Ao recusar esta convocação, sua criança voltará para a fila de espera
                  e poderá ser convocada novamente no futuro.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo da Recusa (opcional)</Label>
                <Textarea
                  id="motivo"
                  placeholder="Ex: Consegui vaga em outra instituição, mudança de endereço, etc."
                  value={motivoRecusa}
                  onChange={(e) => setMotivoRecusa(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRecusa(false)}
                disabled={recusarMutation.isPending}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRecusar}
                disabled={recusarMutation.isPending}
              >
                {recusarMutation.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Recusando...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Confirmar Recusa
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

