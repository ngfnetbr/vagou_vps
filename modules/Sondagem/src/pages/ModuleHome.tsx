import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card";
import { BarChart3, ClipboardList, FileEdit, Target, ArrowRight, FolderOpen, Users } from "lucide-react";
import { useAuth } from "@root/contexts/AuthContext";
import { useCanAccess } from "@root/components/admin/PermissionGate";

const actions = [
  {
    title: "Dashboard",
    description: "Visualize indicadores de aprendizagem e acompanhamento geral.",
    to: "/modulo/sondar/dashboard",
    icon: BarChart3,
    roles: ["admin", "equipe_pedagogica", "coordenador", "responsavel"],
  },
  {
    title: "Alunos",
    description: "Consulte os alunos disponiveis para a sua unidade e acompanhe as fichas.",
    to: "/modulo/sondar/cadastros/alunos",
    icon: Users,
    roles: ["admin", "equipe_pedagogica", "coordenador"],
  },
  {
    title: "Solicitar",
    description: "Crie e acompanhe solicitacoes de sondagem pedagogica.",
    to: "/modulo/sondar/solicitar",
    icon: FileEdit,
    roles: ["admin", "equipe_pedagogica", "coordenador"],
    permission: "solicitar",
  },
  {
    title: "Lancar Sondagem",
    description: "Registre aplicacoes, niveis e resultados por aluno.",
    to: "/modulo/sondar/aplicar",
    icon: ClipboardList,
    roles: ["admin", "equipe_pedagogica", "coordenador", "responsavel"],
    permission: "aplicar",
  },
  {
    title: "Metas",
    description: "Consulte metas e acompanhe o progresso pedagogico.",
    to: "/modulo/sondar/metas",
    icon: Target,
    roles: ["admin", "equipe_pedagogica"],
  },
  {
    title: "Cadastros",
    description: "Acesse alunos, turmas e instituicoes vinculadas ao modulo.",
    to: "/modulo/sondar/cadastros/alunos",
    icon: FolderOpen,
    roles: ["admin", "equipe_pedagogica"],
  },
];

export default function ModuleHome() {
  const { role } = useAuth();
  const canViewAplicar = useCanAccess(["modulos.sondagem.acessar", "sondagem.aplicar.visualizar"]);
  const canViewSolicitar = useCanAccess(["modulos.sondagem.acessar", "sondagem.solicitacoes.visualizar"]);
  const visibleActions = actions.filter((action) => {
    if (role && !action.roles.includes(role)) return false;
    if (action.permission === "aplicar") return canViewAplicar;
    if (action.permission === "solicitar") return canViewSolicitar;
    return true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("vagou_preferred_module", "sondagem");
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Modulo independente</p>
        <h1 className="text-3xl font-bold tracking-tight">Sondagem</h1>
        <p className="text-muted-foreground max-w-2xl">
          Area dedicada a avaliacao pedagogica, com menus e rotinas proprias dentro do sistema.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleActions.map((action) => (
          <Card key={action.title} className="border-border/60">
            <CardHeader className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={action.to}>
                  Abrir
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
