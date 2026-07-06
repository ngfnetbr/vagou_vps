import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/utils/utils";

export type Crumb = {
  label: string;
  to?: string;
};

type BreadcrumbsProps = {
  items: Crumb[];
  className?: string;
};

/**
 * Breadcrumbs padronizados para todos os módulos do ecossistema.
 * Mesmo estilo/tokens do VAGOU: texto muted, separador chevron e item
 * atual em destaque.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center gap-1.5">
                {index === 0 ? <Home className="h-3.5 w-3.5 shrink-0" /> : null}
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(isLast && "font-medium text-foreground")}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
