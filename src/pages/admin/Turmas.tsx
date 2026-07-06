import { useState, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { PermissionGate, useCanAccess, PERMISSIONS } from "@/components/admin/PermissionGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Grid3x3, List, Pencil, Trash2, AlertTriangle, ArrowRightLeft, Filter, Building2, GraduationCap } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { useAllTurmas, useDeleteTurma } from "@/hooks/api/admin-hooks";
import TransferenciaMassaDialog from "@/components/admin/TransferenciaMassaDialog";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import TurmaDialog from "@/components/admin/TurmaDialog";
import { Turma } from "@/hooks/api/supabase-hooks";
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
import { useCriancasVinculadasTurma } from "@/hooks/api/delete-validation-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";
import { PageHeader } from "@/components/common/page-header";

export default function Turmas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cmeiParam = searchParams.get("cmei");
  const initialTipo = searchParams.get("tipo") === "escola" ? "escola" : "cmei_creche";
  const { data: config } = useConfiguracoesSistema();
  const { singular, plural } = getUnidadeLabels(config as any);
  
  // Permission checks
  const canCreate = useCanAccess(PERMISSIONS.TURMAS_CRIAR);
  const canEdit = useCanAccess(PERMISSIONS.TURMAS_EDITAR);
  const canDelete = useCanAccess(PERMISSIONS.TURMAS_EXCLUIR);
  
  const [selectedCMEI, setSelectedCMEI] = useState<string | undefined>(cmeiParam || undefined);
  const [tipoUnidadeFilter, setTipoUnidadeFilter] = useState<"cmei_creche" | "escola">(initialTipo);
  const { data: turmas, isLoading } = useAllTurmas(selectedCMEI);
  const { data: cmeis, isLoading: loadingCMEIs } = useCMEIs({ tipoUnidade: tipoUnidadeFilter });
  const deleteMutation = useDeleteTurma();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [turmaToDelete, setTurmaToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [turmaTransferencia, setTurmaTransferencia] = useState<string | undefined>(undefined);

  // Check for linked children when delete dialog opens
  const { data: linkedChildren, isLoading: isLoadingChildren } = useCriancasVinculadasTurma(turmaToDelete);
  const hasLinkedChildren = (linkedChildren?.count || 0) > 0;
  const cannotDelete = isLoadingChildren || hasLinkedChildren;

  useEffect(() => {
    if (cmeiParam) {
      setSelectedCMEI(cmeiParam);
    }
  }, [cmeiParam]);

  // Get student count for each turma (inclui Convocado e Aguardando Documentação para reserva de vaga)
  const { data: studentsCount } = useQuery({
    queryKey: ["turmas-students-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criancas")
        .select("turma_atual_id")
        .in("status", ["Matriculado", "Matriculada", "Convocado", "Aguardando Documentação"]);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((c) => {
        if (c.turma_atual_id) {
          counts[c.turma_atual_id] = (counts[c.turma_atual_id] || 0) + 1;
        }
      });

      return counts;
    },
  });

  // Total count
  const turmasFiltradas = (turmas || []).filter((t: any) => {
    if (selectedCMEI) return true;
    return ((t.cmeis?.tipo_unidade || "cmei_creche") as "cmei_creche" | "escola") === tipoUnidadeFilter;
  });
  const totalCount = turmasFiltradas.length || 0;
  const totalAlunos = turmasFiltradas.reduce((sum: number, t: any) => sum + (studentsCount?.[t.id] || 0), 0);
  const totalUnidades = new Set(turmasFiltradas.map((t: any) => t.cmeis?.nome || t.cmei_id)).size;

  // Group turmas by CMEI
  const turmasPorCMEI = turmasFiltradas.reduce((acc: Record<string, any[]>, turma: any) => {
    const cmeiNome = turma.cmeis?.nome || `Sem ${singular}`;
    if (!acc[cmeiNome]) {
      acc[cmeiNome] = [];
    }
    acc[cmeiNome].push(turma);
    return acc;
  }, {} as Record<string, any[]>);

  const turmasPorCMEIEntries = Object.entries(turmasPorCMEI || {}).sort(([a], [b]) => {
    if (a === `Sem ${singular}` && b !== `Sem ${singular}`) return 1;
    if (b === `Sem ${singular}` && a !== `Sem ${singular}`) return -1;
    return a.localeCompare(b, "pt-BR");
  });

  const handleEdit = (turma: any) => {
    setSelectedTurma(turma);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedTurma(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTurmaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    // Dupla verificação de segurança
    if (turmaToDelete && !hasLinkedChildren && !isLoadingChildren) {
      await deleteMutation.mutateAsync(turmaToDelete);
      setDeleteDialogOpen(false);
      setTurmaToDelete(null);
    }
  };


  const handleTransferClick = (turmaId: string) => {
    setTurmaTransferencia(turmaId);
    setTransferDialogOpen(true);
  };

  const getOccupationBadge = (ocupadas: number, capacidade: number) => {
    const percentage = capacidade > 0 ? Math.round((ocupadas / capacidade) * 100) : 0;
    return (
      <Badge variant={percentage === 0 ? "outline" : percentage >= 100 ? "destructive" : "default"}>
        {percentage}%
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title="Turmas"
          description={
            <div className="space-y-2">
              <div>Visualização e gerenciamento de turmas por {singular}</div>
              <div className="flex gap-2">
                <Badge variant="default">{totalCount} turmas</Badge>
              </div>
            </div>
          }
          actions={
            <PermissionGate permission={PERMISSIONS.TURMAS_CRIAR}>
              <TooltipHelper content="Cadastra uma nova turma na unidade selecionada">
                <Button onClick={handleNew} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Turma
                </Button>
              </TooltipHelper>
            </PermissionGate>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <StatCard title="Total de Turmas" value={totalCount} subtitle="no filtro atual" icon={Users} accent="primary" index={0} />
          <StatCard title="Alunos" value={totalAlunos} subtitle="matriculados nas turmas" icon={GraduationCap} accent="success" index={1} />
          <StatCard title="Unidades" value={totalUnidades} subtitle="com turmas ativas" icon={Building2} accent="info" index={2} />
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <Select
                  value={tipoUnidadeFilter}
                  onValueChange={(v) => {
                    const nextValue = v as "cmei_creche" | "escola";
                    setTipoUnidadeFilter(nextValue);
                    setSelectedCMEI(undefined);
                    const next = new URLSearchParams(searchParams);
                    next.delete("cmei");
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
                  </SelectContent>
                </Select>
                <Select value={selectedCMEI} onValueChange={setSelectedCMEI}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder={`${plural} (todas)`} />
                  </SelectTrigger>
                  <SelectContent>
                    {cmeis?.map((cmei) => (
                      <SelectItem key={cmei.id} value={cmei.id}>
                        {cmei.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCMEI ? (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCMEI(undefined)}>
                    Limpar
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <TooltipHelper content="Exibe turmas em formato de cards">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </TooltipHelper>
                <TooltipHelper content="Exibe turmas em formato de tabela">
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
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="space-y-6">
            {turmasPorCMEIEntries.map(([cmeiNome, turmasList]) => (
              <Card key={cmeiNome}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <CardTitle>{cmeiNome}</CardTitle>
                  </div>
                  <CardDescription>
                    Lista de turmas ativas nesta unidade.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(turmasList as any[]).map((turma: any) => {
                      const ocupadas = studentsCount?.[turma.id] || 0;
                      const vagasLivres = (turma.capacidade || 0) - ocupadas;
                      
                      return (
                        <Card 
                          key={turma.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => navigate(`/modulo/vagou/admin/turmas/${turma.id}`)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                  {turma.nome}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {ocupadas} / {turma.capacidade} alunos ({turma.turma_base})
                                </p>
                              </div>
                              {getOccupationBadge(ocupadas, turma.capacidade)}
                            </div>
                          </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Ocupação</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Users className="h-4 w-4" />
                                  <Badge variant="outline">
                                    Vagas Livres: {vagasLivres}
                                  </Badge>
                                  <Badge variant={ocupadas === 0 ? "outline" : "default"}>
                                    {ocupadas} Ocupadas
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                {canEdit && (
                                  <TooltipHelper content="Altera informações como nome, capacidade e turno">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(turma)}
                                    >
                                      <Pencil className="mr-1 h-3 w-3" />
                                      Editar
                                    </Button>
                                  </TooltipHelper>
                                )}
                                {ocupadas > 0 && canEdit && (
                                  <TooltipHelper content="Transfere todos os alunos para outra turma">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleTransferClick(turma.id)}
                                    >
                                      <ArrowRightLeft className="mr-1 h-3 w-3" />
                                      Transferir
                                    </Button>
                                  </TooltipHelper>
                                )}
                                {canDelete && (
                                  <TooltipHelper content={ocupadas > 0 ? "Não é possível excluir turmas com crianças vinculadas" : "Exclui permanentemente a turma"}>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={ocupadas > 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (ocupadas === 0) {
                                          handleDeleteClick(turma.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TooltipHelper>
                                )}
                              </div>
                            </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {!turmas || turmas.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedCMEI ? cmeis?.find((c) => c.id === selectedCMEI)?.nome : "Turmas"}
                  </CardTitle>
                  <CardDescription>Nenhuma turma encontrada.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              turmasPorCMEIEntries.map(([cmeiNome, turmasList]) => (
                <Card key={cmeiNome}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <CardTitle className="flex items-center gap-2">
                        {cmeiNome}
                        <Badge variant="secondary">{(turmasList as any[]).length}</Badge>
                      </CardTitle>
                    </div>
                    <CardDescription>Lista de turmas ativas nesta unidade.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Turma</TableHead>
                            <TableHead>Modelo Base</TableHead>
                            <TableHead>Capacidade</TableHead>
                            <TableHead>Ocupação</TableHead>
                            <TableHead>Vagas Livres</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(turmasList as any[]).map((turma: any) => {
                            const ocupadas = studentsCount?.[turma.id] || 0;
                            const vagasLivres = (turma.capacidade || 0) - ocupadas;

                            return (
                              <TableRow
                                key={turma.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => navigate(`/modulo/vagou/admin/turmas/${turma.id}`)}
                              >
                                <TableCell className="font-medium">{turma.nome}</TableCell>
                                <TableCell>{turma.turma_base}</TableCell>
                                <TableCell>{turma.capacidade}</TableCell>
                                <TableCell>
                                  <Badge variant={ocupadas === 0 ? "outline" : "default"}>{ocupadas}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{vagasLivres}</Badge>
                                </TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex justify-end gap-2">
                                    {canEdit && (
                                      <TooltipHelper content="Altera informações como nome, capacidade e turno">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(turma)}>
                                          <Pencil className="mr-1 h-3 w-3" />
                                          Editar
                                        </Button>
                                      </TooltipHelper>
                                    )}
                                    {ocupadas > 0 && canEdit && (
                                      <TooltipHelper content="Transfere todos os alunos para outra turma">
                                        <Button variant="ghost" size="sm" onClick={() => handleTransferClick(turma.id)}>
                                          <ArrowRightLeft className="mr-1 h-3 w-3" />
                                          Transferir
                                        </Button>
                                      </TooltipHelper>
                                    )}
                                    {canDelete && (
                                      <TooltipHelper
                                        content={
                                          ocupadas > 0
                                            ? "Não é possível excluir turmas com crianças vinculadas"
                                            : "Exclui permanentemente a turma"
                                        }
                                      >
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={ocupadas > 0}
                                          className="text-destructive hover:text-destructive disabled:text-muted-foreground"
                                          onClick={() => {
                                            if (ocupadas === 0) handleDeleteClick(turma.id);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </TooltipHelper>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <TurmaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        turma={selectedTurma}
        tipoUnidade={tipoUnidadeFilter}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Turma</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir permanentemente a turma. Esta ação não pode ser desfeita.
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
                <p className="mb-2">
                  Existem {linkedChildren?.count} criança(s) vinculada(s) a esta turma:
                </p>
                <ul className="list-disc pl-4 text-sm">
                  {linkedChildren?.criancas?.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      {c.nome} - {c.status}
                    </li>
                  ))}
                  {(linkedChildren?.count || 0) > 5 && (
                    <li>e mais {(linkedChildren?.count || 0) - 5} criança(s)...</li>
                  )}
                </ul>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      handleTransferClick(turmaToDelete!);
                    }}
                  >
                    <ArrowRightLeft className="mr-1 h-3 w-3" />
                    Transferir Crianças
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={cannotDelete}>
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
        turmaOrigemId={turmaTransferencia}
      />
    </AdminLayout>
  );
}
