import { ReactNode } from "react";
import { cn } from "@/utils/utils";
import { Breadcrumbs, Crumb } from "@/components/common/Breadcrumbs";

type ModuleMainProps = {
  /** Used as the animation key (geralmente o pathname) */
  routeKey?: string;
  breadcrumbs?: Crumb[];
  children: ReactNode;
  className?: string;
};

/**
 * Container de conteúdo compartilhado por todos os módulos.
 * Garante a MESMA largura máxima, espaçamentos, breadcrumbs e
 * transição de entrada (fade-in) em VAGOU, SAM e Sondagem.
 */
export function ModuleMain({ routeKey, breadcrumbs, children, className }: ModuleMainProps) {
  return (
    <main id="main-content" className="flex-1 overflow-auto">
      <div
        key={routeKey}
        className={cn(
          "mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8 animate-fade-in",
          className
        )}
      >
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} />
        ) : null}
        {children}
      </div>
    </main>
  );
}

export default ModuleMain;
