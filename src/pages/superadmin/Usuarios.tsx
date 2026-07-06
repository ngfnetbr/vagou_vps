import { useMemo, useState } from "react";
import SuperAdminLayout from "@/components/superadmin/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/common/skeletons";
import {
  Search,
  UserPlus,
  MoreHorizontal,
  ShieldCheck,
  Layers,
  Ban,
  CheckCircle,
  LogIn,
  Wifi,
  Clock,
  RefreshCw,
  UserCheck,
  KeyRound,
  Copy,
} from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  useUsuarios,
  useResetUserPassword,
  useToggleUserStatus,
  roleLabels,
  roleColors,
  type Usuario,
  type AppRole,
  type ModuleKey,
} from "@/hooks/api/usuarios-hooks";
import { useImpersonateUser, useUserActivity } from "@/hooks/api/superadmin-painel-hooks";
import { useOnlineUsers } from "@/hooks/use-presence";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UserRoleDialog } from "@/components/admin/UserRoleDialog";
import { UserModulesDialog } from "@/components/admin/UserModulesDialog";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";

const moduleLabels: Record<string, string> = { vagou: "VAGOU", sam: "SAM", sondagem: "SONDAR" };

const MODULES: { key: ModuleKey; label: string }[] = [
  { key: "vagou", label: "VAGOU" },
  { key: "sam", label: "SAM" },
  { key: "sondagem", label: "SONDAR" },
];

const ROLE_PRIORITY: AppRole[] = [
  "superadmin",
  "admin",
  "gestor",
  "diretor_cmei",
  "school_coord",
  "responsavel",
];

const ALL = "__all__";

function formatDateTime(value: string | null) {
  if (!value) return "Nunca";
  const d = new Date(value);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(value: string | null) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  return `há ${days}d`;
}

function initials(name: string | null, email: string | null) {
  const base = name || email || "U";
  return base.slice(0, 2).toUpperCase();
}

function primaryRole(roles: AppRole[]): AppRole {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return roles[0] ?? "responsavel";
}

export default function SuperAdminUsuarios() {
  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold">Usuários & Atividade</h1>
          <p className="text-muted-foreground">
            Gerencie contas e papéis, e acompanhe sessões e o último acesso de cada usuário.
          </p>
        </div>


        <Tabs defaultValue="gerenciamento" className="space-y-6">
          <TabsList>
            <TabsTrigger value="gerenciamento">
              <UserCheck className="mr-2 h-4 w-4" /> Gerenciamento
            </TabsTrigger>
            <TabsTrigger value="atividade">
              <Wifi className="mr-2 h-4 w-4" /> Sessões & Atividade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gerenciamento">
            <GerenciamentoTab />
          </TabsContent>
          <TabsContent value="atividade">
            <AtividadeTab />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}

function GerenciamentoTab() {
  const [busca, setBusca] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [moduleFilter, setModuleFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const { data: usuarios = [], isLoading } = useUsuarios(undefined, busca || undefined);
  const toggleStatus = useToggleUserStatus();
  const resetPassword = useResetUserPassword();
  const impersonate = useImpersonateUser();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<Usuario | null>(null);
  const [modulesUser, setModulesUser] = useState<Usuario | null>(null);
  const [resetUser, setResetUser] = useState<Usuario | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [resetPasswordMode, setResetPasswordMode] = useState<"generate" | "manual">("generate");
  const [manualNewPassword, setManualNewPassword] = useState("");

  const confirmResetPassword = async () => {
    if (!resetUser) return;
    const response = await resetPassword.mutateAsync({
      userId: resetUser.id,
      newPassword: resetPasswordMode === "manual" ? manualNewPassword : undefined,
    });
    if (resetPasswordMode === "generate") {
      setGeneratedPassword(response?.temporary_password ?? null);
      return;
    }
    setResetUser(null);
    setManualNewPassword("");
  };

  const copyGeneratedPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success("Senha copiada!");
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  };

  const closeResetDialog = () => {
    setResetUser(null);
    setGeneratedPassword(null);
    setResetPasswordMode("generate");
    setManualNewPassword("");
  };

  const filtered = useMemo(() => {
    return usuarios.filter((u) => {
      if (roleFilter !== ALL && !u.roles.includes(roleFilter as Usuario["roles"][number])) return false;
      if (moduleFilter !== ALL && !u.modules.includes(moduleFilter as Usuario["modules"][number])) return false;
      if (statusFilter === "ativo" && !u.ativo) return false;
      if (statusFilter === "inativo" && u.ativo) return false;
      return true;
    });
  }, [usuarios, roleFilter, moduleFilter, statusFilter]);

  const hasFilters = roleFilter !== ALL || moduleFilter !== ALL || statusFilter !== ALL || busca !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Crie contas, atribua papéis e conceda acesso aos Módulos.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Novo usuário
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os papéis</SelectItem>
            {Object.entries(roleLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os módulos</SelectItem>
            {Object.entries(moduleLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setBusca("");
              setRoleFilter(ALL);
              setModuleFilter(ALL);
              setStatusFilter(ALL);
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} usuário(s) encontrado(s)
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Papéis</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} className="transition-colors hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback>
                            {(u.nome_completo || u.email || "U").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.nome_completo || "Sem nome"}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant="secondary" className={roleColors[r]}>
                            {roleLabels[r] || r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.modules.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          u.modules.map((m) => (
                            <Badge key={m} variant="outline">
                              {moduleLabels[m] || m}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.ativo ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              void impersonate
                                .mutateAsync({ userId: u.id, targetName: u.nome_completo })
                                .then(() => {
                                  toast.success("Acessando como o usuário selecionado...");
                                  navigate("/");
                                })
                                .catch(() => {
                                  return;
                                });
                            }}
                            disabled={impersonate.isPending}
                          >
                            <LogIn className="mr-2 h-4 w-4" /> Acessar como
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setRoleUser(u)}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Gerenciar papéis
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setModulesUser(u)}>
                            <Layers className="mr-2 h-4 w-4" /> Acesso aos Módulos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setResetUser(u);
                              setGeneratedPassword(null);
                              setResetPasswordMode("generate");
                              setManualNewPassword("");
                            }}
                          >
                            <KeyRound className="mr-2 h-4 w-4" /> Resetar senha
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleStatus.mutate({ user_id: u.id, ativo: !u.ativo })}
                          >
                            {u.ativo ? (
                              <>
                                <Ban className="mr-2 h-4 w-4" /> Desativar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" /> Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UserRoleDialog open={!!roleUser} onOpenChange={(o) => !o && setRoleUser(null)} usuario={roleUser} />
      <UserModulesDialog open={!!modulesUser} onOpenChange={(o) => !o && setModulesUser(null)} usuario={modulesUser} />
      <Dialog
        open={!!resetUser}
        onOpenChange={(open) => {
          if (!open) {
            closeResetDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              {generatedPassword ? (
                <>
                  Nova senha forte gerada para <strong>{resetUser?.email}</strong>.
                  Compartilhe essa senha por um canal seguro.
                </>
              ) : (
                <>
                  Escolha se deseja gerar uma senha forte automaticamente ou definir uma nova senha manualmente para <strong>{resetUser?.email}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {generatedPassword ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3">
                <Label className="text-xs uppercase text-muted-foreground">Senha gerada</Label>
                <div className="mt-1 break-all font-mono text-sm">{generatedPassword}</div>
              </div>
              <Button variant="outline" onClick={copyGeneratedPassword}>
                <Copy className="mr-2 h-4 w-4" /> Copiar Senha
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <RadioGroup
                value={resetPasswordMode}
                onValueChange={(value) => setResetPasswordMode(value as "generate" | "manual")}
              >
                <div className="flex items-start space-x-3 rounded-md border p-3">
                  <RadioGroupItem value="generate" id="sa-reset-generate" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="sa-reset-generate">Gerar senha forte</Label>
                    <p className="text-sm text-muted-foreground">
                      O sistema cria uma senha aleatória forte e mostra para copiar.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-md border p-3">
                  <RadioGroupItem value="manual" id="sa-reset-manual" className="mt-1" />
                  <div className="space-y-1 w-full">
                    <Label htmlFor="sa-reset-manual">Definir senha manualmente</Label>
                    <p className="text-sm text-muted-foreground">
                      Você escolhe a nova senha e o usuário passa a usar exatamente essa.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {resetPasswordMode === "manual" ? (
                <div className="space-y-2">
                  <Label htmlFor="sa-manual-new-password">Nova senha</Label>
                  <PasswordInput
                    id="sa-manual-new-password"
                    value={manualNewPassword}
                    onChange={(e) => setManualNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                  />
                  <PasswordStrength password={manualNewPassword} />
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            {generatedPassword ? (
              <Button onClick={closeResetDialog}>
                Fechar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeResetDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmResetPassword}
                  disabled={resetPassword.isPending || (resetPasswordMode === "manual" && manualNewPassword.length < 6)}
                >
                  {resetPassword.isPending
                    ? "Salvando..."
                    : resetPasswordMode === "generate"
                    ? "Gerar Nova Senha"
                    : "Salvar Nova Senha"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MergedUser {
  id: string;
  email: string | null;
  nome: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  roles: AppRole[];
  modules: ModuleKey[];
}

function AtividadeTab() {
  const [busca, setBusca] = useState("");
  const { data: activity = [], isLoading, refetch, isFetching } = useUserActivity();
  const { data: usuarios = [], isLoading: loadingUsuarios } = useUsuarios();
  const onlineSnapshot = useOnlineUsers();
  const online = onlineSnapshot.users;
  const impersonate = useImpersonateUser();
  const navigate = useNavigate();

  const onlineCount = onlineSnapshot.count;
  const loading = isLoading || loadingUsuarios;

  const merged = useMemo<MergedUser[]>(() => {
    const byId = new Map(usuarios.map((u) => [u.id, u]));
    return activity.map((a) => {
      const u = byId.get(a.id);
      return {
        id: a.id,
        email: a.email,
        nome: a.nome,
        avatar_url: a.avatar_url,
        created_at: a.created_at,
        last_sign_in_at: a.last_sign_in_at,
        roles: u?.roles ?? [],
        modules: u?.modules ?? [],
      };
    });
  }, [activity, usuarios]);

  const filtered = useMemo(() => {
    const term = busca.trim().toLowerCase();
    const list = !term
      ? merged
      : merged.filter(
          (u) =>
            (u.nome || "").toLowerCase().includes(term) ||
            (u.email || "").toLowerCase().includes(term),
        );
    return [...list].sort((a, b) => Number(!!online[b.id]) - Number(!!online[a.id]));
  }, [merged, busca, online]);

  const countByModule = useMemo(() => {
    const map: Record<string, number> = { all: filtered.length };
    MODULES.forEach((m) => {
      map[m.key] = filtered.filter((u) => u.modules.includes(m.key)).length;
    });
    return map;
  }, [filtered]);

  const stats = [
    { label: "Usuários", value: merged.length, icon: UserCheck },
    { label: "Online agora", value: onlineCount, icon: Wifi },
    { label: "Última atualização", value: formatDateTime(onlineSnapshot.lastUpdatedAt), icon: RefreshCw },
    {
      label: "Logaram hoje",
      value: merged.filter(
        (u) =>
          u.last_sign_in_at &&
          new Date(u.last_sign_in_at).toDateString() === new Date().toDateString(),
      ).length,
      icon: LogIn,
    },
  ];

  const handleImpersonate = async (userId: string, name: string | null) => {
    try {
      await impersonate.mutateAsync({ userId, targetName: name });
      toast.success("Acessando como o usuário selecionado...");
      navigate("/");
    } catch {
      return;
    }
  };

  const groupByRole = (list: MergedUser[]) => {
    const groups = new Map<AppRole, MergedUser[]>();
    list.forEach((u) => {
      const role = primaryRole(u.roles);
      const arr = groups.get(role) ?? [];
      arr.push(u);
      groups.set(role, arr);
    });
    return ROLE_PRIORITY.filter((r) => groups.has(r)).map((r) => ({
      role: r,
      users: groups.get(r)!,
    }));
  };

  const renderRow = (u: MergedUser) => {
    const isOnline = !!online[u.id];
    return (
      <TableRow key={u.id} className="transition-colors hover:bg-muted/40">

        <TableCell>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={u.avatar_url || undefined} />
                <AvatarFallback>{initials(u.nome, u.email)}</AvatarFallback>
              </Avatar>
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{u.nome || "Sem nome"}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          {isOnline ? (
            <Badge className="gap-1 bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:text-green-400">
              <Wifi className="h-3 w-3" /> Online
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Offline
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="text-sm">{formatDateTime(u.last_sign_in_at)}</div>
          <div className="text-xs text-muted-foreground">{timeAgo(u.last_sign_in_at)}</div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{formatDateTime(u.created_at)}</TableCell>
        <TableCell className="text-right">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleImpersonate(u.id, u.nome)}
            disabled={impersonate.isPending}
          >
            <LogIn className="mr-1.5 h-3.5 w-3.5" /> Acessar como
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const renderGroupedTable = (list: MergedUser[]) => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-4">
            <TableSkeleton rows={6} />
          </CardContent>
        </Card>
      );
    }
    if (list.length === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum usuário encontrado.
          </CardContent>
        </Card>
      );
    }
    const groups = groupByRole(list);
    return (
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.role} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={roleColors[g.role]}>
                {roleLabels[g.role] || g.role}
              </Badge>
              <span className="text-xs text-muted-foreground">{g.users.length} usuário(s)</span>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último login</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{g.users.map(renderRow)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Atualização em tempo real · última leitura {formatDateTime(onlineSnapshot.lastUpdatedAt)}
        </p>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="stagger-in grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="card-interactive group">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-bold">{loading ? "—" : s.value}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>


      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium">Usuários conectados em tempo real</p>
            <p className="text-sm text-muted-foreground">
              {onlineCount} conectado(s) · atualizado em {formatDateTime(onlineSnapshot.lastUpdatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(online).length === 0 ? (
              <Badge variant="outline" className="text-muted-foreground">Nenhum usuário online</Badge>
            ) : (
              Object.values(online).map((entry) => (
                <Badge key={entry.user_id} className="gap-1 bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:text-green-400">
                  <Wifi className="h-3 w-3" /> {entry.email || entry.user_id}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">
            Todos
            <Badge variant="secondary" className="ml-2">{countByModule.all}</Badge>
          </TabsTrigger>
          {MODULES.map((m) => (
            <TabsTrigger key={m.key} value={m.key}>
              {m.label}
              <Badge variant="secondary" className="ml-2">{countByModule[m.key] ?? 0}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">{renderGroupedTable(filtered)}</TabsContent>
        {MODULES.map((m) => (
          <TabsContent key={m.key} value={m.key}>
            {renderGroupedTable(filtered.filter((u) => u.modules.includes(m.key)))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
