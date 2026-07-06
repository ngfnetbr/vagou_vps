import { useState, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTurmaBase, useUpdateTurmaBase, useDeleteTurmaBase, useCheckTurmaBaseInUse, TurmaBase } from "@/hooks/api/turmas-base-hooks";
import { Save, Trash2, AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TurmaBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma?: TurmaBase | null;
}

export function TurmaBaseDialog({ open, onOpenChange, turma }: TurmaBaseDialogProps) {
  const [nome, setNome] = useState("");
  const [idadeMinima, setIdadeMinima] = useState("");
  const [idadeMaxima, setIdadeMaxima] = useState("");
  const [descricao, setDescricao] = useState("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const createMutation = useCreateTurmaBase();
  const updateMutation = useUpdateTurmaBase();
  const deleteMutation = useDeleteTurmaBase();
  
  // Check if turma base is in use
  const { data: usageData } = useCheckTurmaBaseInUse(turma?.nome);
  const hasLinkedTurmas = (usageData?.turmasCount || 0) > 0;

  useEffect(() => {
    if (turma) {
      setNome(turma.nome);
      setIdadeMinima(turma.idade_minima_meses.toString());
      setIdadeMaxima(turma.idade_maxima_meses.toString());
      setDescricao(turma.descricao || "");
    } else {
      setNome("");
      setIdadeMinima("");
      setIdadeMaxima("");
      setDescricao("");
    }
  }, [turma, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const idadeMin = parseInt(idadeMinima);
    const idadeMax = parseInt(idadeMaxima);

    if (isNaN(idadeMin) || isNaN(idadeMax)) {
      return;
    }

    if (idadeMax < idadeMin) {
      return;
    }

    const data = {
      nome: nome.trim(),
      idade_minima_meses: idadeMin,
      idade_maxima_meses: idadeMax,
      descricao: descricao.trim() || null,
      ordem: turma?.ordem || 0,
      ativo: true,
    };

    if (turma) {
      await updateMutation.mutateAsync({ id: turma.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (turma) {
      await deleteMutation.mutateAsync({ id: turma.id, nome: turma.nome });
      setShowDeleteAlert(false);
      onOpenChange(false);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{turma ? "Editar Turma Base" : "Nova Turma Base"}</DialogTitle>
            <DialogDescription>
              {turma ? "Atualize as informações da turma base." : "Crie um novo modelo de turma com faixa etária."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Turma *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maternal III"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idade-minima">Idade Mínima (meses)</Label>
                <Input
                  id="idade-minima"
                  type="number"
                  min="0"
                  max="999"
                  value={idadeMinima}
                  onChange={(e) => setIdadeMinima(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idade-maxima">Idade Máxima (meses)</Label>
                <Input
                  id="idade-maxima"
                  type="number"
                  min="0"
                  max="999"
                  value={idadeMaxima}
                  onChange={(e) => setIdadeMaxima(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição da Faixa Etária</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: 1 a 2 anos"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              {turma && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteAlert(true)}
                  disabled={isLoading || deleteMutation.isPending || hasLinkedTurmas}
                  title={hasLinkedTurmas ? "Existem turmas utilizando este modelo" : "Excluir turma base"}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Turma
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>

            {turma && hasLinkedTurmas && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Não é possível excluir</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    Existem {usageData?.turmasCount} turma(s) utilizando este modelo:
                  </p>
                  <ul className="list-disc pl-4 text-sm">
                    {usageData?.turmas?.slice(0, 5).map((t: any) => (
                      <li key={t.id}>
                        {t.nome} - {t.cmeis?.nome || "Unidade não identificada"}
                      </li>
                    ))}
                    {(usageData?.turmasCount || 0) > 5 && (
                      <li>e mais {(usageData?.turmasCount || 0) - 5} turma(s)...</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta turma base? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

