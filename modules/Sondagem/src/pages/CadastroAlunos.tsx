// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useNavigate } from "react-router-dom";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select";
import { Badge } from "@ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui/tooltip";
import { Plus, Trash2, GraduationCap, Search, User, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@root/hooks/use-toast";
import { useUnifiedCriancas, useCreateCrianca, useDeleteCrianca, useUpdateCrianca, useUnifiedCmeis, useUnifiedTurmas } from "@sondagem/hooks/useLocalCadastros";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";
import { format } from "date-fns";
import { useAuth } from "@root/contexts/AuthContext";
import { CriancaDialog } from "@root/components/admin/CriancaDialog";
import { useCoordinatorSchoolId } from "@sondagem/lib/coordinatorScope";
import { useConfiguracoesSistema } from "@root/hooks/api/configuracoes-hooks";
import { maskCPF, maskPhone, unmask } from "@root/utils/masks";
import { determinarTurmaBaseEscolarComCorte, encontrarTurmaSugerida } from "@root/utils/turma-utils";

export default function CadastroAlunos() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: config } = useConfiguracoesSistema();
  const [filterCmei, setFilterCmei] = useState("");
  const [filterTurma, setFilterTurma] = useState("");
  const [searchNome, setSearchNome] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const coordinatorSchoolId = useCoordinatorSchoolId();
  const effectiveFilterCmei = role === "coordenador"
    ? coordinatorSchoolId || undefined
    : filterCmei || undefined;
  const isCoordinator = role === "coordenador";
  const canManageStudents = role === "admin" || role === "equipe_pedagogica" || role === "coordenador";

  const { data: alunos, isLoading } = useUnifiedCriancas(effectiveFilterCmei);
  const { data: cmeis } = useUnifiedCmeis();
  const { data: turmas } = useUnifiedTurmas(effectiveFilterCmei);
  const createCrianca = useCreateCrianca();
  const updateCrianca = useUpdateCrianca();
  const deleteCrianca = useDeleteCrianca();

  // Fetch sondagem counts per student
  const { data: sondagemCounts } = useQuery({
    queryKey: ["sondagem-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sondagens")
        .select("crianca_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(s => { counts[s.crianca_id] = (counts[s.crianca_id] || 0) + 1; });
      return counts;
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", data_nascimento: "", sexo: "", cmei_id: "", turma_id: "", responsavel: "", responsavel_cpf: "", telefone: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [turmaManual, setTurmaManual] = useState(false);

  useEffect(() => {
    if (coordinatorSchoolId && filterCmei !== coordinatorSchoolId) {
      setFilterCmei(coordinatorSchoolId);
    }
  }, [coordinatorSchoolId, filterCmei]);

  const cmeisVisiveis = useMemo(() => {
    if (coordinatorSchoolId) {
      return (cmeis || []).filter((c) => c.id === coordinatorSchoolId);
    }

    if (isCoordinator) {
      const unique = new Map<string, { id: string; nome: string }>();
      (alunos || []).forEach((aluno) => {
        if (!aluno.cmei_id || !aluno.cmei_nome) return;
        unique.set(aluno.cmei_id, { id: aluno.cmei_id, nome: aluno.cmei_nome });
      });
      return Array.from(unique.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return cmeis || [];
  }, [alunos, cmeis, coordinatorSchoolId, isCoordinator]);

  const formCmei = cmeisVisiveis.find(c => c.id === form.cmei_id);
  const formTurmas = useUnifiedTurmas(form.cmei_id || undefined);
  const formTurma = formTurmas.data?.find(t => t.id === form.turma_id);
  const turmaBaseSugerida = useMemo(() => {
    if (!form.data_nascimento) return "";
    return determinarTurmaBaseEscolarComCorte(form.data_nascimento, {
      data_corte_mes: config?.data_corte_mes,
      data_corte_dia: config?.data_corte_dia,
      idade_minima_meses: config?.idade_minima_meses,
      idade_maxima_anos: config?.idade_maxima_anos,
    });
  }, [config?.data_corte_dia, config?.data_corte_mes, config?.idade_maxima_anos, config?.idade_minima_meses, form.data_nascimento]);
  const turmaSugerida = useMemo(
    () => encontrarTurmaSugerida(formTurmas.data || [], turmaBaseSugerida),
    [formTurmas.data, turmaBaseSugerida]
  );

  useEffect(() => {
    if (!dialogOpen || turmaManual) return;
    setForm((current) => {
      const nextTurmaId = turmaSugerida?.id || "";
      if (current.turma_id === nextTurmaId) return current;
      return { ...current, turma_id: nextTurmaId };
    });
  }, [dialogOpen, turmaManual, turmaSugerida?.id]);

  const turmasVisiveis = useMemo(() => {
    if (!isCoordinator || coordinatorSchoolId) {
      return turmas || [];
    }

    const unique = new Map<string, { id: string; nome: string }>();
    (alunos || [])
      .filter((aluno) => !filterCmei || aluno.cmei_id === filterCmei)
      .forEach((aluno) => {
        if (!aluno.turma_id || !aluno.turma_nome) return;
        unique.set(aluno.turma_id, { id: aluno.turma_id, nome: aluno.turma_nome });
      });

    return Array.from(unique.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, coordinatorSchoolId, filterCmei, isCoordinator, turmas]);

  const filteredAlunos = useMemo(() => {
    return (alunos || [])
      .filter((aluno) => !filterTurma || aluno.turma_id === filterTurma)
      .filter((aluno) => !searchNome || aluno.nome.toLowerCase().includes(searchNome.toLowerCase()));
  }, [alunos, filterTurma, searchNome]);
  const alunoEmEdicao = useMemo(
    () => (editId ? (alunos || []).find((item) => item.id === editId) || null : null),
    [alunos, editId]
  );
  const usarDialogoCompleto = dialogOpen && (!editId || alunoEmEdicao?.fonte !== "local");

  const totalFiltered = filteredAlunos?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedAlunos = filteredAlunos?.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filters change
  const handleSearchChange = (v: string) => { setSearchNome(v); setPage(1); };
  const handleCmeiChange = (v: string) => { setFilterCmei(v === "all" ? "" : v); setFilterTurma(""); setPage(1); };
  const handleTurmaChange = (v: string) => { setFilterTurma(v === "all" ? "" : v); setPage(1); };

  const openCreate = () => {
    setEditId(null);
    setTurmaManual(false);
    setForm({
      nome: "",
      data_nascimento: "",
      sexo: "",
      cmei_id: coordinatorSchoolId || "",
      turma_id: "",
      responsavel: "",
      responsavel_cpf: "",
      telefone: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (aluno: typeof filteredAlunos extends (infer T)[] | undefined ? T : never) => {
    if (!aluno) return;
    setEditId(aluno.id);
    setTurmaManual(!!aluno.turma_id);
    setForm({
      nome: aluno.nome,
      data_nascimento: aluno.data_nascimento || "",
      sexo: aluno.sexo || "",
      cmei_id: aluno.cmei_id || "",
      turma_id: aluno.turma_id || "",
      responsavel: aluno.responsavel || "",
      responsavel_cpf: aluno.responsavel_cpf ? maskCPF(aluno.responsavel_cpf) : "",
      telefone: aluno.telefone ? maskPhone(aluno.telefone) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const cpfDigits = unmask(form.responsavel_cpf);
    const telefoneDigits = unmask(form.telefone);

    if (!form.nome.trim() || !form.data_nascimento || !form.sexo || !form.responsavel.trim() || cpfDigits.length !== 11 || telefoneDigits.length < 10) {
      toast({ title: "Preencha nome, data de nascimento, sexo, responsável, CPF e telefone válidos.", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        nome: form.nome.trim(),
        data_nascimento: form.data_nascimento || undefined,
        sexo: form.sexo || undefined,
        cmei_id: form.cmei_id || undefined,
        cmei_nome: formCmei?.nome || undefined,
        turma_id: form.turma_id || undefined,
        turma_nome: formTurma?.nome || undefined,
        responsavel: form.responsavel.trim() || undefined,
        responsavel_cpf: cpfDigits || undefined,
        telefone: telefoneDigits || undefined,
      };
      if (editId) {
        const alunoAtual = (alunos || []).find((item) => item.id === editId);
        await updateCrianca.mutateAsync({ id: editId, fonte: alunoAtual?.fonte, ...payload });
        toast({ title: "Aluno atualizado com sucesso!" });
      } else {
        await createCrianca.mutateAsync(payload);
        toast({ title: "Aluno cadastrado com sucesso!" });
      }
      setForm({ nome: "", data_nascimento: "", sexo: "", cmei_id: "", turma_id: "", responsavel: "", responsavel_cpf: "", telefone: "" });
      setEditId(null);
      setTurmaManual(false);
      setDialogOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCrianca.mutateAsync(deleteId);
      toast({ title: "Aluno removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
    setDeleteId(null);
  };

  const isPending = createCrianca.isPending || updateCrianca.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Alunos</h2>
          <p className="text-sm text-muted-foreground">
            {isCoordinator ? "Consulta dos alunos da sua instituição vinculada" : "Cadastro de alunos"}
          </p>
        </div>
        <Button onClick={openCreate} disabled={!canManageStudents}>
          <Plus className="h-4 w-4 mr-2" /> Novo Aluno
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterCmei} onValueChange={handleCmeiChange} disabled={isCoordinator}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por Instituição" /></SelectTrigger>
          <SelectContent>
            {!isCoordinator && <SelectItem value="all">Todas as Instituições</SelectItem>}
            {cmeisVisiveis.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTurma} onValueChange={handleTurmaChange}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por Turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Turmas</SelectItem>
            {turmasVisiveis.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-[220px]"
            placeholder="Buscar por nome..."
            value={searchNome}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Alunos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !filteredAlunos?.length ? (
            <p className="text-center text-muted-foreground py-8">Nenhum aluno encontrado</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Sondagens</TableHead>
                  <TableHead>Data Nasc.</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAlunos?.map((a, i) => (
                  <TableRow key={`${a.id}-${i}`}>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={((sondagemCounts?.[a.id]) || 0) > 0 ? "default" : "secondary"}
                              className="text-xs cursor-pointer"
                              onClick={() => navigate(`/modulo/sondar/aluno/${a.id}`, { state: { aluno: a } })}
                            >
                              {sondagemCounts?.[a.id] || 0}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {(sondagemCounts?.[a.id] || 0) === 0
                              ? "Nenhuma sondagem realizada"
                              : `${sondagemCounts?.[a.id]} sondagem(ns) realizada(s)`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{a.data_nascimento ? format(new Date(a.data_nascimento + "T12:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>{a.turma_nome || "—"}</TableCell>
                    <TableCell>{a.cmei_nome || "—"}</TableCell>
                    <TableCell>{a.responsavel || "—"}</TableCell>
                    <TableCell>{a.telefone ? maskPhone(a.telefone) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)} disabled={!canManageStudents} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/modulo/sondar/aluno/${a.id}`, { state: { aluno: a } })} title="Ficha do Aluno">
                          <User className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)} disabled={a.fonte !== "local" || !canManageStudents} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Mostrando {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, totalFiltered)} de {totalFiltered} registros
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  {safePage} / {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
                  Próxima <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <CriancaDialog
        open={usarDialogoCompleto}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditId(null);
            setTurmaManual(false);
          }
        }}
        criancaId={editId && alunoEmEdicao?.fonte !== "local" ? editId : undefined}
        tipoUnidadeOverride="escola"
        schoolMode={{
          initialCmeiId: alunoEmEdicao?.cmei_id || form.cmei_id || effectiveFilterCmei || coordinatorSchoolId || undefined,
          allowedSchools: cmeisVisiveis.map((cmei) => ({ id: cmei.id, nome: cmei.nome })),
          initialTurmaId: alunoEmEdicao?.turma_id || form.turma_id || undefined,
          moduloOrigem: "sondar",
        }}
      />

      <Dialog open={!usarDialogoCompleto && dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
            <DialogDescription>{editId ? "Atualize os dados do aluno na base integrada." : "Cadastre um aluno direto na instituição, usando a base integrada."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Nascimento</label>
              <Input
                type="date"
                value={form.data_nascimento}
                onChange={e => {
                  setTurmaManual(false);
                  setForm(f => ({ ...f, data_nascimento: e.target.value }));
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sexo</label>
              <Select value={form.sexo} onValueChange={v => setForm(f => ({ ...f, sexo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Instituição</label>
              <Select
                value={form.cmei_id}
                onValueChange={v => {
                  setTurmaManual(false);
                  setForm(f => ({ ...f, cmei_id: v, turma_id: "" }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {cmeisVisiveis.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Turma</label>
              <Select
                value={form.turma_id}
                onValueChange={v => {
                  setTurmaManual(true);
                  setForm(f => ({ ...f, turma_id: v }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {formTurmas.data?.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.data_nascimento ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {turmaBaseSugerida
                    ? `Turma base sugerida pelo corte etário: ${turmaBaseSugerida}.`
                    : "Preencha a data de nascimento para sugerir a turma."}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium">Responsável</label>
              <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" />
            </div>
            <div>
              <label className="text-sm font-medium">CPF do Responsável</label>
              <Input
                value={form.responsavel_cpf}
                onChange={e => setForm(f => ({ ...f, responsavel_cpf: maskCPF(e.target.value) }))}
                inputMode="numeric"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone celular/WhatsApp</label>
              <Input
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: maskPhone(e.target.value) }))}
                inputMode="numeric"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Spinner className="h-4 w-4 animate-spin mr-2" /> : null}
              {editId ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Deseja realmente remover este aluno?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
