import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Users, BookOpen, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TurmaDialog from "@/components/admin/TurmaDialog";
import { useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDeleteTurma } from "@/hooks/api/admin-hooks";
import { useCriancasVinculadasTurma } from "@/hooks/api/delete-validation-hooks";
import SexoIcon from "@/components/common/SexoIcon";
import { useAuth } from "@/contexts/AuthContext";

export default function TurmaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteMutation = useDeleteTurma();
  const { hasRole, isAdmin } = useAuth();
  const isDiretor = hasRole("diretor_cmei");
  const canManage = isAdmin() && !isDiretor;
  
  // Check for linked children
  const { data: linkedChildren } = useCriancasVinculadasTurma(id || null);
  const hasLinkedChildren = (linkedChildren?.count || 0) > 0;

  const { data: turma, isLoading } = useQuery({
    queryKey: ["turma-details", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select(`
          *,
          cmei:cmeis(nome, endereco, bairro)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: alunos, isLoading: loadingAlunos } = useQuery({
    queryKey: ["turma-alunos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criancas")
        .select("id, nome, status, data_nascimento, sexo, responsavel_nome, responsavel_cpf, responsavel_telefone")
        .eq("turma_atual_id", id)
        .in("status", ["Matriculado", "Matriculada", "Convocado", "Aguardando Documentação"])
        .order("nome", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const calcularIdade = (dataNascimento: string) => {
    const meses = differenceInMonths(new Date(), new Date(dataNascimento));
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;

    if (anos === 0) {
      return `${meses} mês(es)`;
    } else {
      return `${anos} ano(s)${mesesRestantes > 0 ? `, ${mesesRestantes} mês(es)` : ""}`;
    }
  };

  const handleDelete = async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate("/modulo/vagou/admin/turmas");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!turma) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Turma não encontrada.</p>
          <Button onClick={() => navigate("/modulo/vagou/admin/turmas")} className="mt-4">
            Voltar para Turmas
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const vagasOcupadas = alunos?.length || 0;
  const vagasLivres = (turma.capacidade || 0) - vagasOcupadas;
  const percentualOcupacao = turma.capacidade > 0 ? Math.round((vagasOcupadas / turma.capacidade) * 100) : 0;
  const professores = Array.isArray((turma as any).professores) ? ((turma as any).professores as any[]) : [];
  const auxiliares = Array.isArray((turma as any).auxiliares) ? ((turma as any).auxiliares as any[]) : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/modulo/vagou/admin/turmas")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{turma.nome}</h1>
              <p className="text-muted-foreground">{turma.cmei?.nome}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <>
                <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Turma
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={hasLinkedChildren}
                  title={hasLinkedChildren ? "Existem crianças vinculadas a esta turma" : "Excluir turma"}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Capacidade</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{turma.capacidade} vagas</div>
              <p className="text-xs text-muted-foreground">Sala {turma.nome.split("-")[1]?.trim() || "A"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupação</CardTitle>
              <Badge variant={percentualOcupacao === 0 ? "outline" : "default"}>
                {percentualOcupacao}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vagasOcupadas} alunos</div>
              <p className="text-xs text-muted-foreground">Vagas disponíveis: {vagasLivres}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelo Base</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{turma.turma_base}</div>
              <p className="text-xs text-muted-foreground">Faixa etária correspondente</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Responsáveis da Turma</CardTitle>
            <CardDescription>Professores e auxiliares vinculados à turma (com turno).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium">Professores</div>
                {professores.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhum professor cadastrado.</div>
                ) : (
                  <div className="space-y-2">
                    {professores.map((p, idx) => (
                      <div key={`${p?.nome || "prof"}-${idx}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                        <div className="text-sm">{p?.nome || "-"}</div>
                        <Badge variant="outline">{p?.turno || "-"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Auxiliares</div>
                {auxiliares.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhum auxiliar cadastrado.</div>
                ) : (
                  <div className="space-y-2">
                    {auxiliares.map((a, idx) => (
                      <div key={`${a?.nome || "aux"}-${idx}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                        <div className="text-sm">{a?.nome || "-"}</div>
                        <Badge variant="outline">{a?.turno || "-"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Alunos ({vagasOcupadas})</CardTitle>
            <CardDescription>
              Alunos atualmente matriculados ou convocados para esta turma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAlunos ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : alunos && alunos.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criança</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Data Nasc.</TableHead>
                      <TableHead className="w-[56px] text-center">Sexo</TableHead>
                      <TableHead>CMEI</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alunos.map((aluno) => (
                      <TableRow key={aluno.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{aluno.nome}</p>
                            <p className="text-xs text-muted-foreground">{calcularIdade(aluno.data_nascimento)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{aluno.responsavel_nome}</div>
                            <div className="text-xs text-muted-foreground">{aluno.responsavel_cpf || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {aluno.data_nascimento
                              ? format(new Date(aluno.data_nascimento), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <SexoIcon sexo={aluno.sexo} />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{turma.cmei?.nome || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{turma.nome}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{turma.turno || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              aluno.status === "Matriculado" || aluno.status === "Matriculada"
                                ? "default"
                                : aluno.status === "Convocado"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {aluno.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/modulo/vagou/admin/criancas/${aluno.id}`)}>
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum aluno matriculado ou convocado para esta turma.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <>
          <TurmaDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            turma={turma as any}
            tipoUnidade={((turma as any)?.cmeis?.tipo_unidade || "cmei_creche") === "escola" ? "escola" : "cmei_creche"}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá desativar a turma. Você poderá reativá-la posteriormente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              {hasLinkedChildren && (
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
                    <p className="mt-2 text-sm">
                      Transfira ou remova as crianças antes de excluir a turma.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
              
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={hasLinkedChildren}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AdminLayout>
  );
}

