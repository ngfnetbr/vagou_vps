import { ReactNode } from "react";
import { cn } from "@/utils/utils";

type PageHeaderProps = {
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ leading, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex items-start gap-4 min-w-0">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0">
          <div className="min-w-0 text-foreground">
            {typeof title === "string" ? (
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{title}</h1>
            ) : (
              title
            )}
          </div>
          {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2 sm:pt-1">{actions}</div> : null}
    </div>
  );
}

