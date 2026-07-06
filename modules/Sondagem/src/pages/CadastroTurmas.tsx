import { useState, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select";
import { Badge } from "@ui/badge";
import { Plus, Trash2, Users, Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@root/hooks/use-toast";
import { useUnifiedTurmas, useCreateTurma, useDeleteTurma, useUpdateTurma, useUnifiedCmeis } from "@sondagem/hooks/useLocalCadastros";

const PAGE_SIZE = 15;

export default function CadastroTurmas() {
  const { toast } = useToast();
  const { data: cmeis } = useUnifiedCmeis();
  const createTurma = useCreateTurma();
  const updateTurma = useUpdateTurma();
  const deleteTurma = useDeleteTurma();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [cmeiId, setCmeiId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchNome, setSearchNome] = useState("");
  const [filterCmei, setFilterCmei] = useState("");
  const [page, setPage] = useState(1);

  const { data: unifiedTurmas, isLoading } = useUnifiedTurmas(filterCmei || undefined);

  const filtered = useMemo(() =>
    unifiedTurmas?.filter(t => !searchNome || t.nome.toLowerCase().includes(searchNome.toLowerCase())) || [],
    [unifiedTurmas, searchNome]
  );
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedCmei = cmeis?.find(c => c.id === cmeiId);

  const openCreate = () => {
    setEditId(null);
    setNome("");
    setCmeiId("");
    setDialogOpen(true);
  };

  const openEdit = (turma: { id: string; nome: string; cmei_id: string; fonte: string }) => {
    if (turma.fonte !== "local") {
      toast({ title: "Apenas registros locais podem ser editados", variant: "destructive" });
      return;
    }
    setEditId(turma.id);
    setNome(turma.nome);
    setCmeiId(turma.cmei_id || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Preencha o nome da turma", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        nome: nome.trim(),
        cmei_id: cmeiId || undefined,
        cmei_nome: selectedCmei?.nome || undefined,
      };
      if (editId) {
        await updateTurma.mutateAsync({ id: editId, ...payload });
        toast({ title: "Turma atualizada com sucesso!" });
      } else {
        await createTurma.mutateAsync(payload);
        toast({ title: "Turma cadastrada com sucesso!" });
      }
      setNome("");
      setCmeiId("");
      setEditId(null);
      setDialogOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTurma.mutateAsync(deleteId);
      toast({ title: "Turma removida" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
    setDeleteId(null);
  };

  const isPending = createTurma.isPending || updateTurma.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Turmas</h2>
          <p className="text-sm text-muted-foreground">Cadastro de turmas</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Turma
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterCmei} onValueChange={v => { setFilterCmei(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por Instituição" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Instituições</SelectItem>
            {cmeis?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-[220px]"
            placeholder="Buscar por nome..."
            value={searchNome}
            onChange={e => { setSearchNome(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Turmas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !filtered.length ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma turma encontrada</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((t, i) => (
                  <TableRow key={`${t.id}-${i}`}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell>{t.cmei_nome || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.fonte === "local" ? "secondary" : "outline"} className="text-xs">
                        {t.fonte === "local" ? "Local" : "Sincronizado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)} disabled={t.fonte !== "local"} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} disabled={t.fonte !== "local"} title="Excluir">
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
            <DialogTitle>{editId ? "Editar Turma" : "Nova Turma"}</DialogTitle>
            <DialogDescription>{editId ? "Atualize os dados da turma local." : "Crie uma turma local vinculada a uma instituição."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Turma</label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Infantil 5A" />
            </div>
            <div>
              <label className="text-sm font-medium">Instituição</label>
              <Select value={cmeiId} onValueChange={setCmeiId}>
                <SelectTrigger><SelectValue placeholder="Selecione a instituição" /></SelectTrigger>
                <SelectContent>
                  {cmeis?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <AlertDialogDescription>Deseja realmente remover esta turma?</AlertDialogDescription>
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

