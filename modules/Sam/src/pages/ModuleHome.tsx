// @ts-nocheck
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ui/card";
import { Calendar, ClipboardList, GraduationCap, BarChart3, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuth } from "@root/contexts/AuthContext";

const actions = [
  {
    title: "Dashboard",
    description: "Acompanhe indicadores e o resumo do atendimento multidisciplinar.",
    to: "/modulo/sam/dashboard",
    icon: BarChart3,
    roles: ["admin", "professional"],
  },
  {
    title: "Agenda",
    description: "Gerencie compromissos, horarios e atendimentos do modulo.",
    to: "/modulo/sam/agenda",
    icon: Calendar,
    roles: ["admin", "professional"],
  },
  {
    title: "Atendimentos",
    description: "Acesse registros, evolucoes e acompanhamentos em andamento.",
    to: "/modulo/sam/atendimentos",
    icon: ClipboardList,
    roles: ["admin", "professional"],
  },
  {
    title: "Alunos",
    description: "Consulte o cadastro e o prontuario dos alunos acompanhados.",
    to: "/modulo/sam/alunos",
    icon: GraduationCap,
    roles: ["admin", "professional"],
  },
  {
    title: "Queixas Escolares",
    description: "Abra e acompanhe os encaminhamentos vindos das escolas.",
    to: "/modulo/sam/queixas",
    icon: AlertTriangle,
    roles: ["admin", "professional", "school_coord"],
  },
];

export default function ModuleHome() {
  const { profile } = useAuth();
  const userRole = profile?.role || "professional";
  const visibleActions = actions.filter((action) => action.roles.includes(userRole));

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("vagou_preferred_module", "sam");
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Modulo independente</p>
        <h1 className="text-3xl font-bold tracking-tight">SAM</h1>
        <p className="text-muted-foreground max-w-2xl">
          Sistema de Atendimento Multidisciplinar com navegacao, menus e fluxos proprios.
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
