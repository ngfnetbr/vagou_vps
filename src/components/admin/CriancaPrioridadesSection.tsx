import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, CheckCircle2, XCircle, Clock, Plus, Trash2, Scale, FileText } from "lucide-react";
import {
  useCriancaPrioridades,
  useTiposPrioridadeAtivos,
  useAtribuirPrioridade,
  useAprovarPrioridade,
  useRemoverPrioridade,
  calcularPesoTotal,
  type CriancaPrioridade,
} from "@/hooks/api/prioridades-hooks";
import { toast } from "sonner";

interface CriancaPrioridadesSectionProps {
  criancaId: string;
}

export const CriancaPrioridadesSection = ({ criancaId }: CriancaPrioridadesSectionProps) => {
  const { data: prioridades, isLoading } = useCriancaPrioridades(criancaId);
  const { data: tiposDisponiveis } = useTiposPrioridadeAtivos();
  const atribuirMutation = useAtribuirPrioridade();
  const aprovarMutation = useAprovarPrioridade();
  const removerMutation = useRemoverPrioridade();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTipoId, setSelectedTipoId] = useState("");
  const [recusarDialogOpen, setRecusarDialogOpen] = useState(false);
  const [selectedPrioridade, setSelectedPrioridade] = useState<CriancaPrioridade | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");

  const pesoTotal = prioridades ? calcularPesoTotal(prioridades) : 0;

  // Filtrar tipos que ainda não foram atribuídos
  const tiposNaoAtribuidos = tiposDisponiveis?.filter(
    (tipo) => !prioridades?.some((p) => p.prioridade_id === tipo.id)
  );

  const handleAtribuir = async () => {
    if (!selectedTipoId) {
      toast.error("Selecione um tipo de prioridade");
      return;
    }

    await atribuirMutation.mutateAsync({
      crianca_id: criancaId,
      prioridade_id: selectedTipoId,
    });

    setSelectedTipoId("");
    setAddDialogOpen(false);
  };

  const handleAprovar = async (prioridade: CriancaPrioridade) => {
    await aprovarMutation.mutateAsync({
      id: prioridade.id,
      criancaId,
      status: "aprovado",
    });
  };

  const handleRecusar = (prioridade: CriancaPrioridade) => {
    setSelectedPrioridade(prioridade);
    setMotivoRecusa("");
    setRecusarDialogOpen(true);
  };

  const handleConfirmRecusar = async () => {
    if (!selectedPrioridade || !motivoRecusa.trim()) {
      toast.error("Informe o motivo da recusa");
      return;
    }

    await aprovarMutation.mutateAsync({
      id: selectedPrioridade.id,
      criancaId,
      status: "recusado",
      motivo_recusa: motivoRecusa,
    });

    setRecusarDialogOpen(false);
  };

  const handleRemover = async (prioridade: CriancaPrioridade) => {
    await removerMutation.mutateAsync({
      id: prioridade.id,
      criancaId,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Prioridades</CardTitle>
                <CardDescription>
                  Critérios de priorização na fila de espera
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md">
                <Scale className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Peso Total:</span>
                <span className="text-lg font-bold text-primary">{pesoTotal}</span>
              </div>
              <Button
                size="sm"
                onClick={() => setAddDialogOpen(true)}
                disabled={!tiposNaoAtribuidos?.length}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {prioridades && prioridades.length > 0 ? (
            <div className="space-y-3">
              {prioridades.map((prioridade) => (
                <div
                  key={prioridade.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: prioridade.prioridade?.cor || "#3b82f6" }}
                    />
                    <div>
                      <p className="font-medium">{prioridade.prioridade?.nome}</p>
                      {prioridade.prioridade?.descricao && (
                        <p className="text-xs text-muted-foreground">
                          {prioridade.prioridade.descricao}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      Peso: {prioridade.prioridade?.peso || 0}
                    </Badge>
                    {prioridade.prioridade?.exige_documento && (
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" />
                        Exige documento
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {prioridade.documento_comprovante_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={prioridade.documento_comprovante_url} target="_blank" rel="noreferrer">
                          Ver comprovante
                        </a>
                      </Button>
                    )}
                    {getStatusBadge(prioridade.status)}

                    {prioridade.status === "pendente" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleAprovar(prioridade)}
                          disabled={aprovarMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRecusar(prioridade)}
                          disabled={aprovarMutation.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemover(prioridade)}
                      disabled={removerMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma prioridade atribuída</p>
              <p className="text-xs">Clique em "Adicionar" para atribuir prioridades</p>
            </div>
          )}

          {prioridades && prioridades.some(p => p.motivo_recusa) && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Motivos de recusa:</p>
                {prioridades
                  .filter(p => p.motivo_recusa)
                  .map(p => (
                    <div key={p.id} className="text-sm bg-destructive/10 text-destructive p-2 rounded">
                      <strong>{p.prioridade?.nome}:</strong> {p.motivo_recusa}
                    </div>
                  ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para adicionar prioridade */}
      <AlertDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar Prioridade</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o tipo de prioridade para atribuir à criança.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Prioridade</Label>
              <Select value={selectedTipoId} onValueChange={setSelectedTipoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposNaoAtribuidos?.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tipo.cor }}
                        />
                        <span>{tipo.nome}</span>
                        <span className="text-muted-foreground text-xs">
                          (Peso: {tipo.peso})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAtribuir}
              disabled={!selectedTipoId || atribuirMutation.isPending}
            >
              {atribuirMutation.isPending && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              Atribuir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para recusar prioridade */}
      <AlertDialog open={recusarDialogOpen} onOpenChange={setRecusarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar Prioridade</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da recusa da prioridade "{selectedPrioridade?.prioridade?.nome}".
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label>Motivo da Recusa *</Label>
            <Textarea
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              placeholder="Descreva o motivo..."
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRecusar}
              disabled={!motivoRecusa.trim() || aprovarMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {aprovarMutation.isPending && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              Recusar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
