import { useEffect, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { GraduationCap, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@ui/button";
import { Link, useLocation } from "react-router-dom";

export default function ResetPassword() {
  const location = useLocation();

  const returnTo = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return p.get("returnTo") || "/modulo/sondar/dashboard";
  }, [location.search]);

  useEffect(() => {
    const hash = window.location.hash || "";
    const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    const url = `/auth/redefinir-senha${qs}${hash}`;
    const timeout = setTimeout(() => {
      window.location.assign(url);
    }, 200);
    return () => clearTimeout(timeout);
  }, [returnTo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(217,71%,25%)] to-[hsl(217,71%,45%)] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur mb-4">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nova Senha</h1>
        </div>

        <div className="rounded-2xl bg-card p-8 shadow-xl border text-center space-y-4">
          <Lock className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Redefinir senha</h2>
          <p className="text-sm text-muted-foreground">
            Você será redirecionado para a redefinição do Sistema Principal.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <Spinner className="h-4 w-4 animate-spin text-primary" />
            Redirecionando...
          </div>
          <Button type="button" className="w-full" onClick={() => window.location.assign(`/auth/redefinir-senha?returnTo=${encodeURIComponent(returnTo)}${window.location.hash || ""}`)}>
            Ir para redefinição
          </Button>
          <Link to="/modulo/sondar/login">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}


