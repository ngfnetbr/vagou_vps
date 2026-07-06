// @ts-nocheck
import { useMemo, useState } from "react";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Badge } from "@ui/badge";
import { Card, CardContent } from "@ui/card";
import { VagouListShell } from "@root/components/common/VagouListShell";
import { toast } from "sonner";
import { Calendar, CalendarPlus, Pencil, RefreshCcw, Lock, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ui/alert-dialog";
import { supabase } from "@sondagem/integrations/supabase/client";
import { usePeriodos, type PeriodoOption } from "@sondagem/hooks/useSupabaseData";
import { useAuth } from "@root/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { registrarAuditoria } from "@sondagem/hooks/useAuditLog";

type PeriodoForm = {
  codigo: string;
  nome: string;
  inicio_local: string;
  fim_local: string;
};

function isoToLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

function getDefaultPeriodoNome(codigo: string) {
  const m = /^(\d{4})-(\d+)$/.exec(codigo);
  if (!m) return codigo;
  const year = Number(m[1]);
  const part = Number(m[2]);
  if (part === 1 || part === 2) return `${year} - ${part}º Semestre`;
  return `${year} - ${part}º Período`;
}

function getNextPeriodoCodigo(periodos: PeriodoOption[]) {
  const parsed = periodos
    .map((p) => {
      const m = /^(\d{4})-(\d+)$/.exec(p.codigo);
      if (!m) return null;
      return { year: Number(m[1]), part: Number(m[2]) };
    })
    .filter((v): v is { year: number; part: number } => !!v)
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.part - b.part));

  const nowYear = new Date().getFullYear();
  if (parsed.length === 0) return `${nowYear}-1`;

  const last = parsed[parsed.length - 1];
  if (last.part >= 2) return `${last.year + 1}-1`;
  return `${last.year}-${last.part + 1}`;
}

export default function CadastroPeriodos() {
  const queryClient = useQueryClient();
  const { data: periodos = [] } = usePeriodos();
  const { user } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PeriodoForm>({
    codigo: "",
    nome: "",
    inicio_local: "",
    fim_local: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ codigo: string; label: string } | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<{ codigo: string; label: string } | null>(null);

  const sorted = useMemo(() => [...periodos].sort((a, b) => a.codigo.localeCompare(b.codigo)), [periodos]);

  const openNew = () => {
    const codigo = getNextPeriodoCodigo(sorted);
    setIsEditing(false);
    setForm({ codigo, nome: getDefaultPeriodoNome(codigo), inicio_local: "", fim_local: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: PeriodoOption) => {
    setIsEditing(true);
    setForm({
      codigo: p.codigo,
      nome: p.nome,
      inicio_local: isoToLocalInput(p.inicio_em),
      fim_local: isoToLocalInput(p.fim_em),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const codigo = form.codigo.trim();
    const nome = form.nome.trim();
    if (!codigo || !nome) {
      toast.error("Preencha o código e o nome do período.");
      return;
    }

    const inicio_em = localInputToIso(form.inicio_local);
    const fim_em = localInputToIso(form.fim_local);
    if (inicio_em && fim_em && new Date(inicio_em) >= new Date(fim_em)) {
      toast.error("A data de início deve ser menor que a data de fim.");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("periodos")
          .update({
            nome,
            inicio_em,
            fim_em,
          })
          .eq("codigo", codigo);
        if (error) throw error;
        await registrarAuditoria({ acao: "atualizar", tabela: "periodos", detalhes: `Período atualizado: ${nome}` });
      } else {
        const { error } = await supabase.from("periodos").insert([
          {
            codigo,
            nome,
            inicio_em,
            fim_em,
          },
        ]);
        if (error) throw error;
        await registrarAuditoria({ acao: "criar", tabela: "periodos", detalhes: `Período criado: ${nome}` });
      }

      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      setDialogOpen(false);
      toast.success(isEditing ? "Período atualizado!" : "Período cadastrado!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao salvar período: " + message);
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { codigo, label } = deleteConfirm;
    setDeleteConfirm(null);

    const { error } = await supabase.from("periodos").delete().eq("codigo", codigo);
    if (error) {
      toast.error("Erro ao remover período.");
      return;
    }
    await registrarAuditoria({ acao: "excluir", tabela: "periodos", detalhes: `Período removido: ${label}` });
    queryClient.invalidateQueries({ queryKey: ["periodos"] });
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    toast.success("Período removido.");
  };

  const executeClose = async () => {
    if (!closeConfirm) return;
    if (!user) return;
    const { codigo, label } = closeConfirm;
    setCloseConfirm(null);

    const { error } = await supabase
      .from("periodos")
      .update({
        fechado_em: new Date().toISOString(),
        fechado_por: user.id,
      })
      .eq("codigo", codigo);
    if (error) {
      toast.error("Erro ao fechar período.");
      return;
    }
    await registrarAuditoria({ acao: "atualizar", tabela: "periodos", detalhes: `Período fechado: ${label}` });
    queryClient.invalidateQueries({ queryKey: ["periodos"] });
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    toast.success("Período fechado.");
  };

  const executeReopen = async (p: PeriodoOption) => {
    if (!user) return;
    const { error } = await supabase
      .from("periodos")
      .update({
        fechado_em: null,
        fechado_por: null,
      })
      .eq("codigo", p.codigo);
    if (error) {
      toast.error("Erro ao reabrir período.");
      return;
    }
    await registrarAuditoria({ acao: "atualizar", tabela: "periodos", detalhes: `Período reaberto: ${p.nome}` });
    queryClient.invalidateQueries({ queryKey: ["periodos"] });
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    toast.success("Período reaberto.");
  };

  const stats = useMemo(() => {
    const total = sorted.length;
    const abertos = sorted.filter((p) => p.isOpen).length;
    return { total, abertos, fechados: total - abertos };
  }, [sorted]);

  return (
    <VagouListShell
      title={
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-7 w-7 text-primary" />
          Períodos de Sondagem
        </h1>
      }
      description="Defina a janela de cada período para bloquear lançamentos automaticamente após o fim."
      actions={
        <Button className="gap-1.5" onClick={openNew}>
          <CalendarPlus className="h-4 w-4" /> Novo Período
        </Button>
      }
      stats={[
        { title: "Total de períodos", value: stats.total, subtitle: "cadastrados", icon: Calendar, accent: "primary" },
        { title: "Abertos", value: stats.abertos, subtitle: "aceitando lançamentos", icon: RefreshCcw, accent: "success" },
        { title: "Fechados", value: stats.fechados, subtitle: "bloqueados", icon: Lock, accent: "destructive" },
      ]}
    >
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Nenhum período cadastrado</p>
              <p className="text-xs text-muted-foreground">Crie o primeiro período para habilitar os lançamentos de sondagem.</p>
            </div>
            <Button size="sm" onClick={openNew} className="mt-1 gap-1.5">
              <CalendarPlus className="h-4 w-4" /> Novo período
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-44">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow key={p.codigo} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{p.codigo}</TableCell>
                  <TableCell className="text-sm">{p.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(p.inicio_em)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(p.fim_em)}</TableCell>
                  <TableCell>
                    {p.isOpen ? (
                      <Badge variant="outline" className="gap-1.5 border-success/30 text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        Aberto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 border-destructive/30 text-destructive">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        Fechado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {p.isOpen ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setCloseConfirm({ codigo: p.codigo, label: p.nome })}
                          title="Fechar"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => executeReopen(p)}
                          title="Reabrir"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteConfirm({ codigo: p.codigo, label: p.nome })}
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Período" : "Novo Período"}</DialogTitle>
            <DialogDescription>
              Se definir uma data de fim, o período será bloqueado automaticamente após essa data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Código</label>
              <Input
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="Ex: 2026-2"
                disabled={isEditing}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome</label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: 2026 - 2º Semestre"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Início (opcional)</label>
                <Input
                  type="datetime-local"
                  value={form.inicio_local}
                  onChange={(e) => setForm((f) => ({ ...f, inicio_local: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fim (opcional)</label>
                <Input
                  type="datetime-local"
                  value={form.fim_local}
                  onChange={(e) => setForm((f) => ({ ...f, fim_local: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : isEditing ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirm?.label}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!closeConfirm} onOpenChange={(open) => !open && setCloseConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar período</AlertDialogTitle>
            <AlertDialogDescription>
              Ao fechar <strong>{closeConfirm?.label}</strong>, não será mais possível lançar ou alterar sondagens nesse período.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeClose}>
              Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </VagouListShell>

  );
}
