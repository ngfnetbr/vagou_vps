import { useState } from "react";
import { useFeriados, useCreateFeriado, useUpdateFeriado, useDeleteFeriado, Feriado } from "@/hooks/api/modo-operacao-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Edit, Plus, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const FeriadosManager = () => {
  const { data: feriados, isLoading } = useFeriados();
  const createMutation = useCreateFeriado();
  const updateMutation = useUpdateFeriado();
  const deleteMutation = useDeleteFeriado();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeriado, setEditingFeriado] = useState<Feriado | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    data: "",
    recorrente: false,
    ativo: true,
  });

  const resetForm = () => {
    setFormData({ nome: "", data: "", recorrente: false, ativo: true });
    setEditingFeriado(null);
  };

  const handleEdit = (feriado: Feriado) => {
    setEditingFeriado(feriado);
    setFormData({
      nome: feriado.nome,
      data: feriado.data,
      recorrente: feriado.recorrente,
      ativo: feriado.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.data) return;

    try {
      if (editingFeriado) {
        await updateMutation.mutateAsync({ id: editingFeriado.id, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este feriado?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Feriados Municipais
            </CardTitle>
            <CardDescription>
              Configure os feriados que serão considerados no cálculo de prazos
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Feriado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFeriado ? "Editar Feriado" : "Novo Feriado"}</DialogTitle>
                <DialogDescription>
                  Feriados são considerados no cálculo de prazos quando a opção "Usar dias úteis" está ativada.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Feriado</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Aniversário da Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.recorrente}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, recorrente: v }))}
                  />
                  <Label className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Repete todo ano
                  </Label>
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
        {feriados && feriados.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feriados.map((feriado) => (
                <TableRow key={feriado.id}>
                  <TableCell className="font-medium">{feriado.nome}</TableCell>
                  <TableCell>
                    {format(new Date(feriado.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={feriado.recorrente ? "default" : "outline"}>
                      {feriado.recorrente ? "Anual" : "Pontual"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={feriado.ativo ? "default" : "secondary"}>
                      {feriado.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(feriado)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(feriado.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum feriado cadastrado
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeriadosManager;

