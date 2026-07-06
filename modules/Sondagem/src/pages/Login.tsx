// @ts-nocheck
import { useEffect, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useLocation } from "react-router-dom";
import { GraduationCap, LogIn } from "lucide-react";
import { Button } from "@ui/button";
import { useAuth } from "@root/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";

export default function Login() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const returnTo = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return p.get("returnTo") || "/modulo/sondar/dashboard";
  }, [location.search]);

  useEffect(() => {
    if (loading || user) return;
    const url = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
    const timeout = setTimeout(() => {
      window.location.assign(url);
    }, 200);
    return () => clearTimeout(timeout);
  }, [loading, user, returnTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!loading && user) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(217,71%,25%)] to-[hsl(217,71%,45%)] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur mb-4">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sondagem</h1>
          <p className="text-sm text-white/70 mt-1">Módulo Educacional</p>
        </div>

        <div className="rounded-2xl bg-card p-8 shadow-xl border">
          <h2 className="text-xl font-semibold text-foreground mb-1">Entrar</h2>
          <p className="text-sm text-muted-foreground mb-6">
            O Sondagem usa o login do Sistema Principal
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
            <Spinner className="h-4 w-4 animate-spin text-primary" />
            Redirecionando para o login...
          </div>

          <Button type="button" className="w-full mt-4" onClick={() => window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)}>
            <LogIn className="mr-2 h-4 w-4" />
            Ir para o login
          </Button>

          <div className="flex justify-end mt-4">
            <Link
              to={`/modulo/sondar/esqueci-senha?returnTo=${encodeURIComponent(returnTo)}`}
              className="text-xs text-primary hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


