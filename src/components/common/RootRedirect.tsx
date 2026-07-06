import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

/**
 * Componente que verifica se há tokens de autenticação no hash da URL
 * antes de redirecionar para a página pública
 */
export function RootRedirect() {
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    
    // Verifica se há token de recuperação de senha no hash
    if (hash && (hash.includes("type=recovery") || hash.includes("type=magiclink"))) {
      // Redireciona para a página de redefinir senha mantendo o hash
      navigate(`/auth/redefinir-senha${hash}`, { replace: true });
      return;
    }
    
    // Verifica se há token de confirmação de email no hash
    if (hash && hash.includes("type=signup")) {
      navigate(`/auth/redirect${hash}`, { replace: true });
      return;
    }

    // Verifica se há access_token no hash (pode ser de qualquer tipo de auth)
    if (hash && hash.includes("access_token")) {
      navigate(`/auth/redirect${hash}`, { replace: true });
      return;
    }
    
    // Se não há hash especial, inicia na tela de login
    setShouldRedirect("/auth/login");
  }, [navigate]);

  // Enquanto verifica, não renderiza nada
  if (shouldRedirect === null) {
    return null;
  }

  return <Navigate to={shouldRedirect} replace />;
}
