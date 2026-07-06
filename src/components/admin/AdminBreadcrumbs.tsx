import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Rótulos amigáveis por segmento de rota do VAGOU (/admin/*)
const SEGMENT_LABELS: Record<string, string> = {
  admin: "Início",
  dashboard: "Dashboard",
  diretor: "Minha Unidade",
  fila: "Fila de Espera",
  matriculas: "Matrículas",
  documentos: "Documentos",
  mensagens: "Mensagens",
  relatorios: "Relatórios",
  criancas: "Crianças",
  cmeis: "Unidades",
  turmas: "Turmas",
  usuarios: "Usuários",
  logs: "Logs do Sistema",
  configuracoes: "Configurações",
  auditoria: "Auditoria",
  tutorial: "Central de Ajuda",
  perfil: "Meu Perfil",
  novo: "Novo",
  nova: "Nova",
  editar: "Editar",
};

// Rótulos amigáveis para rotas dinâmicas (IDs): o pai define o nome do detalhe.
const DETAIL_LABELS_BY_PARENT: Record<string, string> = {
  criancas: "Detalhes da Criança",
  cmeis: "Detalhes da Unidade",
  turmas: "Detalhes da Turma",
  usuarios: "Detalhes do Usuário",
  matriculas: "Detalhes da Matrícula",
  documentos: "Detalhes do Documento",
  fila: "Detalhes da Inscrição",
};

// Rotas (após /admin) onde os breadcrumbs NÃO devem aparecer.
const HIDDEN_PATHS = new Set<string>([
  "/modulo/vagou/admin",
  "/modulo/vagou/admin/dashboard",
]);

const isDynamicSegment = (segment: string) =>
  /^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment);

const prettify = (segment: string) =>
  segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function AdminBreadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  // Apenas para rotas do VAGOU
  if (segments[0] !== "admin") return null;

  // Não exibir na home nem em páginas específicas configuradas
  if (segments.length <= 1) return null;
  if (HIDDEN_PATHS.has(pathname.replace(/\/$/, ""))) return null;

  const crumbs = segments.map((segment, index) => {
    const url = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    const parent = segments[index - 1];

    let label: string;
    if (isDynamicSegment(segment)) {
      label = (parent && DETAIL_LABELS_BY_PARENT[parent]) || "Detalhes";
    } else {
      label = SEGMENT_LABELS[segment] || prettify(segment);
    }

    // Segmentos dinâmicos intermediários não devem virar links navegáveis.
    const linkable = !isLast && !isDynamicSegment(segment);

    return { url, label, isLast, linkable };
  });

  return (
    <Breadcrumb className="px-3 py-2 md:px-6">
      <BreadcrumbList>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.url}>
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage aria-current="page" className="font-semibold text-foreground">
                  {crumb.label}
                </BreadcrumbPage>
              ) : crumb.linkable ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.url} className="flex items-center gap-1">
                    {crumb.url === "/modulo/vagou/admin" && <Home className="h-3.5 w-3.5" />}
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <span className="flex items-center gap-1">{crumb.label}</span>
              )}
            </BreadcrumbItem>
            {!crumb.isLast && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default AdminBreadcrumbs;
