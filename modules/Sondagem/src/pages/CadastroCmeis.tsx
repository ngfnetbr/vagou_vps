import { useState, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@ui/alert-dialog";
import { Badge } from "@ui/badge";
import { Plus, Trash2, Building2, Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@root/hooks/use-toast";
import { useUnifiedCmeis, useCreateCmei, useDeleteCmei, useUpdateCmei } from "@sondagem/hooks/useLocalCadastros";

const PAGE_SIZE = 15;

export default function CadastroCmeis() {
  const { toast } = useToast();
  const { data: unifiedCmeis, isLoading } = useUnifiedCmeis();
  const createCmei = useCreateCmei();
  const updateCmei = useUpdateCmei();
  const deleteCmei = useDeleteCmei();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchNome, setSearchNome] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() =>
    unifiedCmeis?.filter(c => !searchNome || c.nome.toLowerCase().includes(searchNome.toLowerCase())) || [],
    [unifiedCmeis, searchNome]
  );
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openCreate = () => {
    setEditId(null);
    setNome("");
    setDialogOpen(true);
  };

  const openEdit = (cmei: { id: string; nome: string; fonte: string }) => {
    if (cmei.fonte !== "local") {
      toast({ title: "Apenas registros locais podem ser editados", variant: "destructive" });
      return;
    }
    setEditId(cmei.id);
    setNome(cmei.nome);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Preencha o nome", variant: "destructive" });
      return;
    }
    try {
      if (editId) {
        await updateCmei.mutateAsync({ id: editId, nome: nome.trim() });
        toast({ title: "Instituição atualizada com sucesso!" });
      } else {
        await createCmei.mutateAsync(nome.trim());
        toast({ title: "Instituição cadastrada com sucesso!" });
      }
      setNome("");
      setEditId(null);
      setDialogOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCmei.mutateAsync(deleteId);
      toast({ title: "Instituição removida" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
    setDeleteId(null);
  };

  const isPending = createCmei.isPending || updateCmei.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Instituições</h2>
          <p className="text-sm text-muted-foreground">Cadastro de Instituições</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Instituição
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-[260px]"
            placeholder="Buscar por nome..."
            value={searchNome}
            onChange={e => { setSearchNome(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Instituições
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !filtered.length ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma instituição encontrada</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((cmei, i) => (
                  <TableRow key={`${cmei.id}-${i}`}>
                    <TableCell className="font-medium">{cmei.nome}</TableCell>
                    <TableCell>
                      <Badge variant={cmei.fonte === "local" ? "secondary" : "outline"} className="text-xs">
                        {cmei.fonte === "local" ? "Local" : "Sincronizado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cmei)} disabled={cmei.fonte !== "local"} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(cmei.id)} disabled={cmei.fonte !== "local"} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Mostrando {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, totalFiltered)} de {totalFiltered} registros
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">{safePage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
                  Próxima <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Instituição" : "Nova Instituição"}</DialogTitle>
            <DialogDescription>{editId ? "Atualize os dados da instituição local." : "Cadastre uma instituição local para uso no módulo."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da Instituição" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Spinner className="h-4 w-4 animate-spin mr-2" /> : null}
              {editId ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Deseja realmente remover esta instituição?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


