// @ts-nocheck
import { Toaster } from "@ui/toaster";
import { Toaster as Sonner } from "@ui/sonner";
import { TooltipProvider } from "@ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@root/contexts/AuthContext";
import { useAuth } from "@root/contexts/AuthContext";
import { EmbeddedAppPage } from "@root/components/common/EmbeddedAppPage";
import { ProtectedRoute, SchoolProtectedRoute } from "@sam/components/ProtectedRoute";
import DashboardLayout from "@sam/layouts/DashboardLayout";
import SchoolLayout from "@sam/layouts/SchoolLayout";

// Pages
import Login from "@sam/pages/Login";
import LoginEscola from "@sam/pages/LoginEscola";
import Recovery from "@sam/pages/Recovery";
import Dashboard from "@sam/pages/Dashboard";
import ModuleHome from "@sam/pages/ModuleHome";
import Relatorios from "@sam/pages/Relatorios";
import Configuracoes from "@sam/pages/Configuracoes";
import Auditoria from "@sam/pages/Auditoria";
import Especialidades from "@sam/pages/Especialidades";

import CadastrosAlunosConsulta from "@sam/pages/CadastrosAlunosConsulta";
import AlunosSelecionados from "@sam/pages/AlunosSelecionados";
import CadastrosInstituicoesConsulta from "@sam/pages/CadastrosInstituicoesConsulta";
import CadastrosTurmasConsulta from "@sam/pages/CadastrosTurmasConsulta";
import Prontuario from "@sam/pages/Prontuario";
import Agenda from "@sam/pages/Agenda";
import AgendaNovo from "@sam/pages/AgendaNovo";
import Atendimentos from "@sam/pages/Atendimentos";
import AtendimentoNovo from "@sam/pages/AtendimentoNovo";
import AtendimentoDetalhe from "@sam/pages/AtendimentoDetalhe";
import QueixasEscolares from "@sam/pages/QueixasEscolares";
import QueixaNova from "@sam/pages/QueixaNova";
import QueixaDetalhe from "@sam/pages/QueixaDetalhe";
import ProntuarioRelatorio from "@sam/pages/ProntuarioRelatorio";
import EscolaDashboard from "@sam/pages/EscolaDashboard";
import EscolaAlunos from "@sam/pages/EscolaAlunos";
import EscolaAlunoNovo from "@sam/pages/EscolaAlunoNovo";
import EscolaAlunoDetalhe from "@sam/pages/EscolaAlunoDetalhe";
import Perfil from "@sam/pages/Perfil";
import NotFound from "@sam/pages/NotFound";

const queryClient = new QueryClient();

function PrincipalAdminGate({ to, title, message }: { to: string; title: string; message: string }) {
  const { hasRole } = useAuth()
  const canAccessPrincipalAdmin = hasRole("admin") || hasRole("superadmin") || hasRole("gestor")

  if (canAccessPrincipalAdmin) return <EmbeddedAppPage path={to} />

  return (
    <div className="mx-auto max-w-xl rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">
      <div className="text-base font-semibold text-foreground">{title}</div>
      <div className="mt-2">{message}</div>
      <div className="mt-2">
        Solicite ao administrador um perfil com acesso a <span className="font-medium text-foreground">/admin</span> para gerenciar esses cadastros.
      </div>
    </div>
  )
}

function CadastrosPrincipalGate({ to }: { to: string }) {
  return (
    <PrincipalAdminGate
      to={to}
      title="Cadastros do Sistema Principal"
      message="Você tem acesso ao módulo SAM, mas não tem acesso ao painel administrativo do Sistema Principal. Os cadastros de Alunos, Turmas e Instituições são gerenciados no Sistema Principal."
    />
  )
}

function RedirectSamAlunoToPrincipal() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth()
  const canAccessPrincipalAdmin = hasRole("admin") || hasRole("superadmin") || hasRole("gestor")

  if (!id) return <Navigate to="/modulo/sam/cadastros/alunos" replace />;
  if (canAccessPrincipalAdmin) return <Navigate to={`/modulo/vagou/admin/criancas/${id}`} replace />;
  return <Navigate to={`/modulo/sam/alunos/${id}/prontuario`} replace />;
}

export function SamModuleRoutes() {
  return (
    <>
      <Route path="/modulo/sam/login" element={<Login />} />
      <Route path="/modulo/sam/login/escola" element={<LoginEscola />} />
      <Route path="/modulo/sam/login/recovery" element={<Recovery />} />

      <Route element={<SchoolProtectedRoute />}>
        <Route element={<SchoolLayout />}>
          <Route path="/modulo/sam/escola/dashboard" element={<EscolaDashboard />} />
          <Route path="/modulo/sam/escola/alunos" element={<EscolaAlunos />} />
          <Route path="/modulo/sam/escola/alunos/novo" element={<EscolaAlunoNovo />} />
          <Route path="/modulo/sam/escola/alunos/:id" element={<EscolaAlunoDetalhe />} />
          <Route path="/modulo/sam/escola/queixas" element={<QueixasEscolares />} />
          <Route path="/modulo/sam/escola/queixas/nova" element={<QueixaNova />} />
          <Route path="/modulo/sam/escola/queixas/:id" element={<QueixaDetalhe />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/modulo/sam" element={<Navigate to="/modulo/sam/dashboard" replace />} />
          <Route path="/modulo/sam/dashboard" element={<Dashboard />} />
          <Route path="/modulo/sam/perfil" element={<Perfil />} />
          <Route path="/modulo/sam/cadastros" element={<Navigate to="/modulo/sam/cadastros/alunos" replace />} />
          <Route path="/modulo/sam/cadastros/alunos" element={<CadastrosAlunosConsulta />} />
          <Route path="/modulo/sam/cadastros/turmas" element={<CadastrosTurmasConsulta />} />
          <Route path="/modulo/sam/cadastros/cmeis" element={<CadastrosInstituicoesConsulta />} />
          <Route path="/modulo/sam/relatorios" element={<Relatorios />} />
          <Route path="/modulo/sam/escolas" element={<Navigate to="/modulo/sam/cadastros/cmeis" replace />} />
          <Route path="/modulo/sam/escolas/novo" element={<Navigate to="/modulo/sam/cadastros/cmeis" replace />} />
          <Route path="/modulo/sam/escolas/:id/editar" element={<Navigate to="/modulo/sam/cadastros/cmeis" replace />} />
          <Route
            path="/modulo/sam/usuarios"
            element={
              <PrincipalAdminGate
                to="/modulo/vagou/admin/usuarios"
                title="Usuários do Sistema Principal"
                message="O gerenciamento de usuários é centralizado no Sistema Principal."
              />
            }
          />
          <Route path="/modulo/sam/usuarios/novo" element={<Navigate to="/modulo/sam/usuarios" replace />} />
          <Route path="/modulo/sam/usuarios/:id" element={<Navigate to="/modulo/sam/usuarios" replace />} />
          <Route path="/modulo/sam/configuracoes" element={<Configuracoes />} />
          <Route path="/modulo/sam/auditoria" element={<Navigate to="/modulo/sam/configuracoes?tab=auditoria" replace />} />
          <Route path="/modulo/sam/especialidades" element={<Especialidades />} />
          
          <Route path="/modulo/sam/alunos" element={<Navigate to="/modulo/sam/alunos/selecionados" replace />} />
          <Route path="/modulo/sam/alunos/selecionados" element={<AlunosSelecionados />} />
          <Route path="/modulo/sam/alunos/novo" element={<Navigate to="/modulo/sam/cadastros/alunos" replace />} />
          <Route path="/modulo/sam/alunos/:id" element={<RedirectSamAlunoToPrincipal />} />
          <Route path="/modulo/sam/alunos/:id/editar" element={<RedirectSamAlunoToPrincipal />} />
          <Route path="/modulo/sam/alunos/:id/prontuario" element={<Prontuario />} />
          <Route path="/modulo/sam/alunos/:id/prontuario/relatorio" element={<ProntuarioRelatorio />} />
          <Route path="/modulo/sam/agenda" element={<Agenda />} />
          <Route path="/modulo/sam/agenda/novo" element={<AgendaNovo />} />
          <Route path="/modulo/sam/atendimentos" element={<Atendimentos />} />
          <Route path="/modulo/sam/atendimentos/novo" element={<AtendimentoNovo />} />
          <Route path="/modulo/sam/atendimentos/:id" element={<AtendimentoDetalhe />} />
          <Route path="/modulo/sam/queixas" element={<QueixasEscolares />} />
          <Route path="/modulo/sam/queixas/nova" element={<QueixaNova />} />
          <Route path="/modulo/sam/queixas/:id" element={<QueixaDetalhe />} />
          <Route path="/modulo/sam/turmas" element={<Navigate to="/modulo/sam/cadastros/turmas" replace />} />
          <Route path="/modulo/sam/prontuario" element={<Navigate to="/modulo/sam/alunos" replace />} />
        </Route>
      </Route>

      <Route path="/modulo/sam/*" element={<NotFound />} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <>{SamModuleRoutes()}</>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
