import { ReactNode } from "react";
import { LucideIcon, SearchX } from "lucide-react";
import { cn } from "@/utils/utils";

type ListEmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Estado vazio padronizado para todas as listagens (VAGOU, SAM, Sondagem).
 * Mesmo espaçamento, ícone, tipografia e animação de entrada.
 */
export function ListEmptyState({
  icon: Icon = SearchX,
  title,
  description,
  className,
  children,
}: ListEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center animate-fade-in",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm ring-1 ring-border">
        <Icon className="h-6 w-6 opacity-70" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="mt-2 flex justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export default ListEmptyState;
