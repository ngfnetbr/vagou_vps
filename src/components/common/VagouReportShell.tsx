import { ReactNode } from "react";
import { PageHeader } from "@/components/common/page-header";

type VagouReportShellProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Conteúdo do dashboard (abas, grids de gráficos, etc.) */
  children: ReactNode;
};

/**
 * Casca de relatórios/dashboards — usa os mesmos tokens, cabeçalho e
 * espaçamentos do VAGOU (idêntico ao VagouListShell, porém sem o card de
 * filtros e a alternância de visualização das listagens).
 */
export function VagouReportShell({ title, description, actions, children }: VagouReportShellProps) {
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  );
}

export default VagouReportShell;
