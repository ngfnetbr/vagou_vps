import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Edit, Trash2, FileText, GripVertical } from "lucide-react";
import {
  useDocumentosTipos,
  useCreateDocumentoTipo,
  useUpdateDocumentoTipo,
  useDeleteDocumentoTipo,
  type DocumentoTipo,
} from "@/hooks/api/documentos-hooks";

export function DocumentosTiposConfig() {
  const { data: tipos, isLoading } = useDocumentosTipos();
  const createMutation = useCreateDocumentoTipo();
  const updateMutation = useUpdateDocumentoTipo();
  const deleteMutation = useDeleteDocumentoTipo();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<DocumentoTipo | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    obrigatorio: true,
    ativo: true,
    ordem: 0,
  });

  const handleNew = () => {
    setSelectedTipo(null);
    setFormData({
      nome: "",
      descricao: "",
      obrigatorio: true,
      ativo: true,
      ordem: (tipos?.length || 0) + 1,
    });
    setDialogOpen(true);
  };

  const handleEdit = (tipo: DocumentoTipo) => {
    setSelectedTipo(tipo);
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao || "",
      obrigatorio: tipo.obrigatorio,
      ativo: tipo.ativo,
      ordem: tipo.ordem,
    });
    setDialogOpen(true);
  };

  const handleDelete = (tipo: DocumentoTipo) => {
    setSelectedTipo(tipo);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedTipo) {
      updateMutation.mutate(
        { id: selectedTipo.id, ...formData },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createMutation.mutate(formData, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedTipo) {
      deleteMutation.mutate(selectedTipo.id, {
        onSuccess: () => setDeleteDialogOpen(false),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tipos de Documentos
              </CardTitle>
              <CardDescription>
                Configure os documentos necessários para matrícula
              </CardDescription>
            </div>
            <Button onClick={handleNew} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo Documento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!tipos || tipos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum tipo de documento cadastrado
            </div>
          ) : (
            <div className="space-y-3">
              {tipos.map((tipo) => (
                <div
                  key={tipo.id}
                  className="flex flex-col gap-3 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tipo.nome}</span>
                        {tipo.obrigatorio && (
                          <Badge variant="secondary" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                        {!tipo.ativo && (
                          <Badge variant="outline" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      {tipo.descricao && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {tipo.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(tipo)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tipo)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição/Criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTipo ? "Editar Documento" : "Novo Documento"}
            </DialogTitle>
            <DialogDescription>
              Configure as informações do tipo de documento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Ex: Certidão de Nascimento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Ex: Cópia da certidão de nascimento da criança"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Obrigatório</Label>
                <p className="text-sm text-muted-foreground">
                  Documento é necessário para matrícula
                </p>
              </div>
              <Switch
                checked={formData.obrigatorio}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, obrigatorio: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Documento aparece na lista de envios
                </p>
              </div>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, ativo: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordem">Ordem de exibição</Label>
              <Input
                id="ordem"
                type="number"
                value={formData.ordem}
                onChange={(e) =>
                  setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.nome || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo de documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{selectedTipo?.nome}"? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

