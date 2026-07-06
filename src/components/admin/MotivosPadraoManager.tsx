import { useState } from "react";
import { useMotivosPadrao, useCreateMotivoPadrao, useUpdateMotivoPadrao, useDeleteMotivoPadrao, TIPOS_MOTIVO, TipoMotivo, MotivoPadrao } from "@/hooks/api/workflow-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Edit, Plus, Trash2, List } from "lucide-react";

export const MotivosPadraoManager = () => {
  const [selectedTipo, setSelectedTipo] = useState<TipoMotivo>("desistencia");
  const { data: motivos, isLoading } = useMotivosPadrao();
  const createMutation = useCreateMotivoPadrao();
  const updateMutation = useUpdateMotivoPadrao();
  const deleteMutation = useDeleteMotivoPadrao();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState<MotivoPadrao | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [motivoToDelete, setMotivoToDelete] = useState<MotivoPadrao | null>(null);
  const [formData, setFormData] = useState({
    tipo: "desistencia" as TipoMotivo,
    descricao: "",
    ordem: 0,
    ativo: true,
  });

  const resetForm = () => {
    setFormData({ tipo: selectedTipo, descricao: "", ordem: 0, ativo: true });
    setEditingMotivo(null);
  };

  const handleEdit = (motivo: MotivoPadrao) => {
    setEditingMotivo(motivo);
    setFormData({
      tipo: motivo.tipo as TipoMotivo,
      descricao: motivo.descricao,
      ordem: motivo.ordem,
      ativo: motivo.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.descricao) return;

    try {
      if (editingMotivo) {
        await updateMutation.mutateAsync({ id: editingMotivo.id, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRequestDelete = (motivo: MotivoPadrao) => {
    setMotivoToDelete(motivo);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!motivoToDelete) return;
    await deleteMutation.mutateAsync(motivoToDelete.id);
    setDeleteDialogOpen(false);
    setMotivoToDelete(null);
  };

  const handleNewMotivo = () => {
    resetForm();
    setFormData(prev => ({ ...prev, tipo: selectedTipo }));
    setIsDialogOpen(true);
  };

  const motivosFiltrados = motivos?.filter(m => m.tipo === selectedTipo) || [];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Motivos Padrão
            </CardTitle>
            <CardDescription>
              Configure opções de justificativa para desistência, recusa, transferência e remanejamento
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={handleNewMotivo} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Motivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMotivo ? "Editar Motivo" : "Novo Motivo"}</DialogTitle>
                <DialogDescription>
                  Motivos padrão facilitam o preenchimento de justificativas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as TipoMotivo }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_MOTIVO).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Ex: Mudança de endereço"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordem de exibição</Label>
                  <Input
                    type="number"
                    value={formData.ordem}
                    onChange={(e) => setFormData(prev => ({ ...prev, ordem: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, ativo: v }))}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTipo} onValueChange={(v) => setSelectedTipo(v as TipoMotivo)}>
          <TabsList className="w-full justify-start overflow-x-auto flex flex-nowrap bg-muted/50 p-1">
            {Object.entries(TIPOS_MOTIVO).map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="flex-shrink-0">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(TIPOS_MOTIVO).map((tipo) => (
            <TabsContent key={tipo} value={tipo} className="mt-4">
              {motivosFiltrados.length > 0 ? (
                <div className="space-y-2">
                  {motivosFiltrados.map((motivo) => (
                    <div
                      key={motivo.id}
                      className="flex flex-col gap-2 p-3 border rounded-lg sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={motivo.ativo ? "default" : "secondary"}>
                          {motivo.ordem}
                        </Badge>
                        <span className={motivo.ativo ? "" : "text-muted-foreground line-through"}>
                          {motivo.descricao}
                        </span>
                      </div>
                      <div className="flex gap-2 sm:justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(motivo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRequestDelete(motivo)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum motivo cadastrado para {TIPOS_MOTIVO[tipo as TipoMotivo]}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir motivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir &quot;{motivoToDelete?.descricao}&quot;? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default MotivosPadraoManager;

