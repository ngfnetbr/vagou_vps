import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, Lock, Unlock, Layers } from "lucide-react";
import { BrandLogo, type BrandLogoName } from "@/components/common/BrandLogo";
import { usePermissoesPorModulo, useRolePermissoes, useUpdateRolePermissoes } from "@/hooks/api/permissoes-hooks";
import { toast } from "sonner";
type AppRole = string;

type RoleModulo = "geral" | "vagou" | "sam" | "sondar";

const roles: { value: AppRole; label: string; description: string; modulo: RoleModulo }[] = [
  { value: "superadmin", label: "Super Admin", description: "Acesso total ao sistema", modulo: "geral" },
  { value: "admin", label: "Administrador", description: "Gerenciamento completo", modulo: "geral" },
  { value: "gestor", label: "Gestor", description: "Operações de gestão", modulo: "geral" },
  { value: "diretor_cmei", label: "Diretor (VAGOU)", description: "Acesso ao VAGOU da unidade vinculada", modulo: "vagou" },
  { value: "responsavel", label: "Responsável", description: "Acesso básico", modulo: "vagou" },
  { value: "school_coord" as AppRole, label: "Portal da Escola", description: "Acesso ao Portal da Escola (SAM) da instituicao vinculada", modulo: "sam" },
];

const roleGroups: { modulo: RoleModulo; label: string; logo: BrandLogoName | null }[] = [
  { modulo: "geral", label: "Geral", logo: null },
  { modulo: "vagou", label: "VAGOU", logo: "vagou" },
  { modulo: "sam", label: "SAM", logo: "sam" },
  { modulo: "sondar", label: "SONDAR", logo: "sondar" },
];

// Mapeia o nome do módulo (texto vindo do banco) para o logo oficial correspondente.
function getModuleLogo(modulo: string): BrandLogoName | null {
  const key = modulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (key.includes("vagou")) return "vagou";
  if (key.includes("sam")) return "sam";
  if (key.includes("sondar") || key.includes("sondagem")) return "sondar";
  return null;
}

export default function PermissoesTab() {
  const [selectedRole, setSelectedRole] = useState<AppRole>("gestor");
  const [selectedPermissoes, setSelectedPermissoes] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const { data: permissoesPorModulo, isLoading: isLoadingPermissoes } = usePermissoesPorModulo();
  const { data: rolePermissoes, isLoading: isLoadingRole } = useRolePermissoes(selectedRole);
  const updatePermissoes = useUpdateRolePermissoes();

  const handleRoleChange = (role: string) => {
    setSelectedRole(role as AppRole);
    setHasChanges(false);
    setSelectedPermissoes(new Set());
  };

  useEffect(() => {
    if (!rolePermissoes) return;
    if (hasChanges) return;
    setSelectedPermissoes(new Set(rolePermissoes.map((rp) => rp.permissao_id)));
  }, [rolePermissoes, hasChanges]);

  const totalPermissoes = useMemo(
    () => Object.values(permissoesPorModulo || {}).reduce((acc, list) => acc + list.length, 0),
    [permissoesPorModulo]
  );

  const handleTogglePermissao = (permissaoId: string) => {
    if (selectedRole === "superadmin") {
      toast.error("Não é possível alterar permissões do Super Admin");
      return;
    }

    const newSelected = new Set(selectedPermissoes);
    if (newSelected.has(permissaoId)) {
      newSelected.delete(permissaoId);
    } else {
      newSelected.add(permissaoId);
    }
    setSelectedPermissoes(newSelected);
    setHasChanges(true);
  };

  const handleSelectAll = (modulo: string) => {
    if (selectedRole === "superadmin") return;

    const moduloPermissoes = permissoesPorModulo?.[modulo] || [];
    const allSelected = moduloPermissoes.every((p) => selectedPermissoes.has(p.id));

    const newSelected = new Set(selectedPermissoes);
    moduloPermissoes.forEach((p) => {
      if (allSelected) {
        newSelected.delete(p.id);
      } else {
        newSelected.add(p.id);
      }
    });
    setSelectedPermissoes(newSelected);
    setHasChanges(true);
  };

  const handleSave = () => {
    updatePermissoes.mutate(
      { role: selectedRole, permissaoIds: [...selectedPermissoes] },
      { onSuccess: () => setHasChanges(false) }
    );
  };

  const isLoading = isLoadingPermissoes || isLoadingRole;
  const activeRole = roles.find((r) => r.value === selectedRole);
  const selectedCount = selectedRole === "superadmin" ? totalPermissoes : selectedPermissoes.size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Permissões por Papel</h3>
          <p className="text-sm text-muted-foreground">
            Configure o que cada papel pode fazer em cada módulo do ecossistema
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={updatePermissoes.isPending} className="animate-fade-up">
            {updatePermissoes.isPending ? (
              <Spinner className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        )}
      </div>

      <Tabs value={selectedRole} onValueChange={handleRoleChange}>
        <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
          {roleGroups.map((group) => {
            const groupRoles = roles.filter((r) => r.modulo === group.modulo);
            if (groupRoles.length === 0) return null;
            return (
              <div key={group.modulo} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  {group.logo ? (
                    <BrandLogo name={group.logo} className="h-4 text-primary" title={group.label} />
                  ) : (
                    <Layers className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </span>
                </div>
                <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                  {groupRoles.map((role) => (
                    <TabsTrigger
                      key={role.value}
                      value={role.value}
                      className="gap-2 border bg-background/60 transition-all data-[state=active]:border-primary/40 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      {role.value === "superadmin" ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Shield className="h-3.5 w-3.5" />
                      )}
                      {role.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            );
          })}
        </div>


        {roles.map((role) => (
          <TabsContent key={role.value} value={role.value} className="space-y-4 mt-6">
            <Card className="overflow-hidden border-0 shadow-md">
              <CardHeader className="border-b bg-gradient-to-r from-muted/40 to-transparent">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        role.value === "superadmin"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {role.value === "superadmin" ? (
                        <Lock className="h-5 w-5" />
                      ) : (
                        <Unlock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <CardTitle>{role.label}</CardTitle>
                      <CardDescription>{role.description}</CardDescription>
                    </div>
                  </div>
                  {role.value === selectedRole && (
                    <Badge variant={role.value === "superadmin" ? "destructive" : "secondary"}>
                      {role.value === "superadmin"
                        ? "Todas as permissões"
                        : `${selectedCount} de ${totalPermissoes} permissões`}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {permissoesPorModulo &&
                      Object.entries(permissoesPorModulo).map(([modulo, permissoes]) => {
                        const allSelected = permissoes.every((p) => selectedPermissoes.has(p.id));
                        const someSelected = permissoes.some((p) => selectedPermissoes.has(p.id));
                        const selectedInModule =
                          selectedRole === "superadmin"
                            ? permissoes.length
                            : permissoes.filter((p) => selectedPermissoes.has(p.id)).length;
                        const logo = getModuleLogo(modulo);

                        return (
                          <Card
                            key={modulo}
                            className="flex flex-col border bg-card/60 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                          >
                            <CardHeader className="gap-0 space-y-0 border-b pb-3 pt-4 px-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  {logo ? (
                                    <BrandLogo name={logo} className="h-5 shrink-0 text-primary" title={modulo} />
                                  ) : (
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                      <Layers className="h-4 w-4" />
                                    </span>
                                  )}
                                  <CardTitle className="truncate text-sm font-semibold">{modulo}</CardTitle>
                                </div>
                                <Checkbox
                                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                  onCheckedChange={() => handleSelectAll(modulo)}
                                  disabled={selectedRole === "superadmin"}
                                />
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {selectedInModule} de {permissoes.length} ativas
                              </p>
                            </CardHeader>
                            <CardContent className="flex-1 px-2 pb-3 pt-2">
                              <div className="space-y-1">
                                {permissoes.map((perm) => {
                                  const checked = selectedRole === "superadmin" || selectedPermissoes.has(perm.id);
                                  return (
                                    <label
                                      key={perm.id}
                                      className={`flex items-start gap-2.5 rounded-lg p-2 transition-colors ${
                                        selectedRole === "superadmin"
                                          ? "cursor-default"
                                          : "cursor-pointer hover:bg-muted/60"
                                      } ${checked ? "bg-primary/5" : ""}`}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => handleTogglePermissao(perm.id)}
                                        disabled={selectedRole === "superadmin"}
                                        className="mt-0.5"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-none">{perm.nome}</p>
                                        {perm.descricao && (
                                          <p className="mt-1 text-xs leading-snug text-muted-foreground">
                                            {perm.descricao}
                                          </p>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
