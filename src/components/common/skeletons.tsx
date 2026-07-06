import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/utils/utils";

/**
 * Skeletons padronizados do ecossistema — use no lugar de spinners para
 * carregamentos de tabelas, cards e listas. Mantém a mesma "cara" em VAGOU,
 * SAM e SONDAR.
 */

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 6, columns = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn("w-full overflow-hidden rounded-lg border", className)}>
      {/* Cabeçalho */}
      <div
        className="grid gap-4 border-b bg-muted/40 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-3/4" />
        ))}
      </div>
      {/* Linhas */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 border-b px-4 py-3 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-full" : "w-2/3")} />
          ))}
        </div>
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
  lines?: number;
}

export function CardSkeleton({ className, lines = 3 }: CardSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </CardContent>
    </Card>
  );
}

interface CardGridSkeletonProps {
  count?: number;
  className?: string;
}

export function CardGridSkeleton({ count = 6, className }: CardGridSkeletonProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

interface StatCardsSkeletonProps {
  count?: number;
  className?: string;
}

export function StatCardsSkeleton({ count = 4, className }: StatCardsSkeletonProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
