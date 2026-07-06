import { ReactNode } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Filter, Grid3x3, List, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardProps } from "@/components/common/StatCard";

export type ListStat = Omit<StatCardProps, "index">;

type ViewMode = "grid" | "table";

type VagouListShellProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  stats?: ListStat[];
  /** Busca principal */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    isSearching?: boolean;
    widthClassName?: string;
  };
  /** Slot para selects/filtros adicionais (renderizados ao lado da busca) */
  filters?: ReactNode;
  /** Botão limpar filtros */
  onClear?: () => void;
  showClear?: boolean;
  /** Alternância de visualização (grid/tabela). Omitir para ocultar */
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  /** Conteúdo principal (tabela ou grade) */
  children: ReactNode;
  /** Paginação (geralmente <PaginationControls />) */
  pagination?: ReactNode;
};

/**
 * Casca de listagem padronizada — visual idêntico ao VAGOU (Admin).
 * Garante mesmos espaçamentos, cabeçalho, cards de estatística, card de
 * filtros, alternância de visualização e paginação em todos os módulos.
 */
export function VagouListShell({
  title,
  description,
  actions,
  stats,
  search,
  filters,
  onClear,
  showClear,
  viewMode,
  onViewModeChange,
  children,
  pagination,
}: VagouListShellProps) {
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <PageHeader title={title} description={description} actions={actions} />

      {stats && stats.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} index={index} />
          ))}
        </div>
      ) : null}

      {(search || filters || onViewModeChange) ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                {search ? (
                  <div className={`relative flex-1 w-full ${search.widthClassName || "sm:w-64"}`}>
                    {search.isSearching ? (
                      <Spinner className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                    ) : (
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                      placeholder={search.placeholder || "Buscar..."}
                      value={search.value}
                      onChange={(e) => search.onChange(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                ) : null}
                {filters}
                {showClear && onClear ? (
                  <Button variant="outline" onClick={onClear}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar
                  </Button>
                ) : null}
              </div>
              {onViewModeChange ? (
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    aria-label="Visualizar como grade"
                    onClick={() => onViewModeChange("grid")}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    aria-label="Visualizar como tabela"
                    onClick={() => onViewModeChange("table")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {children}

      {pagination}
    </div>
  );
}

export default VagouListShell;
