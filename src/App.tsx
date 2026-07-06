import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { DynamicThemeProvider } from "@/components/common/DynamicThemeProvider";
import { PWAIconsUpdater } from "@/components/common/PWAIconsUpdater";
import { RootRedirect } from "@/components/common/RootRedirect";
import { LegacyVagouRedirect } from "@/components/common/LegacyVagouRedirect";
import { LegacySondarRedirect } from "@/components/common/LegacySondarRedirect";
import { ModuleAccessGuard } from "@/components/common/ModuleAccessGuard";
import type { EcosystemModuleId } from "@/config/ecosystem-modules";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { CommandPalette } from "@/components/common/CommandPalette";
import { SpeedInsights } from "@vercel/speed-insights/react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { shouldRetryQuery } from "@/utils/error-utils";
import PublicHome from "./pages/public/PublicHome";
import Inscricao from "./pages/public/Inscricao";
import Fila from "./pages/public/Fila";
import Ocupacao from "./pages/public/Ocupacao";
import ConsultaCPF from "./pages/public/ConsultaCPF";
import DownloadApp from "./pages/public/DownloadApp";
import Contato from "./pages/public/Contato";
import TermosUso from "./pages/public/TermosUso";
import PrivacidadeLGPD from "./pages/public/PrivacidadeLGPD";
import Login from "./pages/auth/Login";
import Cadastro from "./pages/auth/Cadastro";
import RecuperarSenha from "./pages/auth/RecuperarSenha";
import RecuperarEmail from "./pages/auth/RecuperarEmail";
import RedefinirSenha from "./pages/auth/RedefinirSenha";
import AuthRedirect from "./pages/auth/AuthRedirect";
import CompletarCadastro from "./pages/auth/CompletarCadastro";
import Dashboard from "./pages/admin/Dashboard";
import CMEIsPage from "./pages/admin/CMEIs";
import TurmasPage from "./pages/admin/Turmas";
import FilaEsperaPage from "./pages/admin/FilaEspera";
import CriancasPage from "./pages/admin/Criancas";
import CriancaDetalhesPage from "./pages/admin/CriancaDetalhes";
import ConfiguracoesPage from "./pages/admin/Configuracoes";
import MatriculasPage from "./pages/admin/Matriculas";
import TurmaDetalhesPage from "./pages/admin/TurmaDetalhes";
import RelatoriosPage from "./pages/admin/Relatorios";
import BIPage from "./pages/admin/BI.tsx";
import OcupacaoAdminPage from "./pages/admin/Ocupacao";
import TransicaoAnualPage from "./pages/admin/TransicaoAnual";
import LogsPage from "./pages/admin/Logs";
import AuditoriaPage from "./pages/admin/Auditoria";
import PerfilAdminPage from "./pages/admin/Perfil";

import ValidacaoDocumentosPage from "./pages/admin/ValidacaoDocumentos";
import TutorialPage from "./pages/admin/Tutorial";
import UsuariosPage from "./pages/admin/Usuarios";
import MensagensPage from "./pages/admin/Mensagens";
import DiretorDashboard from "./pages/admin/DiretorDashboard";
import CursosAdminPage from "./pages/admin/Cursos";
import { SamModuleRoutes } from "@sam/App";
import { SondagemModuleRoutes } from "@sondagem/App";

import ResponsavelDashboard from "./pages/responsavel/Dashboard";
import ResponsavelPerfil from "./pages/responsavel/Perfil";
import ResponsavelFilaEspera from "./pages/responsavel/FilaEspera";
import ResponsavelOcupacao from "./pages/responsavel/Ocupacao";
import ResponsavelNovaInscricao from "./pages/responsavel/NovaInscricao";
import ResponsavelDocumentos from "./pages/responsavel/Documentos";
import ResponsavelHistoricoNotificacoes from "./pages/responsavel/HistoricoNotificacoes";
import ResponsavelMensagens from "./pages/responsavel/Mensagens";
import NotFound from "./pages/common/NotFound";
import ModuleSelector from "./pages/common/ModuleSelector";
import SuperAdminOverview from "./pages/superadmin/Overview";
import SuperAdminUsuarios from "./pages/superadmin/Usuarios";
import SuperAdminPermissoes from "./pages/superadmin/Permissoes";
import SuperAdminModulos from "./pages/superadmin/Modulos";
import SuperAdminMunicipio from "./pages/superadmin/Municipio";

import SuperAdminPerfil from "./pages/superadmin/Perfil";
import { ImpersonationBanner } from "@/components/common/ImpersonationBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
      refetchOnWindowFocus: false,
    },
  },
});

const enableSpeedInsights = import.meta.env.PROD && import.meta.env.VITE_VERCEL_SPEED_INSIGHTS === "true";

function AdminCursoRedirect() {
  const { cursoId } = useParams<{ cursoId?: string }>();
  return <Navigate to={cursoId ? `/modulo/vagou/admin/cursos/${cursoId}` : "/modulo/vagou/admin/cursos"} replace />;
}

function ModuleGuardOutlet({ module }: { module: EcosystemModuleId }) {
  return (
    <ModuleAccessGuard module={module}>
      <Outlet />
    </ModuleAccessGuard>
  );
}

function AdminMatriculaRedirect() {
  const { id } = useParams<{ id?: string }>();
  return <Navigate to={id ? `/modulo/vagou/admin/criancas/${id}` : "/modulo/vagou/admin/criancas"} replace />;
}

// App component with proper provider hierarchy
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <DynamicThemeProvider>
        <TooltipProvider>
          <PWAIconsUpdater />
          <Toaster />
          <Sonner />
          {enableSpeedInsights ? <SpeedInsights /> : null}
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ScrollToTop />
            <AuthProvider>
              <CommandPalette />
              <ImpersonationBanner />
              <Routes>
              {/* Console Super Admin - Atividade (unificado em Usuários) */}
              <Route
                path="/superadmin/atividade"
                element={<Navigate to="/superadmin/usuarios" replace />}
              />
            {/* Redirect root - checks for auth tokens in hash first */}
            <Route path="/" element={<RootRedirect />} />

            {/* Redirects de URLs antigas do VAGOU para o novo prefixo /modulo/vagou/* */}
            <Route path="/publico/*" element={<LegacyVagouRedirect prefix="publico" />} />
            <Route path="/admin/*" element={<LegacyVagouRedirect prefix="admin" />} />
            <Route path="/responsavel/*" element={<LegacyVagouRedirect prefix="responsavel" />} />

            {/* Redirect do slug antigo /modulo/sondagem/* para /modulo/sondar/* */}
            <Route path="/modulo/sondagem/*" element={<LegacySondarRedirect />} />
            
            
            {/* Public Routes */}
            <Route path="/modulo/vagou/publico" element={<PublicHome />} />
            <Route path="/modulo/vagou/publico/inscricao" element={<Inscricao />} />
            <Route path="/modulo/vagou/publico/fila" element={<Fila />} />
            <Route path="/modulo/vagou/publico/ocupacao" element={<Ocupacao />} />
            <Route path="/modulo/vagou/publico/consulta" element={<ConsultaCPF />} />
            <Route path="/modulo/vagou/publico/contato" element={<Contato />} />
            <Route path="/modulo/vagou/publico/termos" element={<TermosUso />} />
            <Route path="/modulo/vagou/publico/privacidade" element={<PrivacidadeLGPD />} />
            <Route path="/modulo/vagou/publico/download" element={<DownloadApp />} />
            <Route path="/download" element={<DownloadApp />} />
            
            {/* Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/cadastro" element={<Cadastro />} />
            <Route path="/auth/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/auth/recuperar-email" element={<RecuperarEmail />} />
            <Route path="/auth/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/auth/redirect" element={<AuthRedirect />} />
            <Route path="/auth/completar-cadastro" element={<CompletarCadastro />} />

            {/* Seletor de módulos do ecossistema */}
            <Route path="/modulos" element={<ModuleSelector />} />

            {/* Console Super Admin (Protected) */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <SuperAdminOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/usuarios"
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <SuperAdminUsuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/permissoes"
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <SuperAdminPermissoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/modulos"
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <SuperAdminModulos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/municipio"
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <SuperAdminMunicipio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/perfil"
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <SuperAdminPerfil />
                </ProtectedRoute>
              }
            />
            
            
            {/* Admin Routes (Protected) */}
            <Route
              path="/modulo/vagou/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/cmeis"
              element={
                <ProtectedRoute requireAdmin>
                  <CMEIsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/turmas"
              element={
                <ProtectedRoute requireAdmin>
                  <TurmasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/fila"
              element={
                <ProtectedRoute requireAdmin>
                  <FilaEsperaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/criancas"
              element={
                <ProtectedRoute requireAdmin>
                  <CriancasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/criancas/:id"
              element={
                <ProtectedRoute requiredRoles={["admin", "superadmin", "gestor", "diretor_cmei"]}>
                  <CriancaDetalhesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/configuracoes"
              element={
                <ProtectedRoute requireAdmin>
                  <ConfiguracoesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/cursos"
              element={
                <ProtectedRoute requireAdmin>
                  <CursosAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/cursos/:cursoId"
              element={
                <ProtectedRoute requireAdmin>
                  <CursosAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/curso"
              element={<AdminCursoRedirect />}
            />
            <Route
              path="/modulo/vagou/admin/curso/:cursoId"
              element={<AdminCursoRedirect />}
            />
            <Route
              path="/modulo/vagou/admin/matriculas"
              element={
                <ProtectedRoute requireAdmin>
                  <MatriculasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/matriculas/:id"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminMatriculaRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/turmas/:id"
              element={
                <ProtectedRoute requiredRoles={["admin", "superadmin", "gestor", "diretor_cmei"]}>
                  <TurmaDetalhesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/relatorios"
              element={
                <ProtectedRoute requireAdmin>
                  <RelatoriosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/bi"
              element={
                <ProtectedRoute requireAdmin>
                  <BIPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/ocupacao"
              element={
                <ProtectedRoute requireAdmin>
                  <OcupacaoAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/transicao"
              element={
                <ProtectedRoute requireAdmin>
                  <TransicaoAnualPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/transicoes"
              element={
                <ProtectedRoute requireAdmin>
                  <TransicaoAnualPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/logs"
              element={
                <ProtectedRoute requireAdmin>
                  <LogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/auditoria"
              element={
                <ProtectedRoute requireAdmin>
                  <AuditoriaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/notificacoes"
              element={<Navigate to="/modulo/vagou/admin/logs" replace />}
            />
            <Route
              path="/modulo/vagou/admin/perfil"
              element={
                <ProtectedRoute requireAdmin>
                  <PerfilAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/documentos"
              element={
                <ProtectedRoute requiredRoles={["admin", "superadmin", "gestor", "diretor_cmei"]}>
                  <ValidacaoDocumentosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/tutorial"
              element={
                <ProtectedRoute requireAdmin>
                  <TutorialPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/usuarios"
              element={
                <ProtectedRoute requireAdmin>
                  <UsuariosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/mensagens"
              element={
                <ProtectedRoute requireAdmin>
                  <MensagensPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/admin/diretor"
              element={
                <ProtectedRoute requiredRole="diretor_cmei">
                  <DiretorDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Responsavel Routes (Protected) */}
            <Route
              path="/modulo/vagou/responsavel"
              element={
                <ProtectedRoute requiredRole="responsavel">
                  <ResponsavelDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/responsavel/inscricao"
              element={
                <ProtectedRoute requiredRole="responsavel">
                  <ResponsavelNovaInscricao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/responsavel/documentos"
              element={
                <ProtectedRoute requiredRole="responsavel">
                  <ResponsavelDocumentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/responsavel/fila"
              element={
                <ProtectedRoute requiredRole="responsavel">
                  <ResponsavelFilaEspera />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/responsavel/ocupacao"
              element={
                <ProtectedRoute requiredRole="responsavel">
                  <ResponsavelOcupacao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/responsavel/perfil"
              element={
                <ProtectedRoute requiredRole="responsavel">
                  <ResponsavelPerfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/responsavel/notificacoes"
              element={
                <ProtectedRoute requiredRole="responsavel">
                  <ResponsavelHistoricoNotificacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modulo/vagou/responsavel/mensagens"
              element={
                <ProtectedRoute requiredRole="responsavel">
                  <ResponsavelMensagens />
                </ProtectedRoute>
              }
            />
            <Route element={<ModuleGuardOutlet module="sam" />}>
              {SamModuleRoutes()}
            </Route>
            <Route element={<ModuleGuardOutlet module="sondar" />}>
              {SondagemModuleRoutes()}
            </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </DynamicThemeProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
