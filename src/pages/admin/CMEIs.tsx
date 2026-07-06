import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipHelper } from "@/components/ui/tooltip-helper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Eye, Search, Grid3x3, List, MapPin, Users, Trash2, AlertTriangle, RotateCcw, ArrowRightLeft, Filter, Building2, CheckCircle2, XCircle } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { useAllCMEIs, useDeleteCMEI, useReactivateCMEI } from "@/hooks/api/admin-hooks";
import TransferenciaMassaDialog from "@/components/admin/TransferenciaMassaDialog";
import CMEIDialog from "@/components/admin/CMEIDialog";
import { CMEI } from "@/hooks/api/supabase-hooks";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCriancasVinculadasCMEI } from "@/hooks/api/delete-validation-hooks";
import { PermissionGate, useCanAccess, PERMISSIONS } from "@/components/admin/PermissionGate";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { PageHeader } from "@/components/common/page-header";

type StatusFilter = "all" | "active" | "inactive";
type TipoUnidadeFilter = "all" | "cmei_creche" | "escola";

export default function CMEIs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: cmeis, isLoading } = useAllCMEIs();
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);
  const deleteMutation = useDeleteCMEI();
  const reactivateMutation = useReactivateCMEI();
  
  // Permission checks
  const canCreate = useCanAccess(PERMISSIONS.CMEIS_CRIAR);
  const canEdit = useCanAccess(PERMISSIONS.CMEIS_EDITAR);
  const canDelete = useCanAccess(PERMISSIONS.CMEIS_EXCLUIR);
  
  const [searchTerm, setSearchTerm] = useState("");
  const { debouncedValue: debouncedSearchTerm, isDebouncing: isSearching } = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const initialTipo = (searchParams.get("tipo") as TipoUnidadeFilter) || "cmei_creche";
  const [tipoUnidadeFilter, setTipoUnidadeFilter] = useState<TipoUnidadeFilter>(
    initialTipo === "escola" || initialTipo === "all" ? initialTipo : "cmei_creche"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCMEI, setSelectedCMEI] = useState<CMEI | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cmeiToDelete, setCmeiToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [cmeiTransferencia, setCmeiTransferencia] = useState<string | undefined>(undefined);

  // Check for linked children when delete dialog opens
  const { data: linkedChildren, isLoading: isLoadingChildren } = useCriancasVinculadasCMEI(cmeiToDelete);
  const hasLinkedChildren = (linkedChildren?.count || 0) > 0;
  const cannotDelete = isLoadingChildren || hasLinkedChildren;

  // Get occupation stats for each unidade
  const { data: occupationStats } = useQuery({
    queryKey: ["cmeis-occupation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select(`
          cmei_id,
          capacidade,
          criancas:criancas(count)
        `)
        .eq("ativo", true);

      if (error) throw error;

      // Aggregate by unidade
      const stats: Record<string, { capacidade: number; ocupadas: number }> = {};
      data.forEach((turma: any) => {
        const cmeiId = turma.cmei_id;
        if (!stats[cmeiId]) {
          stats[cmeiId] = { capacidade: 0, ocupadas: 0 };
        }
        stats[cmeiId].capacidade += turma.capacidade || 0;
        stats[cmeiId].ocupadas += turma.criancas?.[0]?.count || 0;
      });

      return stats;
    },
  });

  const filteredCMEIs = cmeis?.filter((cmei) => {
    const matchesSearch = 
      cmei.nome.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      cmei.bairro?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      cmei.endereco?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && cmei.ativo !== false) ||
      (statusFilter === "inactive" && cmei.ativo === false);

    const tipo = ((cmei as any).tipo_unidade || "cmei_creche") as "cmei_creche" | "escola";
    const matchesTipo =
      tipoUnidadeFilter === "all" ||
      (tipoUnidadeFilter === "cmei_creche" && tipo === "cmei_creche") ||
      (tipoUnidadeFilter === "escola" && tipo === "escola");
    
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const handleEdit = (cmei: CMEI) => {
    setSelectedCMEI(cmei);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedCMEI(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setCmeiToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    // Dupla verificação de segurança
    if (cmeiToDelete && !hasLinkedChildren && !isLoadingChildren) {
      await deleteMutation.mutateAsync(cmeiToDelete);
      setDeleteDialogOpen(false);
      setCmeiToDelete(null);
    }
  };

  const handleReactivate = async (id: string) => {
    await reactivateMutation.mutateAsync(id);
  };

  const handleTransferClick = (cmeiId: string) => {
    setCmeiTransferencia(cmeiId);
    setTransferDialogOpen(true);
    setDeleteDialogOpen(false);
  };

  const getOccupationPercentage = (cmeiId: string) => {
    const stats = occupationStats?.[cmeiId];
    if (!stats || stats.capacidade === 0) return 0;
    return Math.round((stats.ocupadas / stats.capacidade) * 100);
  };

  const getTipoGestao = (cmei: CMEI) => (cmei.tipo_gestao || "municipal") as "municipal" | "privado";

  const renderTipoGestaoBadge = (cmei: CMEI) => {
    const tipo = getTipoGestao(cmei);
    return (
      <Badge
        variant={tipo === "privado" ? "warning" : "info"}
        className="text-[10px] px-1.5 py-0 h-4 shrink-0"
      >
        {tipo === "privado" ? "Privado" : "Municipal"}
      </Badge>
    );
  };

  const getTipoUnidade = (cmei: CMEI) => ((cmei as any).tipo_unidade || "cmei_creche") as "cmei_creche" | "escola";

  const renderTipoUnidadeBadge = (cmei: CMEI) => {
    const tipo = getTipoUnidade(cmei);
    return (
      <Badge
        variant={tipo === "escola" ? "secondary" : "outline"}
        className="text-[10px] px-1.5 py-0 h-4 shrink-0"
      >
        {tipo === "escola" ? "Escola" : "CMEI"}
      </Badge>
    );
  };

  // Count stats
  const activeCount = cmeis?.filter(c => c.ativo !== false).length || 0;
  const inactiveCount = cmeis?.filter(c => c.ativo === false).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title={plural}
          description={
            <div className="space-y-2">
              <div>Gerenciamento de {plural}</div>
              <div className="flex gap-2">
                <Badge variant="default">{activeCount} ativos</Badge>
                {inactiveCount > 0 ? <Badge variant="secondary">{inactiveCount} inativos</Badge> : null}
              </div>
            </div>
          }
          actions={
            canCreate ? (
              <TooltipHelper content="Cadastra uma nova unidade de educação infantil">
                <Button onClick={handleNew} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova {singular}
                </Button>
              </TooltipHelper>
            ) : null
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <StatCard title={`Total de ${plural}`} value={cmeis?.length || 0} subtitle="unidades cadastradas" icon={Building2} accent="primary" index={0} />
          <StatCard title="Ativos" value={activeCount} subtitle="em funcionamento" icon={CheckCircle2} accent="success" index={1} />
          <StatCard title="Inativos" value={inactiveCount} subtitle="desativados" icon={XCircle} accent="muted" index={2} />
        </div>

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
                <div className="relative flex-1 w-full sm:w-64">
                  {isSearching ? (
                    <Spinner className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                  ) : (
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input
                    placeholder="Buscar por nome ou endereço..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={tipoUnidadeFilter}
                  onValueChange={(v) => {
                    const nextValue = v as TipoUnidadeFilter;
                    setTipoUnidadeFilter(nextValue);
                    const next = new URLSearchParams(searchParams);
                    if (nextValue === "cmei_creche") next.delete("tipo");
                    else next.set("tipo", nextValue);
                    setSearchParams(next);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cmei_creche">CMEI</SelectItem>
                    <SelectItem value="escola">Escola</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <TooltipHelper content={`Exibe ${plural} em formato de cards`}>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </TooltipHelper>
                <TooltipHelper content={`Exibe ${plural} em formato de tabela`}>
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipHelper>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCMEIs?.map((cmei) => {
              const occupation = getOccupationPercentage(cmei.id);
              const stats = occupationStats?.[cmei.id];
              const isInactive = cmei.ativo === false;
              
              return (
                <Card key={cmei.id} className={`hover:shadow-lg transition-shadow ${isInactive ? 'opacity-60 border-dashed' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {cmei.nome}
                          {renderTipoUnidadeBadge(cmei)}
                          {renderTipoGestaoBadge(cmei)}
                          {isInactive && (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </CardTitle>
                        {cmei.endereco && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {cmei.endereco}
                          </p>
                        )}
                      </div>
                      {!isInactive && (
                        <Badge variant={occupation > 90 ? "destructive" : occupation > 50 ? "warning" : "success"}>
                          {occupation}% ocupado
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Capacidade
                        </p>
                        <p className="text-2xl font-bold">{(stats?.capacidade || cmei.capacidade_total || 0)} vagas</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ocupadas</p>
                        <p className="text-2xl font-bold">{stats?.ocupadas || 0} alunos</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Disponíveis</p>
                      <p className="text-lg font-semibold">{(stats?.capacidade || cmei.capacidade_total || 0) - (stats?.ocupadas || 0)} vagas</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {canEdit && (
                        <TooltipHelper content="Altera informações como nome, endereço e capacidade">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleEdit(cmei)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Editar
                          </Button>
                        </TooltipHelper>
                      )}
                      <TooltipHelper content={`Visualiza e gerencia as turmas desta ${singular}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/modulo/vagou/admin/turmas?cmei=${cmei.id}`)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Ver Turmas
                        </Button>
                      </TooltipHelper>
                      {isInactive ? (
                        canEdit && (
                          <TooltipHelper content={`Torna a ${singular} ativa novamente para receber matrículas`}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivate(cmei.id)}
                              disabled={reactivateMutation.isPending}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </TooltipHelper>
                        )
                      ) : (
                        canDelete && (
                          <TooltipHelper content={`Exclui a ${singular} permanentemente. Não é possível se houver crianças ou turmas vinculadas`}>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteClick(cmei.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipHelper>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da {singular}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Vagas Ocupadas</TableHead>
                  <TableHead>Vagas Disponíveis</TableHead>
                  <TableHead>Ocupação (%)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCMEIs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhuma {singular} encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCMEIs?.map((cmei) => {
                    const stats = occupationStats?.[cmei.id];
                    const capacidade = stats?.capacidade || cmei.capacidade_total || 0;
                    const ocupadas = stats?.ocupadas || 0;
                    const disponiveis = capacidade - ocupadas;
                    const occupation = getOccupationPercentage(cmei.id);
                    const isInactive = cmei.ativo === false;

                    return (
                      <TableRow key={cmei.id} className={isInactive ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{cmei.nome}</span>
                            {renderTipoUnidadeBadge(cmei)}
                            {renderTipoGestaoBadge(cmei)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isInactive ? "secondary" : "default"}>
                            {isInactive ? "Inativo" : "Ativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>{cmei.endereco || "-"}</TableCell>
                        <TableCell>{capacidade}</TableCell>
                        <TableCell>{ocupadas}</TableCell>
                        <TableCell>{disponiveis}</TableCell>
                        <TableCell>
                          <Badge variant={occupation > 90 ? "destructive" : occupation > 50 ? "warning" : "success"}>
                            {occupation}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <TooltipHelper content="Altera informações como nome, endereço e capacidade">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(cmei)}
                                >
                                  <Pencil className="mr-1 h-3 w-3" />
                                  Editar
                                </Button>
                              </TooltipHelper>
                            )}
                            <TooltipHelper content={`Visualiza e gerencia as turmas desta ${singular}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/modulo/vagou/admin/turmas?cmei=${cmei.id}`)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Ver Turmas
                              </Button>
                            </TooltipHelper>
                            {isInactive ? (
                              canEdit && (
                                <TooltipHelper content={`Torna a ${singular} ativa novamente para receber matrículas`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReactivate(cmei.id)}
                                    disabled={reactivateMutation.isPending}
                                  >
                                    <RotateCcw className="mr-1 h-3 w-3" />
                                    Reativar
                                  </Button>
                                </TooltipHelper>
                              )
                            ) : (
                              canDelete && (
                                <TooltipHelper content={`Exclui a ${singular} permanentemente. Não é possível se houver crianças ou turmas vinculadas`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteClick(cmei.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TooltipHelper>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CMEIDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cmei={selectedCMEI}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {singular}</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir permanentemente a {singular}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {isLoadingChildren && (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Spinner className="h-4 w-4 animate-spin" />
              Verificando crianças vinculadas...
            </div>
          )}

          {!isLoadingChildren && hasLinkedChildren && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Não é possível excluir</AlertTitle>
              <AlertDescription>
                {(linkedChildren?.countMatriculadas || 0) > 0 && (
                  <>
                    <p className="mb-2">
                      Existem {linkedChildren?.countMatriculadas} criança(s) matriculada(s) nesta {singular}:
                    </p>
                    <ul className="list-disc pl-4 text-sm mb-3">
                      {linkedChildren?.criancas?.filter(c => c.tipo === 'atual').slice(0, 5).map((c) => (
                        <li key={c.id}>
                          {c.nome} - {c.status}
                        </li>
                      ))}
                      {(linkedChildren?.countMatriculadas || 0) > 5 && (
                        <li>e mais {(linkedChildren?.countMatriculadas || 0) - 5} criança(s)...</li>
                      )}
                    </ul>
                    <div className="mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTransferClick(cmeiToDelete!)}
                      >
                        <ArrowRightLeft className="mr-1 h-3 w-3" />
                        Transferir Crianças
                      </Button>
                    </div>
                  </>
                )}
                {(linkedChildren?.countTurmas || 0) > 0 && (
                  <p className="text-sm">
                    Existem {linkedChildren?.countTurmas} turma(s) vinculada(s). Exclua as turmas antes de excluir a {singular}.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!isLoadingChildren && !hasLinkedChildren && (linkedChildren?.countPreferencias || 0) > 0 && (
            <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">Atenção</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                <p className="mb-2">
                  Existem {linkedChildren?.countPreferencias} criança(s) na fila de espera com esta {singular} como preferência.
                  Ao excluir, essas preferências serão removidas automaticamente.
                </p>
              </AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={cannotDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoadingChildren ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransferenciaMassaDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        cmeiOrigemId={cmeiTransferencia}
      />
    </AdminLayout>
  );
}
