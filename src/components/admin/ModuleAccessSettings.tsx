import { useMemo, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Settings2, ToggleLeft } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo, type BrandLogoName } from "@/components/common/BrandLogo";
import { usePermissoes, useRolePermissoes, useUpdateRolePermissoes } from "@/hooks/api/permissoes-hooks";
import { useConfiguracoesSistema, useUpdateConfiguracoes } from "@/hooks/api/configuracoes-hooks";
import { useAuth } from "@/contexts/AuthContext";
type AppRole = string;

const roles: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "Administrador", description: "Acesso administrativo completo." },
  { value: "gestor", label: "Gestor", description: "Gestão operacional do sistema." },
  { value: "diretor_cmei", label: "Diretor (VAGOU)", description: "Acesso restrito ao VAGOU para a unidade vinculada." },
  { value: "school_coord" as AppRole, label: "Portal da Escola", description: "Acesso restrito ao Portal da Escola (SAM) para a instituicao vinculada." },
  { value: "responsavel", label: "Responsável", description: "Acesso básico do responsável." },
];

const modules: { code: string; title: string; description: string; logo: BrandLogoName }[] = [
  {
    code: "modulos.vagou.acessar",
    title: "VAGOU",
    description: "Libera a entrada no módulo de gestão de vagas (VAGOU).",
    logo: "vagou",
  },
  {
    code: "modulos.sam.acessar",
    title: "SAM",
    description: "Libera a entrada no módulo de acompanhamento multiprofissional.",
    logo: "sam",
  },
  {
    code: "modulos.sondagem.acessar",
    title: "SONDAR",
    description: "Libera a entrada no módulo de sondagem pedagógica.",
    logo: "sondar",
  },
];

export function ModuleAccessSettings() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("superadmin");
  const { data: permissoes = [], isLoading: loadingPermissoes } = usePermissoes();
  const updatePermissoes = useUpdateRolePermissoes();
  const { data: config, isLoading: loadingConfig } = useConfiguracoesSistema();
  const updateConfig = useUpdateConfiguracoes();
  const [savingRole, setSavingRole] = useState<AppRole | null>(null);

  const permissionByCode = useMemo(() => {
    return new Map(permissoes.map((perm) => [perm.codigo, perm]));
  }, [permissoes]);

  const isLoading = loadingPermissoes || loadingConfig;

  const moduleEnabled: Record<BrandLogoName, boolean> = {
    same: true,
    vagou: config?.habilitar_vagou ?? true,
    sam: config?.habilitar_sam ?? true,
    sondar: config?.habilitar_sondagem ?? true,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Spinner className="mr-2 h-5 w-5 animate-spin" />
        Carregando configuração de acesso...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ToggleLeft className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Habilitação dos Módulos</CardTitle>
                  <CardDescription>
                    Liga/desliga os módulos no município. Desabilitado, o acesso fica bloqueado mesmo com permissão.
                  </CardDescription>
                </div>
              </div>
              {updateConfig.isPending && <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { logo: "vagou" as BrandLogoName, key: "habilitar_vagou", label: "VAGOU", desc: "Gestão de vagas em CMEIs.", beta: false },
                { logo: "sam" as BrandLogoName, key: "habilitar_sam", label: "SAM", desc: "Atendimento multiprofissional.", beta: true },
                { logo: "sondar" as BrandLogoName, key: "habilitar_sondagem", label: "SONDAR", desc: "Sondagem pedagógica.", beta: true },
              ].map((item) => {
                const enabled = (config as any)?.[item.key] ?? true;
                return (
                  <div
                    key={item.key}
                    className={`group rounded-xl border p-4 transition-all ${
                      enabled ? "border-primary/30 bg-primary/5" : "bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <BrandLogo
                            name={item.logo}
                            className={`h-8 ${enabled ? "text-primary" : "text-muted-foreground"}`}
                            title={`Logo ${item.label}`}
                        />
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={enabled}
                        disabled={updateConfig.isPending}
                        onCheckedChange={(checked) => updateConfig.mutate({ [item.key]: checked } as any)}
                      />
                    </div>
                    <Badge
                      variant={enabled ? "secondary" : "outline"}
                      className="mt-3 text-[10px] uppercase tracking-wide"
                    >
                      {enabled ? "Ativo no município" : "Desativado"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-muted/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Acesso aos Módulos por Papel</CardTitle>
              <CardDescription>
                Controle quais papéis podem abrir cada módulo do ecossistema.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {roles.map((role) => (
            <RoleModuleAccessCard
              key={role.value}
              role={role}
              modules={modules}
              moduleEnabled={moduleEnabled}
              permissionByCode={permissionByCode}
              updatePermissoes={updatePermissoes}
              savingRole={savingRole}
              setSavingRole={setSavingRole}
            />
          ))}

          <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Usuários com <span className="font-medium text-foreground">superadmin</span> têm acesso total,
              independentemente dos toggles acima.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/modulo/vagou/admin/usuarios">
                <Settings2 className="mr-2 h-4 w-4" />
                Gerenciar papéis
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleModuleAccessCard({
  role,
  modules,
  moduleEnabled,
  permissionByCode,
  updatePermissoes,
  savingRole,
  setSavingRole,
}: {
  role: { value: AppRole; label: string; description: string };
  modules: { code: string; title: string; description: string; logo: BrandLogoName }[];
  moduleEnabled: Record<BrandLogoName, boolean>;
  permissionByCode: Map<string, { id: string }>;
  updatePermissoes: ReturnType<typeof useUpdateRolePermissoes>;
  savingRole: AppRole | null;
  setSavingRole: (role: AppRole | null) => void;
}) {
  const rolePermissoes = useRolePermissoes(role.value);
  const selectedIds = new Set((rolePermissoes.data || []).map((item) => item.permissao_id));

  const handleToggle = async (permissionCode: string, checked: boolean) => {
    const permissao = permissionByCode.get(permissionCode);
    if (!permissao) {
      toast.error(`A permissão ${permissionCode} ainda não está cadastrada no banco.`);
      return;
    }

    const currentIds = new Set(selectedIds);
    if (checked) currentIds.add(permissao.id);
    else currentIds.delete(permissao.id);

    setSavingRole(role.value);
    try {
      await updatePermissoes.mutateAsync({ role: role.value, permissaoIds: [...currentIds] });
    } finally {
      setSavingRole(null);
    }
  };

  if (rolePermissoes.isLoading) {
    return (
      <div className="rounded-xl border p-4">
        <div className="flex items-center text-muted-foreground">
          <Spinner className="mr-2 h-4 w-4 animate-spin" />
          Carregando permissões de {role.label}...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card/60 p-4 space-y-3 transition-all hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{role.label}</h4>
            <Badge variant="outline" className="text-[10px]">{role.value}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{role.description}</p>
        </div>
        {savingRole === role.value && <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {modules.map((moduleItem) => {
          const permissao = permissionByCode.get(moduleItem.code);
          const checked = permissao ? selectedIds.has(permissao.id) : false;
          const enabled = moduleEnabled[moduleItem.logo];

          return (
            <div
              key={moduleItem.code}
              className={`rounded-lg border p-3 transition-all ${
                checked && enabled ? "border-primary/30 bg-primary/5" : "bg-muted/20"
              } ${!enabled ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <BrandLogo
                    name={moduleItem.logo}
                    className={`h-6 ${checked && enabled ? "text-primary" : "text-muted-foreground"}`}
                    title={`Logo ${moduleItem.title}`}
                  />
                  <p className="text-xs text-muted-foreground">{moduleItem.description}</p>
                </div>
                <Switch
                  checked={checked}
                  disabled={!permissao || !enabled || updatePermissoes.isPending}
                  onCheckedChange={(nextChecked) => handleToggle(moduleItem.code, nextChecked)}
                />
              </div>
              {!enabled && permissao && (
                <p className="mt-2 text-[11px] text-muted-foreground">Módulo desabilitado no município.</p>
              )}
              {!permissao && (
                <p className="mt-2 text-xs text-destructive">
                  Permissão não encontrada. Aplique a migration de permissões dos módulos.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
