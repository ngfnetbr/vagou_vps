import { Navigate, useLocation } from "react-router-dom";

/**
 * Redireciona URLs antigas do VAGOU (raiz) para o novo prefixo de módulo
 * /modulo/vagou/*, preservando o restante do caminho e a query string.
 *
 * Ex.: /admin/fila?x=1  ->  /modulo/vagou/admin/fila?x=1
 */
export function LegacyVagouRedirect({ prefix }: { prefix: "publico" | "admin" | "responsavel" }) {
  const location = useLocation();
  const legacyBase = `/${prefix}`;
  const rest = location.pathname.slice(legacyBase.length); // mantém subcaminho (inclui "/" inicial ou vazio)
  const target = `/modulo/vagou/${prefix}${rest}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}

export default LegacyVagouRedirect;
