import { useState, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { Navigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Filter, Shield, RefreshCw, Download, Eye, Database, Edit, Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuditoria } from "@/hooks/api/auditoria-hooks";
import { useLogsUsers } from "@/hooks/api/criancas-hooks";
import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

const ITEMS_PER_PAGE = 20;

const Auditoria = () => {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("superadmin");

  const [searchTerm, setSearchTerm] = useState("");
  const { debouncedValue: debouncedSearchTerm, isDebouncing: isSearching } = useDebounce(searchTerm, 300);
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [tabelaFilter, setTabelaFilter] = useState<string>("all");
  const [operacaoFilter, setOperacaoFilter] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());
  const queryClient = useQueryClient();

  const { data: auditoria, isLoading, isRefetching, totalCount } = useAuditoria();
  const { data: usuarios } = useLogsUsers();

  const getOperacaoIcon = (operacao: string) => {
    switch (operacao.toUpperCase()) {
      case "INSERT": return <Plus className="h-4 w-4 text-green-500" />;
      case "UPDATE": return <Edit className="h-4 w-4 text-blue-500" />;
      case "DELETE": return <Trash2 className="h-4 w-4 text-red-500" />;
      default: return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getOperacaoBadge = (operacao: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (operacao.toUpperCase()) {
      case "INSERT": return "default";
      case "UPDATE": return "secondary";
      case "DELETE": return "destructive";
      default: return "outline";
    }
  };

  const tabelas = useMemo(() => {
    if (!auditoria) return [];
    return [...new Set(auditoria.map((a) => a.tabela))].sort();
  }, [auditoria]);

  const filteredAuditoria = useMemo(() => {
    if (!auditoria) return [];
    
    return auditoria.filter((item) => {
      const operacaoLower = item.operacao.toLowerCase();
      const isAcesso =
        item.tabela === "painel_admin" ||
        item.tabela === "auth" ||
        operacaoLower.startsWith("login_") ||
        operacaoLower === "acesso" ||
        operacaoLower === "acesso_negado" ||
        operacaoLower === "tentativa_sem_auth";

      const matchesSearch = 
        item.tabela.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.operacao.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.registro_id?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesTipo = tipoFilter === "all" || (tipoFilter === "acesso" && isAcesso);
      const matchesTabela = tabelaFilter === "all" || item.tabela === tabelaFilter;
      const matchesOperacao = operacaoFilter === "all" || item.operacao.toUpperCase() === operacaoFilter;

      let matchesData = true;
      if (item.created_at) {
        const itemDate = new Date(item.created_at);
        if (dataInicio) {
          matchesData = matchesData && !isBefore(itemDate, startOfDay(parseISO(dataInicio)));
        }
        if (dataFim) {
          matchesData = matchesData && !isAfter(itemDate, endOfDay(parseISO(dataFim)));
        }
      }

      return matchesSearch && matchesTipo && matchesTabela && matchesOperacao && matchesData;
    });
  }, [auditoria, debouncedSearchTerm, tipoFilter, tabelaFilter, operacaoFilter, dataInicio, dataFim]);

  const totalPages = Math.ceil(filteredAuditoria.length / ITEMS_PER_PAGE);
  const paginatedAuditoria = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAuditoria.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAuditoria, currentPage]);

  const handleFilterChange = () => setCurrentPage(1);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["auditoria"] });
    setLastUpdatedAt(Date.now());
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setTipoFilter("all");
    setTabelaFilter("all");
    setOperacaoFilter("all");
    setDataInicio("");
    setDataFim("");
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (!filteredAuditoria.length) return;
    
    const csvContent = [
      ["Data/Hora", "Tabela", "Operação", "Registro ID", "Usuário ID", "IP", "User Agent"].join(";"),
      ...filteredAuditoria.map(item => [
        format(new Date(item.created_at!), "dd/MM/yyyy HH:mm:ss"),
        item.tabela,
        item.operacao,
        item.registro_id || "",
        item.usuario_id || "",
        item.ip_address || "",
        item.user_agent || ""
      ].join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const getUsuarioNome = (userId: string | null) => {
    if (!userId || !usuarios) return "Sistema";
    const user = usuarios.find((u) => u.id === userId);
    return user?.nome_completo || user?.email || userId.substring(0, 8);
  };

  const stats = useMemo(() => ({
    total: totalCount ?? auditoria?.length ?? 0,
    inserts: auditoria?.filter((a) => a.operacao.toUpperCase() === "INSERT").length || 0,
    updates: auditoria?.filter((a) => a.operacao.toUpperCase() === "UPDATE").length || 0,
    deletes: auditoria?.filter((a) => a.operacao.toUpperCase() === "DELETE").length || 0,
  }), [auditoria, totalCount]);

  if (!isSuperAdmin) {
    return <Navigate to="/modulo/vagou/admin" replace />;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auditoria</h1>
            <p className="text-muted-foreground">
              Registro de alterações sensíveis no banco de dados
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap self-center">
              Atualizado às {format(new Date(lastUpdatedAt), "HH:mm", { locale: ptBR })}
            </span>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!filteredAuditoria.length}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">registros</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inserções</CardTitle>
              <Plus className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div className="text-2xl font-bold">{stats.inserts}</div>
                  <p className="text-xs text-muted-foreground">INSERT</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atualizações</CardTitle>
              <Edit className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div className="text-2xl font-bold">{stats.updates}</div>
                  <p className="text-xs text-muted-foreground">UPDATE</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exclusões</CardTitle>
              <Trash2 className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div className="text-2xl font-bold">{stats.deletes}</div>
                  <p className="text-xs text-muted-foreground">DELETE</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registros de Auditoria</CardTitle>
            <CardDescription>
              Histórico completo de alterações em tabelas sensíveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                {isSearching ? (
                  <Spinner className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); handleFilterChange(); }}
                  className="pl-10"
                />
              </div>

              <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); handleFilterChange(); }}>
                <SelectTrigger>
                  <Shield className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="acesso">Acessos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tabelaFilter} onValueChange={(v) => { setTabelaFilter(v); handleFilterChange(); }}>
                <SelectTrigger>
                  <Database className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tabelas</SelectItem>
                  {tabelas.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={operacaoFilter} onValueChange={(v) => { setOperacaoFilter(v); handleFilterChange(); }}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Operação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="INSERT">INSERT</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="ACESSO">ACESSO</SelectItem>
                  <SelectItem value="ACESSO_NEGADO">ACESSO_NEGADO</SelectItem>
                  <SelectItem value="TENTATIVA_SEM_AUTH">TENTATIVA_SEM_AUTH</SelectItem>
                  <SelectItem value="LOGIN_SUCESSO">LOGIN_SUCESSO</SelectItem>
                  <SelectItem value="LOGIN_FALHA">LOGIN_FALHA</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => { setDataInicio(e.target.value); handleFilterChange(); }}
                title="Data Início"
              />

              <Input
                type="date"
                value={dataFim}
                onChange={(e) => { setDataFim(e.target.value); handleFilterChange(); }}
                title="Data Fim"
              />
            </div>

            {(searchTerm || tipoFilter !== "all" || tabelaFilter !== "all" || operacaoFilter !== "all" || dataInicio || dataFim) && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {filteredAuditoria.length} resultado(s)
                </span>
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Limpar filtros
                </Button>
              </div>
            )}

            {/* Table */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead className="hidden lg:table-cell">Dispositivo</TableHead>
                      <TableHead className="text-right">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAuditoria.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          {format(new Date(item.created_at!), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.tabela}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getOperacaoIcon(item.operacao)}
                            <Badge variant={getOperacaoBadge(item.operacao)}>
                              {item.operacao.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getUsuarioNome(item.usuario_id)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.ip_address || "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[150px] truncate" title={item.user_agent || undefined}>
                          {item.user_agent ? (
                            item.user_agent.includes('Mobile') ? '📱 Mobile' :
                            item.user_agent.includes('Windows') ? '💻 Windows' :
                            item.user_agent.includes('Mac') ? '🍎 Mac' :
                            item.user_agent.includes('Linux') ? '🐧 Linux' :
                            '🌐 Web'
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Auditoria</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Tabela:</span> {item.tabela}
                                  </div>
                                  <div>
                                    <span className="font-medium">Operação:</span> {item.operacao}
                                  </div>
                                  <div>
                                    <span className="font-medium">Registro ID:</span> {item.registro_id || "-"}
                                  </div>
                                  <div>
                                    <span className="font-medium">IP:</span> {item.ip_address || "-"}
                                  </div>
                                  <div className="col-span-2">
                                    <span className="font-medium">User Agent:</span>
                                    <p className="text-xs text-muted-foreground break-all mt-1">
                                      {item.user_agent || "-"}
                                    </p>
                                  </div>
                                </div>
                                
                                {item.dados_antigos && (
                                  <div>
                                    <h4 className="font-medium mb-2">Dados Anteriores:</h4>
                                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                                      {JSON.stringify(item.dados_antigos, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {item.dados_novos && (
                                  <div>
                                    <h4 className="font-medium mb-2">Dados Novos:</h4>
                                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                                      {JSON.stringify(item.dados_novos, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedAuditoria.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p>Nenhum registro de auditoria encontrado.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </ScrollArea>
            )}

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Exibindo {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredAuditoria.length)} de {filteredAuditoria.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Auditoria;

