import { useMemo, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { CardGridSkeleton, TableSkeleton } from "@/components/common/skeletons";
import { useCriancasRealtimeUpdates } from "@/hooks/use-realtime-updates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TooltipHelper } from "@/components/ui/tooltip-helper";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Filter, Eye, Edit, Trash2, X, Users, UserCheck, Clock, Plus, Grid3x3, List, MoreVertical, User, Calendar, ArrowUpDown, ArrowUp, ArrowDown, ArrowRightLeft, RefreshCw, GraduationCap, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAllCriancas, useDeleteCrianca } from "@/hooks/api/criancas-hooks";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import { CriancaDialog } from "@/components/admin/CriancaDialog";
import TransferenciaMassaDialog from "@/components/admin/TransferenciaMassaDialog";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePaginatedData } from "@/hooks/api/pagination-hooks";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { RealtimeIndicator } from "@/components/common/RealtimeIndicator";
import { PermissionGate, useCanAccess, PERMISSIONS } from "@/components/admin/PermissionGate";
import { useTurnoInteresseLote } from "@/hooks/api/campos-inscricao-hooks";
import SexoIcon from "@/components/common/SexoIcon";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/StatCard";

import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";

const Criancas = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Permission checks
  const canCreate = useCanAccess(PERMISSIONS.CRIANCAS_CRIAR);
  const canEdit = useCanAccess(PERMISSIONS.CRIANCAS_EDITAR);
  const canDelete = useCanAccess(PERMISSIONS.CRIANCAS_EXCLUIR);
  
  const [searchTerm, setSearchTerm] = useState("");
  const { debouncedValue: debouncedSearchTerm, isDebouncing: isSearching } = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoUnidadeFilter, setTipoUnidadeFilter] = useState<"cmei_creche" | "escola">("cmei_creche");
  const [cmeiFilter, setCmeiFilter] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCriancaId, setEditCriancaId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCriancaId, setDeleteCriancaId] = useState<string | undefined>();
  const [selectedCriancas, setSelectedCriancas] = useState<string[]>([]);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"nome" | "data_nascimento" | "created_at">("nome");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());

  // Password protection for Transição Anual
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const TAB_LOCK_PIN = "1234"; // Consistent with Configuracoes.tsx

  const handleTransicaoClick = () => {
    setPinValue("");
    setPinDialogOpen(true);
  };

  const handleConfirmPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (pinValue === TAB_LOCK_PIN) {
      setPinDialogOpen(false);
      setPinValue("");
      toast.success("Acesso liberado.");
      navigate("/modulo/vagou/admin/transicao");
    } else {
      toast.error("Senha inválida.");
      setPinValue("");
    }
  };

  const { data: criancas, isLoading, isFetching, refetch } = useAllCriancas({
    status: statusFilter !== "all" ? statusFilter : undefined,
    cmei: cmeiFilter,
    search: debouncedSearchTerm,
    tipoUnidade: tipoUnidadeFilter,
  });
  const criancaIds = useMemo(() => (criancas || []).map((c) => c.id), [criancas]);
  const { data: turnoInteresse = {} } = useTurnoInteresseLote(criancaIds);

  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: ["admin-criancas"] });
    queryClient.invalidateQueries({ queryKey: ["criancas"] });
    await refetch();
    setLastUpdatedAt(Date.now());
  };

  const { data: cmeis } = useCMEIs({ tipoUnidade: tipoUnidadeFilter });
  const deleteMutation = useDeleteCrianca();

  // Habilitar atualizações em tempo real
  useCriancasRealtimeUpdates(true);

  // Ordenação
  const sortedCriancas = [...(criancas || [])].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "nome") {
      comparison = a.nome.localeCompare(b.nome, "pt-BR");
    } else if (sortBy === "data_nascimento") {
      comparison = new Date(a.data_nascimento).getTime() - new Date(b.data_nascimento).getTime();
    } else if (sortBy === "created_at") {
      comparison = new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Pagination
  const pagination = usePaginatedData(sortedCriancas, 12);

  const toggleSort = (field: "nome" | "data_nascimento" | "created_at") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: "nome" | "data_nascimento" | "created_at") => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const meses = differenceInMonths(hoje, nascimento);
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    const dias = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24)) % 30;

    if (anos === 0 && meses === 0) {
      return `${dias} dia(s)`;
    } else if (anos === 0) {
      return `${meses} mês(es)`;
    } else if (anos === 1) {
      return `1 ano${mesesRestantes > 0 ? `, ${mesesRestantes} mês(es)` : ""}${dias > 0 ? ` e ${dias} dia(s)` : ""}`;
    } else {
      return `${anos} ano(s)${mesesRestantes > 0 ? `, ${mesesRestantes} mês(es)` : ""}${dias > 0 ? ` e ${dias} dia(s)` : ""}`;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Matriculado":
      case "Matriculada":
        return "default";
      case "Convocado":
        return "secondary";
      case "Fila de Espera":
        return "outline";
      case "Desistente":
      case "Recusada":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleDelete = () => {
    if (deleteCriancaId) {
      deleteMutation.mutate(deleteCriancaId, {
        onSuccess: () => {
          handleRefresh();
        },
      });
      setDeleteDialogOpen(false);
      setDeleteCriancaId(undefined);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && criancas) {
      const matriculadasIds = criancas
        .filter(c => c.status === "Matriculado" || c.status === "Matriculada")
        .map(c => c.id);
      setSelectedCriancas(matriculadasIds);
    } else {
      setSelectedCriancas([]);
    }
  };

  const handleSelectCrianca = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCriancas(prev => [...prev, id]);
    } else {
      setSelectedCriancas(prev => prev.filter(cid => cid !== id));
    }
  };

  const criancasMatriculadas = criancas?.filter(c => c.status === "Matriculado" || c.status === "Matriculada") || [];
  const allMatriculadasSelected = criancasMatriculadas.length > 0 && 
    criancasMatriculadas.every(c => selectedCriancas.includes(c.id));

  const totalCriancas = criancas?.length || 0;
  const matriculadas = criancasMatriculadas.length;
  const filaEspera = criancas?.filter((c) => c.status === "Fila de Espera" || c.status === "Convocado").length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Crianças</h1>
              <RealtimeIndicator />
            </div>
          }
          description="Cadastro e gerenciamento de todas as crianças do sistema"
          actions={(
            <>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Atualizado às {format(new Date(lastUpdatedAt), "HH:mm", { locale: ptBR })}
              </span>
              <TooltipHelper content="Atualizar lista de crianças">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  aria-label="Atualizar lista"
                  className="shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
                </Button>
              </TooltipHelper>
              <TooltipHelper content="Planejar e aplicar a transição anual de turmas (Promoção/Conclusão)">
                <Button
                  variant="outline"
                  onClick={handleTransicaoClick}
                  aria-label="Transição Anual"
                  className="flex-1 sm:flex-initial"
                >
                  <GraduationCap className="mr-2 h-4 w-4" aria-hidden="true" />
                  Transição Anual
                </Button>
              </TooltipHelper>
              <TooltipHelper content="Cadastra uma nova criança no sistema">
                <Button
                  onClick={() => setEditDialogOpen(true)}
                  aria-label="Cadastrar nova criança"
                  className="flex-1 sm:flex-initial"
                  disabled={!canCreate}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Nova Criança
                </Button>
              </TooltipHelper>
            </>
          )}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <StatCard
            title="Total"
            value={totalCriancas}
            subtitle="no resultado atual"
            icon={Users}
            accent="primary"
            index={0}
          />
          <StatCard
            title="Matriculadas"
            value={matriculadas}
            subtitle="com matrícula ativa"
            icon={UserCheck}
            accent="success"
            index={1}
          />
          <StatCard
            title="Fila de Espera"
            value={filaEspera}
            subtitle="na fila (inclui convocadas)"
            icon={Clock}
            accent="warning"
            index={2}
          />
        </div>


        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Listagem de Crianças</CardTitle>
                <CardDescription>
                  Todas as crianças cadastradas no sistema
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <RealtimeIndicator />
                <TooltipHelper content="Exibe crianças em formato de cards">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    aria-label="Visualizar como grade"
                    aria-pressed={viewMode === "grid"}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </TooltipHelper>
                <TooltipHelper content="Exibe crianças em formato de tabela">
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    aria-label="Visualizar como tabela"
                    aria-pressed={viewMode === "table"}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipHelper>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selection Action Bar */}
            {selectedCriancas.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{selectedCriancas.length} selecionada(s)</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCriancas([])}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar seleção
                  </Button>
                </div>
                <TooltipHelper content="Transfere múltiplas crianças matriculadas para outra unidade">
                  <Button
                    size="sm"
                    onClick={() => setTransferDialogOpen(true)}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Transferir em Massa
                  </Button>
                </TooltipHelper>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                {isSearching ? (
                  <Spinner className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder="Buscar por nome da criança ou responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "nome" | "data_nascimento" | "created_at")}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                  <SelectItem value="data_nascimento">Data de Nascimento</SelectItem>
                  <SelectItem value="created_at">Data de Cadastro</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={tipoUnidadeFilter}
                onValueChange={(v) => {
                  const nextValue = v as "cmei_creche" | "escola";
                  setTipoUnidadeFilter(nextValue);
                  const next = new URLSearchParams(searchParams);
                  if (nextValue === "cmei_creche") next.delete("tipo");
                  else next.set("tipo", nextValue);
                  setSearchParams(next);
                }}
                disabled
              >
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cmei_creche">CMEI</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Fila de Espera">Fila de Espera</SelectItem>
                  <SelectItem value="Convocado">Convocado</SelectItem>
                  <SelectItem value="Matriculado">Matriculado</SelectItem>
                  <SelectItem value="Matriculada">Matriculada</SelectItem>
                  <SelectItem value="Desistente">Desistente</SelectItem>
                  <SelectItem value="Recusada">Recusada</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || statusFilter !== "all" || cmeiFilter || tipoUnidadeFilter !== "cmei_creche") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCmeiFilter(undefined);
                    setTipoUnidadeFilter("cmei_creche");
                    const next = new URLSearchParams(searchParams);
                    next.delete("tipo");
                    setSearchParams(next);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Content */}
            {isLoading ? (
              viewMode === "grid" ? (
                <CardGridSkeleton count={6} />
              ) : (
                <TableSkeleton rows={8} columns={5} />
              )
            ) : !criancas || criancas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma criança encontrada.
              </div>
            ) : viewMode === "grid" ? (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagination.data.map((crianca) => (
                  <Card key={crianca.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{crianca.nome}</CardTitle>
                            {crianca.protocolo && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {crianca.protocolo}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {calcularIdade(crianca.data_nascimento)}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full border-border/60 text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md data-[state=open]:bg-primary data-[state=open]:text-primary-foreground data-[state=open]:border-primary"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Ações</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 [&_[role=menuitem]]:transition-all [&_[role=menuitem]]:duration-200 [&_[role=menuitem]]:cursor-pointer [&_[role=menuitem]:hover]:translate-x-1 [&_[role=menuitem]_svg]:transition-transform [&_[role=menuitem]:hover_svg]:scale-110">
                            <DropdownMenuLabel className="flex flex-col gap-0.5">
                              <span className="text-xs font-normal text-muted-foreground">Ações</span>
                              <span className="truncate text-sm font-semibold">{crianca.nome}</span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate(`/modulo/vagou/admin/criancas/${crianca.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditCriancaId(crianca.id);
                                setEditDialogOpen(true);
                              }}
                              className="text-blue-600 focus:text-blue-700"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setDeleteCriancaId(crianca.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Data Nasc.:</p>
                        <p className="text-sm font-medium">
                          {format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Sexo:</p>
                          <p className="text-sm font-medium">{crianca.sexo || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Período:</p>
                          <p className="text-sm font-medium">
                            {crianca.turma_atual?.turno || turnoInteresse[crianca.id] || "-"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Responsável:</p>
                        <p className="text-sm font-medium">{crianca.responsavel_nome}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status:</p>
                        <Badge variant={getStatusBadgeVariant(crianca.status)} className="mt-1">
                          {crianca.status}
                        </Badge>
                      </div>
                      {crianca.cmei_atual && (
                        <div>
                          <p className="text-xs text-muted-foreground">CMEI:</p>
                          <p className="text-sm font-medium">{crianca.cmei_atual.nome}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/modulo/vagou/admin/criancas/${crianca.id}`)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Ver Detalhes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setEditCriancaId(crianca.id);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <PaginationControls
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.setPageSize}
                hasNextPage={pagination.hasNextPage}
                hasPreviousPage={pagination.hasPreviousPage}
              />
              </>
            ) : (
              <>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allMatriculadasSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Selecionar todas matriculadas"
                        />
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 -ml-3" onClick={() => toggleSort("nome")}>
                          Criança
                          {getSortIcon("nome")}
                        </Button>
                      </TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="w-[56px] text-center">Sexo</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 -ml-3" onClick={() => toggleSort("data_nascimento")}>
                          Data Nasc.
                          {getSortIcon("data_nascimento")}
                        </Button>
                      </TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 -ml-3" onClick={() => toggleSort("created_at")}>
                          Cadastro
                          {getSortIcon("created_at")}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.data.map((crianca) => {
                      const isMatriculada = crianca.status === "Matriculado" || crianca.status === "Matriculada";
                      return (
                      <TableRow key={crianca.id}>
                        <TableCell>
                          {isMatriculada && (
                            <Checkbox
                              checked={selectedCriancas.includes(crianca.id)}
                              onCheckedChange={(checked) => handleSelectCrianca(crianca.id, checked as boolean)}
                              aria-label={`Selecionar ${crianca.nome}`}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div>{crianca.nome}</div>
                            {crianca.protocolo && (
                              <div className="text-xs text-muted-foreground">
                                {crianca.protocolo}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{crianca.responsavel_nome}</TableCell>
                        <TableCell className="text-center">
                          <SexoIcon sexo={crianca.sexo} />
                        </TableCell>
                        <TableCell>
                          {format(new Date(crianca.data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {calcularIdade(crianca.data_nascimento)}
                        </TableCell>
                        <TableCell>{crianca.turma_atual?.turno || turnoInteresse[crianca.id] || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(crianca.status)}>
                            {crianca.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {crianca.created_at
                            ? format(new Date(crianca.created_at), "dd/MM/yyyy - HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full border-border/60 text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md data-[state=open]:bg-primary data-[state=open]:text-primary-foreground data-[state=open]:border-primary"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Ações</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 [&_[role=menuitem]]:transition-all [&_[role=menuitem]]:duration-200 [&_[role=menuitem]]:cursor-pointer [&_[role=menuitem]:hover]:translate-x-1 [&_[role=menuitem]_svg]:transition-transform [&_[role=menuitem]:hover_svg]:scale-110">
                              <DropdownMenuLabel className="flex flex-col gap-0.5">
                                <span className="text-xs font-normal text-muted-foreground">Ações</span>
                                <span className="truncate text-sm font-semibold">{crianca.nome}</span>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => navigate(`/modulo/vagou/admin/criancas/${crianca.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditCriancaId(crianca.id);
                                  setEditDialogOpen(true);
                                }}
                                className="text-blue-600 focus:text-blue-700"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteCriancaId(crianca.id);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-red-600 focus:text-red-700"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.setPageSize}
                hasNextPage={pagination.hasNextPage}
                hasPreviousPage={pagination.hasPreviousPage}
              />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CriancaDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        criancaId={editCriancaId}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A criança será permanentemente excluída do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransferenciaMassaDialog
        open={transferDialogOpen}
        onOpenChange={(open) => {
          setTransferDialogOpen(open);
          if (!open) setSelectedCriancas([]);
        }}
        preSelectedCriancaIds={selectedCriancas}
      />

      {/* Diálogo de Senha para Transição Anual */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Acesso Restrito
            </DialogTitle>
            <DialogDescription>
              A Transição Anual é uma operação crítica que afeta todas as turmas. 
              Por favor, insira a senha de administrador para continuar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmPin} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pin">Senha de Acesso</Label>
              <PasswordInput
                id="pin"
                placeholder="Insira a senha"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.slice(0, 4))}
                autoFocus
              />
            </div>
            <DialogFooter className="sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPinDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Confirmar Acesso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Criancas;
