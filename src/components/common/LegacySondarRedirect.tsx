import { Navigate, useLocation } from "react-router-dom";

/**
 * Redireciona o slug antigo do módulo de sondagem (/modulo/sondagem/*)
 * para o slug correto (/modulo/sondar/*), preservando subcaminho e query.
 *
 * Ex.: /modulo/sondagem/dashboard -> /modulo/sondar/dashboard
 */
export function LegacySondarRedirect() {
  const location = useLocation();
  const rest = location.pathname.replace(/^\/modulo\/sondagem/, "");
  const target = `/modulo/sondar${rest}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}

export default LegacySondarRedirect;
