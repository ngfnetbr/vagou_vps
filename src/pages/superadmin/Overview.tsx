import { Link } from "react-router-dom";
import SuperAdminLayout from "@/components/superadmin/SuperAdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUsuarios } from "@/hooks/api/usuarios-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { useOnlineUsers } from "@/hooks/use-presence";
import { ECOSYSTEM_MODULES } from "@/config/ecosystem-modules";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Users, ShieldCheck, KeyRound, Layers, Building2, ArrowRight, CheckCircle2, XCircle, Wifi, Activity } from "lucide-react";

export default function SuperAdminOverview() {
  const { data: usuarios = [], isLoading } = useUsuarios();
  const { data: config } = useConfiguracoesSistema();
  const onlineSnapshot = useOnlineUsers();
  const onlineCount = onlineSnapshot.count;

  const total = usuarios.length;
  const superadmins = usuarios.filter((u) => u.roles.includes("superadmin")).length;
  const staff = usuarios.filter((u) =>
    u.roles.some((r) => ["admin", "gestor", "superadmin"].includes(r))
  ).length;

  const moduleStatus: Record<string, boolean> = {
    vagou: true,
    sondar: config?.habilitar_sondagem ?? true,
    sam: config?.habilitar_sam ?? true,
  };

  const stats = [
    { label: "Usuários", value: isLoading ? "—" : total, icon: Users, to: "/superadmin/usuarios" },
    { label: "Online agora", value: onlineCount, icon: Wifi, to: "/superadmin/usuarios" },
    { label: "Super admins", value: isLoading ? "—" : superadmins, icon: ShieldCheck, to: "/superadmin/usuarios" },
    { label: "Equipe administrativa", value: isLoading ? "—" : staff, icon: KeyRound, to: "/superadmin/permissoes" },
  ];

  const quickLinks = [
    { title: "Gerenciar usuários", desc: "Criar contas, atribuir papéis e conceder acesso a módulos.", to: "/superadmin/usuarios", icon: Users },
    { title: "Sessões & atividade", desc: "Veja quem está online, o último acesso e acesse qualquer conta.", to: "/superadmin/usuarios", icon: Activity },
    { title: "Permissões por papel", desc: "Defina o que cada papel pode fazer em cada módulo.", to: "/superadmin/permissoes", icon: KeyRound },
    { title: "Acesso aos Módulos", desc: "Libere VAGOU, SONDAR e SAM por papel e por usuário.", to: "/superadmin/modulos", icon: Layers },
    { title: "Município", desc: "Identidade do município e habilitação dos módulos.", to: "/superadmin/municipio", icon: Building2 },
  ];



  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold">Visão geral do ecossistema</h1>
          <p className="text-muted-foreground">
            {config?.nome_municipio || "Município"} · gerencie tudo e conceda acessos a partir daqui.
          </p>
        </div>

        <div className="stagger-in grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="card-interactive overflow-hidden">
              <Link to={s.to}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-3xl font-bold">{s.value}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>



        <Card className="animate-fade-up">
          <CardHeader>
            <CardTitle>Status dos módulos</CardTitle>
            <CardDescription>Habilitação atual do município.</CardDescription>
          </CardHeader>
          <CardContent className="stagger-in grid gap-3 sm:grid-cols-3">
            {ECOSYSTEM_MODULES.map((m) => {
              const enabled = moduleStatus[m.id];
              return (
                <div key={m.id} className="card-interactive flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 items-center justify-center rounded-lg bg-muted px-4">
                      <BrandLogo name={m.logo} className="h-9 text-foreground" title={m.name} />
                    </div>
                    {m.beta && (
                      <Badge variant="info" className="text-[10px] px-1.5 py-0">
                        BETA
                      </Badge>
                    )}
                  </div>
                  {enabled ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <XCircle className="h-3 w-3" /> Inativo
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="stagger-in grid gap-4 sm:grid-cols-2">
          {quickLinks.map((q) => (
            <Card key={q.to} className="card-interactive group">

              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                  <q.icon className="h-5 w-5 text-primary" />

                </div>
                <div className="flex-1">
                  <p className="font-semibold">{q.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{q.desc}</p>
                  <Button asChild variant="link" className="mt-1 h-auto p-0">
                    <Link to={q.to}>
                      Abrir <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>

                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
