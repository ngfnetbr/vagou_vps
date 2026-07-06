import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { School } from "lucide-react";
import { useConfiguracoesSistema } from "@root/hooks/api/configuracoes-hooks";
import { ModuleSwitcher } from "@root/components/common/ModuleSwitcher";
import { AccessibilityButton } from "@root/components/common/AccessibilityButton";
import { HeaderUserMenu } from "@root/components/common/HeaderUserMenu";
import { ModuleMain } from "@root/components/common/ModuleMain";
import type { Crumb } from "@root/components/common/Breadcrumbs";

const SONDAGEM_BASE = "/modulo/sondar";

const pageTitles: Record<string, string> = {
  [SONDAGEM_BASE]: "Inicio",
  [`${SONDAGEM_BASE}/dashboard`]: "Dashboard",
  [`${SONDAGEM_BASE}/solicitar`]: "Solicitar Sondagem",
  [`${SONDAGEM_BASE}/aplicar`]: "Aplicar Sondagem",
  [`${SONDAGEM_BASE}/relatorios`]: "Relatórios",
  [`${SONDAGEM_BASE}/metas`]: "Metas",
  [`${SONDAGEM_BASE}/cadastros/alunos`]: "Cadastro de Alunos",
  [`${SONDAGEM_BASE}/cadastros/turmas`]: "Cadastro de Turmas",
  [`${SONDAGEM_BASE}/cadastros/cmeis`]: "Cadastro de CMEIs / Escolas",
};

const segmentLabels: Record<string, string> = {
  cadastros: "Cadastros",
};

const isDynamic = (s: string) => /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s);

const prettify = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function resolveCrumbs(pathname: string): Crumb[] {
  const base: Crumb = { label: "Sondagem", to: SONDAGEM_BASE };
  if (pathname === SONDAGEM_BASE) return [base];

  const rest = pathname.replace(`${SONDAGEM_BASE}/`, "").split("/").filter(Boolean);
  const crumbs: Crumb[] = [base];

  rest.forEach((seg, i) => {
    const full = `${SONDAGEM_BASE}/${rest.slice(0, i + 1).join("/")}`;
    const isLast = i === rest.length - 1;
    const label = pageTitles[full] || segmentLabels[seg] || (isDynamic(seg) ? "Detalhes" : prettify(seg));
    const linkable = !isLast && !!pageTitles[full] && !isDynamic(seg);
    crumbs.push({ label, to: linkable ? full : undefined });
  });

  return crumbs;
}

export function AppLayout() {
  const location = useLocation();
  const { data: config } = useConfiguracoesSistema();
  const [brasaoError, setBrasaoError] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b bg-card sticky top-0 z-30 shadow-sm">
            <div className="flex items-center justify-between px-3 py-3 md:px-6 md:py-4">
              <div className="flex items-center gap-2 md:gap-4">
                <SidebarTrigger className="-ml-1 md:-ml-2 hidden md:flex" />
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  {config?.brasao_url && !brasaoError ? (
                    <div className="rounded-lg overflow-hidden bg-card border flex items-center justify-center h-8 w-8 md:h-10 md:w-10 shrink-0">
                      <img
                        src={config.brasao_url}
                        alt="Brasão"
                        className="h-full w-full object-contain p-1"
                        onError={() => setBrasaoError(true)}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg bg-secondary flex items-center justify-center h-8 w-8 md:h-10 md:w-10 shrink-0">
                      <School className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 hidden sm:block">
                    <h1 className="font-semibold text-foreground text-sm md:text-base md:text-lg truncate">
                      {config?.nome_secretaria || "Secretaria de Educação"}
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      {config?.nome_municipio || "Município"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <ModuleSwitcher />
                <AccessibilityButton />
                <HeaderUserMenu />
              </div>
            </div>
          </header>
          <ModuleMain
            routeKey={location.pathname}
            breadcrumbs={resolveCrumbs(location.pathname)}
          >
            <Outlet />
          </ModuleMain>
        </div>
      </div>
    </SidebarProvider>
  );
}
