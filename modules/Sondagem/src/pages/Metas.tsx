import { useState, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Badge } from "@ui/badge";
import { Card, CardContent } from "@ui/card";
import { toast } from "sonner";
import { Target, Plus, Trash2, Info, Pencil } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@ui/alert-dialog";
import { useMetas, useCreateMeta, useDeleteMeta, useUpdateMeta } from "@sondagem/hooks/useMetas";
import { useNiveis, usePeriodos } from "@sondagem/hooks/useSupabaseData";
import { VagouListShell } from "@root/components/common/VagouListShell";
import { TableSkeleton } from "@root/components/common/skeletons";

const TURMA_TIPOS = [
  { value: "all", label: "Todas as turmas" },
  { value: "infantil_3", label: "Infantil 3" },
  { value: "infantil_4", label: "Infantil 4" },
  { value: "infantil_5", label: "Infantil 5" },
  { value: "1_ano", label: "1° Ano" },
  { value: "2_ano", label: "2° Ano" },
  { value: "3_ano", label: "3° Ano" },
];

export default function Metas() {
  const { data: metas = [], isLoading } = useMetas();
  const { data: niveis = [] } = useNiveis();
  const { data: periodos = [] } = usePeriodos();
  const createMeta = useCreateMeta();
  const updateMeta = useUpdateMeta();
  const deleteMeta = useDeleteMeta();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterPeriodo, setFilterPeriodo] = useState<string>("all");

  // Form state
  const [formPeriodo, setFormPeriodo] = useState("");
  const [formTurma, setFormTurma] = useState("all");
  const [formTipo, setFormTipo] = useState("escrita");
  const [formNivel, setFormNivel] = useState("");
  const [formDescricao, setFormDescricao] = useState("");

  const niveisEscrita = useMemo(() => niveis.filter(n => n.tipo === "escrita"), [niveis]);
  const niveisProducao = useMemo(() => niveis.filter(n => n.tipo === "producao_texto"), [niveis]);
  const niveisAtivos = formTipo === "escrita" ? niveisEscrita : niveisProducao;

  const metasFiltradas = useMemo(() =>
    filterPeriodo === "all" ? metas : metas.filter(m => m.periodo_codigo === filterPeriodo),
    [metas, filterPeriodo]
  );

  const getNivelDescricao = (codigo: string, tipo: string) => {
    const nivel = niveis.find(n => n.codigo === codigo && n.tipo === (tipo === "producao_texto" ? "producao_texto" : "escrita"));
    return nivel?.descricao || codigo;
  };

  const getTurmaLabel = (tipo: string | null) =>
    TURMA_TIPOS.find(t => t.value === (tipo || "all"))?.label || tipo || "Todas";

  const getPeriodoNome = (codigo: string) =>
    periodos.find(p => p.codigo === codigo)?.nome || codigo;

  const resetForm = () => {
    setFormPeriodo("");
    setFormTurma("all");
    setFormTipo("escrita");
    setFormNivel("");
    setFormDescricao("");
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (meta: typeof metas[number]) => {
    setEditId(meta.id);
    setFormPeriodo((meta.periodo_codigo || "").trim().toUpperCase());
    setFormTurma(meta.turma_tipo || "all");
    setFormTipo((meta.tipo || "").toLowerCase().includes("produc") ? "producao_texto" : "escrita");
    setFormNivel((meta.nivel_codigo || "").trim().toUpperCase());
    setFormDescricao(meta.descricao || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formPeriodo || !formNivel) {
      toast.error("Selecione o período e o nível desejado.");
      return;
    }
    try {
      const payload = {
        periodo_codigo: formPeriodo,
        turma_tipo: formTurma === "all" ? null : formTurma,
        tipo: formTipo,
        nivel_codigo: formNivel,
        descricao: formDescricao || null,
      };
      if (editId) {
        await updateMeta.mutateAsync({ id: editId, ...payload });
        toast.success("Meta atualizada com sucesso!");
      } else {
        await createMeta.mutateAsync({ ...payload, obrigatoria: false });
        toast.success("Meta cadastrada com sucesso!");
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Erro ao salvar meta.");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMeta.mutateAsync(deleteId);
      toast.success("Meta removida.");
    } catch {
      toast.error("Erro ao remover meta.");
    }
    setDeleteId(null);
  };

  const isPending = createMeta.isPending || updateMeta.isPending;

  const stats = useMemo(() => {
    const total = metas.length;
    const escrita = metas.filter((m) => m.tipo === "escrita").length;
    return { total, escrita, producao: total - escrita };
  }, [metas]);

  return (
    <>
      <VagouListShell
        title={
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-7 w-7 text-primary" />
            Indicadores de Meta
          </h1>
        }
        description="Defina os níveis desejados por período e faixa etária. Esses indicadores servem como sugestão pedagógica."
        actions={
          <Button className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova Meta
          </Button>
        }
        stats={[
          { title: "Total de metas", value: stats.total, subtitle: "indicadores", icon: Target, accent: "primary" },
          { title: "Escrita", value: stats.escrita, subtitle: "metas de escrita", icon: Pencil, accent: "info" },
          { title: "Produção de texto", value: stats.producao, subtitle: "metas de produção", icon: Info, accent: "success" },
        ]}
        filters={
          <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              {periodos.map((p) => (
                <SelectItem key={p.codigo} value={p.codigo}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        onClear={() => setFilterPeriodo("all")}
        showClear={filterPeriodo !== "all"}
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Os indicadores de meta são <strong>sugestões</strong>, não obrigatórios. O aluno pode regredir de nível entre períodos.
              As metas aparecem nos relatórios como referência para acompanhamento pedagógico.
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : metasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {filterPeriodo === "all" ? "Nenhuma meta cadastrada" : "Nenhuma meta neste período"}
                </p>
                <p className="text-xs text-muted-foreground">Defina indicadores de meta para orientar o acompanhamento pedagógico.</p>
              </div>
              <Button size="sm" onClick={openCreate} className="mt-1 gap-1.5">
                <Plus className="h-4 w-4" /> Nova meta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nível Desejado</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metasFiltradas.map(m => (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{getPeriodoNome(m.periodo_codigo)}</TableCell>
                    <TableCell className="text-sm">{getTurmaLabel(m.turma_tipo)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {m.tipo === "escrita" ? "Escrita" : "Produção de Texto"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm text-primary">
                        {getNivelDescricao(m.nivel_codigo, m.tipo)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {m.descricao || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1 rounded hover:bg-accent transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5 text-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteId(m.id)}
                          className="p-1 rounded hover:bg-destructive/10 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </VagouListShell>


      {/* Dialog nova/editar meta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Meta" : "Nova Meta de Sondagem"}</DialogTitle>
            <DialogDescription>Defina o nível desejado para um período e faixa etária.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Período *</label>
              <Select value={formPeriodo} onValueChange={setFormPeriodo}>
                <SelectTrigger><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                <SelectContent>
                  {periodos.map(p => (
                    <SelectItem key={p.codigo} value={p.codigo}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Turma / Faixa Etária</label>
              <Select value={formTurma} onValueChange={setFormTurma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TURMA_TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo de Avaliação *</label>
              <Select value={formTipo} onValueChange={(v) => { setFormTipo(v); setFormNivel(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="escrita">Escrita</SelectItem>
                  <SelectItem value="producao_texto">Produção de Texto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nível Desejado *</label>
              <Select value={formNivel} onValueChange={setFormNivel}>
                <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
                <SelectContent>
                  {niveisAtivos.map(n => (
                    <SelectItem key={n.id} value={n.codigo}>{n.descricao} ({n.codigo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Observação (opcional)</label>
              <Input
                value={formDescricao}
                onChange={e => setFormDescricao(e.target.value)}
                placeholder="Ex: Meta sugerida pela coordenação pedagógica"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Spinner className="h-4 w-4 animate-spin mr-1" /> : null}
              {editId ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Meta</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover este indicador de meta?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>

  );
}
