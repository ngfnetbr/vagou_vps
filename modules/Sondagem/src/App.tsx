import { useEffect } from "react";
import { Toaster } from "@ui/toaster";
import { Toaster as Sonner } from "@ui/sonner";
import { TooltipProvider } from "@ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@root/contexts/AuthContext";
import { useAuth } from "@root/contexts/AuthContext";
import { EmbeddedAppPage } from "@root/components/common/EmbeddedAppPage";
import { ProtectedRoute } from "@sondagem/components/ProtectedRoute";
import { RoleRoute } from "@sondagem/components/RoleRoute";
import { ErrorBoundary } from "@sondagem/components/ErrorBoundary";
import { AppLayout } from "@sondagem/components/layout/AppLayout";
import ModuleHome from "@sondagem/pages/ModuleHome";
import Dashboard from "@sondagem/pages/Dashboard";
import AplicarSondagem from "@sondagem/pages/AplicarSondagem";
import FichaAluno from "@sondagem/pages/FichaAluno";
import SolicitarSondagem from "@sondagem/pages/SolicitarSondagem";
import Relatorios from "@sondagem/pages/Relatorios";
import Metas from "@sondagem/pages/Metas";
import CadastroPeriodos from "@sondagem/pages/CadastroPeriodos";
import CadastroAlunos from "@sondagem/pages/CadastroAlunos";
import CadastrosInstituicoesConsulta from "@sondagem/pages/CadastrosInstituicoesConsulta";
import CadastrosTurmasConsulta from "@sondagem/pages/CadastrosTurmasConsulta";
import CadastroCoordenadores from "@sondagem/pages/CadastroCoordenadores";
import Login from "@sondagem/pages/Login";
import EsqueciSenha from "@sondagem/pages/EsqueciSenha";
import ResetPassword from "@sondagem/pages/ResetPassword";
import Perfil from "@sondagem/pages/Perfil";
import NotFound from "@sondagem/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);
  return <>{children}</>;
}

function CadastrosPrincipalGate({ to }: { to: string }) {
  const { hasRole } = useAuth()
  const canAccessPrincipalAdmin = hasRole("admin") || hasRole("superadmin") || hasRole("gestor")

  if (canAccessPrincipalAdmin) return <EmbeddedAppPage path={to} />

  return (
    <div className="mx-auto max-w-xl rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">
      <div className="text-base font-semibold text-foreground">Cadastros do Sistema Principal</div>
      <div className="mt-2">
        Você tem acesso ao módulo Sondagem, mas não tem acesso ao painel administrativo do Sistema Principal.
        Os cadastros de Alunos, Turmas e Instituições são gerenciados no Sistema Principal.
      </div>
      <div className="mt-2">
        Solicite ao administrador um perfil com acesso a <span className="font-medium text-foreground">/admin</span> para gerenciar esses cadastros.
      </div>
    </div>
  )
}

export function SondagemModuleRoutes() {
  return (
    <>
      <Route path="/modulo/sondar/login" element={<Login />} />
      <Route path="/modulo/sondar/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/modulo/sondar/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/modulo/sondar" element={<Navigate to="/modulo/sondar/dashboard" replace />} />
          <Route path="/modulo/sondar/dashboard" element={<Dashboard />} />
          <Route path="/modulo/sondar/perfil" element={<Perfil />} />
          <Route path="/modulo/sondar/aplicar" element={<AplicarSondagem />} />
          <Route path="/modulo/sondar/relatorios" element={<Relatorios />} />
          <Route path="/modulo/sondar/aluno/:id" element={<FichaAluno />} />
          <Route path="/modulo/sondar/cadastros/alunos" element={<CadastroAlunos />} />
          <Route path="/modulo/sondar/cadastros/turmas" element={<CadastrosTurmasConsulta />} />
          <Route path="/modulo/sondar/cadastros/cmeis" element={<CadastrosInstituicoesConsulta />} />
          <Route path="/modulo/sondar/configuracoes" element={<Navigate to="/modulo/sondar/dashboard" replace />} />

          <Route element={<RoleRoute allowedRoles={["admin", "equipe_pedagogica"]} />}>
            <Route path="/modulo/sondar/cadastros/periodos" element={<CadastroPeriodos />} />
            <Route path="/modulo/sondar/cadastros/coordenadores" element={<CadastroCoordenadores />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={["admin", "equipe_pedagogica"]} />}>
            <Route path="/modulo/sondar/solicitar" element={<SolicitarSondagem />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={["admin", "equipe_pedagogica"]} />}>
            <Route path="/modulo/sondar/metas" element={<Metas />} />
          </Route>
        </Route>
      </Route>

      <Route path="/modulo/sondar/*" element={<NotFound />} />
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <GlobalErrorHandler>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <>{SondagemModuleRoutes()}</>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </GlobalErrorHandler>
  </ErrorBoundary>
);

export default App;
