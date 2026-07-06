import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Users,
  MoreHorizontal,
  ShieldCheck,
  School,
  UserPlus,
  Filter,
  RefreshCw,
  Pencil,
  KeyRound,
  Ban,
  CheckCircle,
  History,
  Trash2,
  Download,
  FileText,
  FileSpreadsheet,
  Key,
  Layers,
  Copy,
} from "lucide-react";
import {
  useUsuarios,
  AppRole,
  roleLabels,
  roleColors,
  usePromoverUsuario,
  useResetUserPassword,
  useToggleUserStatus,
  useDeleteUser,
} from "@/hooks/api/usuarios-hooks";
import { UserRoleDialog } from "@/components/admin/UserRoleDialog";
import { DiretorCmeiDialog } from "@/components/admin/DiretorCmeiDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { UserModulesDialog } from "@/components/admin/UserModulesDialog";
import { UserHistoryDialog } from "@/components/admin/UserHistoryDialog";
import { Usuario } from "@/hooks/api/usuarios-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { gerarRelatorioUsuariosPDF, gerarRelatorioUsuariosExcel } from "@/utils/relatorios-utils";
import { toast } from "sonner";
import PermissoesTab from "@/components/admin/PermissoesTab";
import { useCanAccess, PERMISSIONS } from "@/components/admin/PermissionGate";
import { PageHeader } from "@/components/common/page-header";

export default function UsuariosPage() {
  const [busca, setBusca] = useState("");
  const [filtroRole, setFiltroRole] = useState<AppRole | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">("todos");
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [cmeiDialogOpen, setCmeiDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [motivoDesativacao, setMotivoDesativacao] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [resetPasswordMode, setResetPasswordMode] = useState<"generate" | "manual">("generate");
  const [manualNewPassword, setManualNewPassword] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());
  const queryClient = useQueryClient();
  const { hasRole, user } = useAuth();

  // Permission checks
  const canCreate = useCanAccess(PERMISSIONS.USUARIOS_CRIAR);
  const canEdit = useCanAccess(PERMISSIONS.USUARIOS_EDITAR);
  const canDesativar = useCanAccess(PERMISSIONS.USUARIOS_DESATIVAR);
  const canManageRoles = useCanAccess(PERMISSIONS.USUARIOS_ROLES);
  const canExport = useCanAccess(PERMISSIONS.RELATORIOS_EXPORTAR);
  const canResetPassword = hasRole("admin") || hasRole("superadmin");

  const { data: usuarios, isLoading, refetch } = useUsuarios(
    filtroRole === "todos" ? undefined : filtroRole,
    busca || undefined
  );
  const promover = usePromoverUsuario();
  const resetPassword = useResetUserPassword();
  const toggleStatus = useToggleUserStatus();
  const deleteUser = useDeleteUser();

  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    await refetch();
    setLastUpdatedAt(Date.now());
  };

  const getInitials = (nome: string | null, email: string) => {
    if (nome) {
      const parts = nome.split(" ").filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0]?.substring(0, 2).toUpperCase() || "U";
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleEditRoles = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setRoleDialogOpen(true);
  };

  const handleEditCmeis = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setCmeiDialogOpen(true);
  };

  const handleEditUser = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setEditDialogOpen(true);
  };

  const handleEditModules = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setModulesDialogOpen(true);
  };

  const handleResetPassword = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setGeneratedPassword(null);
    setResetPasswordMode("generate");
    setManualNewPassword("");
    setResetPasswordDialogOpen(true);
  };

  const handleToggleStatus = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setMotivoDesativacao("");
    setToggleStatusDialogOpen(true);
  };

  const handleViewHistory = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setHistoryDialogOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!selectedUsuario) return;
    const response = await resetPassword.mutateAsync({
      userId: selectedUsuario.id,
      newPassword: resetPasswordMode === "manual" ? manualNewPassword : undefined,
    });
    if (resetPasswordMode === "generate") {
      setGeneratedPassword(response?.temporary_password ?? null);
      return;
    }
    setResetPasswordDialogOpen(false);
    setSelectedUsuario(null);
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

  const closeResetPasswordDialog = () => {
    setResetPasswordDialogOpen(false);
    setSelectedUsuario(null);
    setGeneratedPassword(null);
    setResetPasswordMode("generate");
    setManualNewPassword("");
  };

  const confirmToggleStatus = async () => {
    if (!selectedUsuario) return;
    await toggleStatus.mutateAsync({
      user_id: selectedUsuario.id,
      ativo: !selectedUsuario.ativo,
      motivo: motivoDesativacao || undefined,
    });
    setToggleStatusDialogOpen(false);
    setSelectedUsuario(null);
    setMotivoDesativacao("");
  };

  const handlePromover = async (usuario: Usuario, novoRole: AppRole) => {
    await promover.mutateAsync({ userId: usuario.id, novoRole });
  };

  const handleEnablePortalEscola = async (usuario: Usuario) => {
    if (!usuario.roles.includes("school_coord")) {
      await promover.mutateAsync({ userId: usuario.id, novoRole: "school_coord" });
    }

    setSelectedUsuario({
      ...usuario,
      roles: usuario.roles.includes("school_coord")
        ? usuario.roles
        : [...usuario.roles, "school_coord"],
    });
    setCmeiDialogOpen(true);
  };

  const handleEnableDiretorVagou = async (usuario: Usuario) => {
    if (!usuario.roles.includes("diretor_cmei")) {
      await promover.mutateAsync({ userId: usuario.id, novoRole: "diretor_cmei" });
    }

    setSelectedUsuario({
      ...usuario,
      roles: usuario.roles.includes("diretor_cmei") ? usuario.roles : [...usuario.roles, "diretor_cmei"],
    });
    setCmeiDialogOpen(true);
  };

  const handleExport = async (formato: 'pdf' | 'excel') => {
    setIsExporting(true);
    try {
      const filtros = {
        role: filtroRole === "todos" ? undefined : filtroRole,
        status: filtroStatus,
        busca: busca || undefined,
      };

      if (formato === 'pdf') {
        await gerarRelatorioUsuariosPDF(filtros);
        toast.success("Relatório PDF gerado com sucesso!");
      } else {
        await gerarRelatorioUsuariosExcel(filtros);
        toast.success("Relatório Excel gerado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsExporting(false);
    }
  };

  // Filtrar por status
  // Base: apenas usuários com vínculo ao VAGOU (módulos vazios = legado VAGOU)
  const vagouUsuarios = (usuarios || []).filter((u) => {
    const mods = u.modules || [];
    return mods.length === 0 || mods.includes("vagou");
  });

  const filteredUsuarios = vagouUsuarios.filter((u) => {
    if (filtroStatus === "ativos") return u.ativo;
    if (filtroStatus === "inativos") return !u.ativo;
    return true;
  });

  const totalAtivos = vagouUsuarios.filter((u) => u.ativo).length;
  const totalInativos = vagouUsuarios.filter((u) => !u.ativo).length;


  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          leading={<Users className="h-10 w-10 text-primary" />}
          title="Gestão de Usuários"
          description="Gerencie usuários, papéis e permissões do sistema"
          actions={(
            <>
              {canExport ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isExporting}>
                      <Download className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">{isExporting ? "Exportando..." : "Exportar"}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Formato de Exportação</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport("pdf")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("excel")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Exportar Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Atualizado às{" "}
                {new Date(lastUpdatedAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Atualizar</span>
              </Button>
              {canCreate ? (
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 md:mr-2" />
                  <span className="hidden sm:inline">Novo Usuário</span>
                </Button>
              ) : null}
            </>
          )}
        />

        <Tabs defaultValue="usuarios" className="space-y-4 md:space-y-6">
          <TabsList className="bg-muted/50 w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="usuarios" className="data-[state=active]:bg-background gap-1 md:gap-2 text-xs md:text-sm">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="permissoes" className="data-[state=active]:bg-background gap-1 md:gap-2 text-xs md:text-sm">
              <Key className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Permissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-4 md:space-y-6 mt-0">
            {/* Filtros */}
            <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou CPF..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={filtroRole}
                onValueChange={(value) => setFiltroRole(value as AppRole | "todos")}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os papéis</SelectItem>
                  <SelectItem value="responsavel">Responsáveis</SelectItem>
                  <SelectItem value="gestor">Gestores</SelectItem>
                  <SelectItem value="diretor_cmei">Diretor</SelectItem>
                  
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="superadmin">Super Admins</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filtroStatus}
                onValueChange={(value) => setFiltroStatus(value as "todos" | "ativos" | "inativos")}
              >
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos ({totalAtivos})</SelectItem>
                  <SelectItem value="inativos">Inativos ({totalInativos})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-primary/5 border-primary/20" onClick={() => setFiltroRole("todos")}>
            <CardContent className="p-3 md:pt-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Total VAGOU</p>
                  <p className="text-xl md:text-2xl font-bold">{vagouUsuarios.length}</p>
                </div>
                <Badge className="bg-primary/20 text-primary">T</Badge>
              </div>
            </CardContent>
          </Card>
          {["responsavel", "gestor", "diretor_cmei", "admin", "superadmin"].map((role) => {
            const count = vagouUsuarios.filter((u) => u.roles.includes(role as AppRole)).length;
            return (
              <Card key={role} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroRole(role as AppRole)}>
                <CardContent className="p-3 md:pt-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{roleLabels[role as AppRole]}</p>
                      <p className="text-xl md:text-2xl font-bold">{count}</p>
                    </div>
                    <Badge className={roleColors[role as AppRole]}>
                      {role === "responsavel"
                        ? "R"
                        : role === "diretor_cmei"
                          ? "D"
                          : role[0].toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários ({filteredUsuarios.length})</CardTitle>
            <CardDescription>
              Lista de todos os usuários cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Papéis</TableHead>
                    <TableHead>Módulos</TableHead>
                    <TableHead>Portal / Unidade</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsuarios.map((usuario) => (
                      <TableRow key={usuario.id} className={!usuario.ativo ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={usuario.avatar_url || undefined} />
                              <AvatarFallback className={`${usuario.ativo ? "bg-primary" : "bg-muted"} text-primary-foreground`}>
                                {getInitials(usuario.nome_completo, usuario.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {usuario.nome_completo || "Nome não informado"}
                              </p>
                              <p className="text-sm text-muted-foreground">{usuario.email}</p>
                              {usuario.cpf && (
                                <p className="text-xs text-muted-foreground">CPF: {usuario.cpf}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {usuario.ativo ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <Ban className="h-3 w-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {usuario.roles.map((role) => (
                              <Badge key={role} className={roleColors[role]} variant="secondary">
                                {roleLabels[role]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {usuario.modules.length === 0 ? (
                              <span className="text-sm text-muted-foreground">Não definido</span>
                            ) : (
                              usuario.modules.map((m) => (
                                <Badge key={m} variant="outline" className="text-xs">
                                  {m === "vagou" ? "VAGOU" : m === "sam" ? "SAM" : "SONDAR"}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {usuario.roles.includes("diretor_cmei") ? (
                            <div className="flex flex-wrap gap-1">
                              {usuario.cmeis_vinculados?.map((cmei) => (
                                <Badge key={cmei.id} variant="outline" className="text-xs">
                                  <School className="h-3 w-3 mr-1" />
                                  {cmei.nome}
                                </Badge>
                              ))}
                              {(!usuario.cmeis_vinculados || usuario.cmeis_vinculados.length === 0) && (
                                <span className="text-sm text-muted-foreground">Nenhum</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(usuario.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleEditUser(usuario)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar Dados
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleEditModules(usuario)}>
                                  <Layers className="h-4 w-4 mr-2" />
                                  Acesso aos Módulos
                                </DropdownMenuItem>
                              )}
                              {canResetPassword && (
                                <DropdownMenuItem onClick={() => handleResetPassword(usuario)}>
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Resetar Senha
                                </DropdownMenuItem>
                              )}
                              {canDesativar && usuario.id !== user?.id && (
                                <>
                                  <DropdownMenuItem onClick={() => handleToggleStatus(usuario)}>
                                    {usuario.ativo ? (
                                      <>
                                        <Ban className="h-4 w-4 mr-2" />
                                        Desativar Usuário
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Ativar Usuário
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUsuario(usuario);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir Usuário
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(canEdit || canDesativar) && <DropdownMenuSeparator />}
                              <DropdownMenuItem onClick={() => handleViewHistory(usuario)}>
                                <History className="h-4 w-4 mr-2" />
                                Ver Histórico
                              </DropdownMenuItem>
                              {canManageRoles && (
                                <DropdownMenuItem onClick={() => handleEditRoles(usuario)}>
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Gerenciar Papéis
                                </DropdownMenuItem>
                              )}
                              {usuario.roles.includes("diretor_cmei") && canManageRoles && (
                                <DropdownMenuItem onClick={() => handleEditCmeis(usuario)}>
                                  <School className="h-4 w-4 mr-2" />
                                  Vincular Unidade (Diretor VAGOU)
                                </DropdownMenuItem>
                              )}
                              {usuario.roles.includes("school_coord") && canManageRoles && (
                                <DropdownMenuItem onClick={() => handleEditCmeis(usuario)}>
                                  <School className="h-4 w-4 mr-2" />
                                  Vincular Instituição (Portal da Escola)
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {!usuario.roles.includes("gestor") &&
                                !usuario.roles.includes("admin") &&
                                !usuario.roles.includes("superadmin") && (
                                  <DropdownMenuItem
                                    onClick={() => handlePromover(usuario, "gestor")}
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Promover a Gestor
                                  </DropdownMenuItem>
                                )}
                              {!usuario.roles.includes("diretor_cmei") && (
                                <DropdownMenuItem
                                  onClick={() => handleEnableDiretorVagou(usuario)}
                                >
                                  <School className="h-4 w-4 mr-2" />
                                  Definir como Diretor
                                </DropdownMenuItem>
                              )}
                              {!usuario.roles.includes("school_coord") && (
                                <DropdownMenuItem onClick={() => handleEnablePortalEscola(usuario)}>
                                  <School className="h-4 w-4 mr-2" />
                                  Liberar Portal da Escola
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="permissoes" className="mt-0">
            <PermissoesTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUsuario?.nome_completo}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. Todos os dados associados a este usuário serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedUsuario) {
                  deleteUser.mutate(selectedUsuario.id);
                  setDeleteDialogOpen(false);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserRoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        usuario={selectedUsuario}
      />
      <DiretorCmeiDialog
        open={cmeiDialogOpen}
        onOpenChange={setCmeiDialogOpen}
        usuario={selectedUsuario}
      />
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        usuario={selectedUsuario}
      />
      <UserModulesDialog
        open={modulesDialogOpen}
        onOpenChange={setModulesDialogOpen}
        usuario={selectedUsuario}
      />
      <UserHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        usuario={selectedUsuario}
      />

      {/* Reset Password Confirmation Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={(open) => !open && closeResetPasswordDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              {generatedPassword ? (
                <>
                  Nova senha forte gerada para <strong>{selectedUsuario?.email}</strong>.
                  Compartilhe essa senha por um canal seguro.
                </>
              ) : (
                <>
                  Escolha se deseja gerar uma senha forte automaticamente ou definir uma nova senha manualmente para <strong>{selectedUsuario?.email}</strong>.
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
              <Button type="button" variant="outline" onClick={copyGeneratedPassword}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Senha
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <RadioGroup
                value={resetPasswordMode}
                onValueChange={(value) => setResetPasswordMode(value as "generate" | "manual")}
              >
                <div className="flex items-start space-x-3 rounded-md border p-3">
                  <RadioGroupItem value="generate" id="reset-generate" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="reset-generate">Gerar senha forte</Label>
                    <p className="text-sm text-muted-foreground">
                      O sistema cria uma senha aleatória forte e mostra para copiar.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-md border p-3">
                  <RadioGroupItem value="manual" id="reset-manual" className="mt-1" />
                  <div className="space-y-1 w-full">
                    <Label htmlFor="reset-manual">Definir senha manualmente</Label>
                    <p className="text-sm text-muted-foreground">
                      Você escolhe a nova senha e o usuário passa a usar exatamente essa.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {resetPasswordMode === "manual" ? (
                <div className="space-y-2">
                  <Label htmlFor="manual-new-password">Nova senha</Label>
                  <PasswordInput
                    id="manual-new-password"
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
              <Button onClick={closeResetPasswordDialog}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeResetPasswordDialog}>
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

      {/* Toggle Status Dialog */}
      <Dialog open={toggleStatusDialogOpen} onOpenChange={setToggleStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUsuario?.ativo ? (
                <>
                  <Ban className="h-5 w-5 text-destructive" />
                  Desativar Usuário
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Ativar Usuário
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedUsuario?.ativo ? (
                <>
                  O usuário <strong>{selectedUsuario?.nome_completo || selectedUsuario?.email}</strong> será desativado e não poderá mais acessar o sistema.
                </>
              ) : (
                <>
                  O usuário <strong>{selectedUsuario?.nome_completo || selectedUsuario?.email}</strong> será reativado e poderá acessar o sistema novamente.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedUsuario?.ativo && (
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Textarea
                id="motivo"
                placeholder="Informe o motivo da desativação..."
                value={motivoDesativacao}
                onChange={(e) => setMotivoDesativacao(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={selectedUsuario?.ativo ? "destructive" : "default"}
              onClick={confirmToggleStatus}
              disabled={toggleStatus.isPending}
            >
              {toggleStatus.isPending
                ? "Processando..."
                : selectedUsuario?.ativo
                ? "Desativar"
                : "Ativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
