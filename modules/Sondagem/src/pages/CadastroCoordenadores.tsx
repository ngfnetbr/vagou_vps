// @ts-nocheck
import { useMemo, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Badge } from "@ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select";
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
import { Plus, RefreshCcw, Mail, Pencil, UsersRound, UserCog, ShieldCheck, Search } from "lucide-react";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useCMEIs } from "@sondagem/hooks/useSupabaseData";
import { VagouListShell } from "@root/components/common/VagouListShell";
import { TableSkeleton } from "@root/components/common/skeletons";
import { Card, CardContent } from "@ui/card";

type ListedUser = {
  id: string;
  email: string;
  nome: string;
  cmei_id: string;
  cmei_nome: string;
  role: string;
  created_at: string;
};

type CoordenadorForm = {
  nome_completo: string;
  email: string;
  password: string;
  cmei_id: string;
  role: string;
};

const initialForm: CoordenadorForm = {
  nome_completo: "",
  email: "",
  password: "",
  cmei_id: "",
  role: "coordenador",
};

const ROLE_LABELS: Record<string, string> = {
  coordenador: "Coordenador",
  gestor: "Gestor",
};

function hasErrorField(value: unknown): value is { error: unknown } {
  return typeof value === "object" && value !== null && "error" in value;
}

function throwIfInvokeDataError(data: unknown) {
  if (!hasErrorField(data)) return;
  if (typeof data.error === "string" && data.error) throw new Error(data.error);
}

export default function CadastroCoordenadores() {
  const queryClient = useQueryClient();
  const { data: cmeis = [], isLoading: loadingCmeis } = useCMEIs();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ListedUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CoordenadorForm>(initialForm);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["sondagem-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-users");
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as ListedUser[];
    },
  });

  const coordenadores = useMemo(() => {
    return users
      .filter((u) => ["coordenador", "gestor"].includes((u.role || "").toLowerCase()))
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [users]);

  const openNew = () => {
    setEditing(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEdit = (u: ListedUser) => {
    setEditing(u);
    setForm({
      nome_completo: u.nome || "",
      email: u.email || "",
      password: "",
      cmei_id: u.cmei_id || "",
      role: (u.role || "coordenador").toLowerCase(),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(initialForm);
  };

  const submit = async () => {
    if (!form.nome_completo.trim()) {
      toast.error("Informe o nome do coordenador.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Informe o e-mail do coordenador.");
      return;
    }
    if (form.role === "coordenador" && !form.cmei_id) {
      toast.error("Selecione o local (CMEI).");
      return;
    }

    if (!editing && form.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSaving(true);
    try {
      if (!editing) {
        const { data, error } = await supabase.functions.invoke("admin-usuarios", {
          body: {
            action: "create-user",
            email: form.email.trim(),
            password: form.password,
            nome_completo: form.nome_completo.trim(),
            role: form.role,
            cmei_id: form.role === "coordenador" ? form.cmei_id : null,
            modules: ["sondagem"],
          },
        });
        if (error) throw error;
        throwIfInvokeDataError(data);
        toast.success(`${ROLE_LABELS[form.role] || "Usuário"} cadastrado com sucesso.`);
      } else {
        const { data, error } = await supabase.functions.invoke("admin-usuarios", {
          body: {
            action: "update-user",
            user_id: editing.id,
            nome_completo: form.nome_completo.trim(),
            cmei_id: form.role === "coordenador" ? form.cmei_id : null,
          },
        });
        if (error) throw error;
        throwIfInvokeDataError(data);
        toast.success("Usuário atualizado com sucesso.");
      }

      queryClient.invalidateQueries({ queryKey: ["sondagem-users"] });
      closeDialog();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar coordenador.");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-usuarios", {
        body: { action: "reset-password", email },
      });
      if (error) throw error;
      throwIfInvokeDataError(data);
      toast.success("E-mail de redefinição de senha enviado.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar redefinição de senha.");
    }
  };

  const cmeiLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cmeis) map.set(c.id, c.nome);
    return (id?: string) => (id ? map.get(id) || id : "—");
  }, [cmeis]);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coordenadores;
    return coordenadores.filter(
      (u) =>
        (u.nome || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [coordenadores, search]);

  const stats = useMemo(() => {
    const total = coordenadores.length;
    const gestores = coordenadores.filter((u) => (u.role || "").toLowerCase() === "gestor").length;
    return { total, gestores, coords: total - gestores };
  }, [coordenadores]);

  return (
    <VagouListShell
      title={
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <UsersRound className="h-7 w-7 text-primary" />
          Usuários do SONDAR
        </h1>
      }
      description="Cadastre gestores (acesso ao módulo SONDAR) e coordenadores (vinculados a um local/CMEI para lançar a sondagem)."
      actions={
        <>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        </>
      }
      stats={[
        { title: "Total de usuários", value: stats.total, subtitle: "cadastrados", icon: UsersRound, accent: "primary" },
        { title: "Coordenadores", value: stats.coords, subtitle: "vinculados a CMEI", icon: UserCog, accent: "info" },
        { title: "Gestores", value: stats.gestores, subtitle: "acesso ao módulo", icon: ShieldCheck, accent: "success" },
      ]}
      search={{ value: search, onChange: setSearch, placeholder: "Buscar por nome ou e-mail..." }}
      onClear={() => setSearch("")}
      showClear={!!search}
    >
      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              {search ? <Search className="h-6 w-6 text-primary" /> : <UsersRound className="h-6 w-6 text-primary" />}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {search ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {search ? "Ajuste os termos da busca e tente novamente." : "Cadastre gestores e coordenadores para começar."}
              </p>
            </div>
            {!search && (
              <Button size="sm" onClick={openNew} className="mt-1">
                <Plus className="h-4 w-4 mr-2" /> Novo usuário
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl bg-card shadow-sm border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {ROLE_LABELS[(u.role || "").toLowerCase()] || u.role || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{cmeiLabelById(u.cmei_id) || u.cmei_nome || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1.5 text-xs border-success/30 text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      Ativo
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => resetPassword(u.email)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Redefinir senha
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}


      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar coordenador" : "Novo coordenador"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize o nome e o local (CMEI) vinculado ao coordenador."
                : "Defina os dados do coordenador. A senha será usada para o primeiro acesso."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Nome</div>
              <Input
                value={form.nome_completo}
                onChange={(e) => setForm((p) => ({ ...p, nome_completo: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">E-mail</div>
              <Input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
                disabled={!!editing}
              />
            </div>

            {!editing && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Senha</div>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Papel</div>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordenador">Coordenador</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === "coordenador" && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Local (CMEI)</div>
                <Select
                  value={form.cmei_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, cmei_id: v }))}
                  disabled={loadingCmeis}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCmeis ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cmeis.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Spinner className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VagouListShell>

  );
}
