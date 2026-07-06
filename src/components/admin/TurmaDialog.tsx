import { useState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useCreateTurma, useUpdateTurma } from "@/hooks/api/admin-hooks";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import { Turma } from "@/hooks/api/supabase-hooks";
import { useTurmasBase } from "@/hooks/api/turmas-base-hooks";
import { supabase } from "@/integrations/supabase/client";

const responsavelTurmaSchema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  turno: z.string().min(1, "Selecione o turno"),
});

const turmaSchema = z.object({
  cmei_id: z.string().min(1, "Selecione uma unidade"),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  turma_base: z.string().min(1, "Selecione a turma base"),
  turno: z.string().optional(),
  capacidade: z.coerce.number().min(1, "Capacidade deve ser maior que 0"),
  ativo: z.boolean(),
  professores: z.array(responsavelTurmaSchema).default([]),
  auxiliares: z.array(responsavelTurmaSchema).default([]),
});

type TurmaFormData = z.infer<typeof turmaSchema>;

interface TurmaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma?: Turma | null;
  tipoUnidade?: "cmei_creche" | "escola";
}

const turnos = ["Matutino", "Vespertino", "Integral"];

export default function TurmaDialog({ open, onOpenChange, turma, tipoUnidade: tipoUnidadeProp }: TurmaDialogProps) {
  const createMutation = useCreateTurma();
  const updateMutation = useUpdateTurma();
  const [searchParams] = useSearchParams();
  const tipoUnidade =
    tipoUnidadeProp ??
    (searchParams.get("tipo") === "escola" ? "escola" : "cmei_creche");
  const { data: cmeis, isLoading: loadingCMEIs, refetch: refetchCmeis } = useCMEIs({ tipoUnidade });
  const { data: turmasBase, isLoading: loadingTurmasBase } = useTurmasBase();
  const isEditing = !!turma;

  useEffect(() => {
    if (!open) return;
    refetchCmeis();
  }, [open, tipoUnidade, refetchCmeis]);

  // Query para buscar crianças ativas na turma (apenas quando editando)
  const { data: criancasAtivas = 0, isLoading: isLoadingCriancas } = useQuery({
    queryKey: ["turma-criancas-ativas", turma?.id],
    queryFn: async () => {
      if (!turma?.id) return 0;
      const { count, error } = await supabase
        .from("criancas")
        .select("*", { count: "exact", head: true })
        .eq("turma_atual_id", turma.id)
        .in("status", ["Matriculado", "Matriculada", "Convocado", "Aguardando Documentação"]);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!turma?.id && open,
  });

  const temCriancasAtivas = criancasAtivas > 0;

  const form = useForm<TurmaFormData>({
    resolver: zodResolver(turmaSchema),
    defaultValues: {
      cmei_id: "",
      nome: "",
      turma_base: "",
      turno: "",
      capacidade: 20,
      ativo: true,
      professores: [],
      auxiliares: [],
    },
  });

  const professoresFieldArray = useFieldArray({
    control: form.control,
    name: "professores",
  });

  const auxiliaresFieldArray = useFieldArray({
    control: form.control,
    name: "auxiliares",
  });

  useEffect(() => {
    if (open) {
      if (turma) {
        form.reset({
          cmei_id: turma.cmei_id || "",
          nome: turma.nome,
          turma_base: turma.turma_base,
          turno: turma.turno || "",
          capacidade: turma.capacidade ?? 20,
          ativo: turma.ativo ?? true,
          professores: (turma.professores as any[]) || [],
          auxiliares: (turma.auxiliares as any[]) || [],
        });
      } else {
        form.reset({
          cmei_id: "",
          nome: "",
          turma_base: "",
          turno: "",
          capacidade: 20,
          ativo: true,
          professores: [],
          auxiliares: [],
        });
      }
    }
  }, [turma, form, open]);

  const onSubmit = async (data: TurmaFormData) => {
    try {
      // Buscar idades da turma base selecionada
      const turmaBaseInfo = turmasBase?.find(tb => tb.nome === data.turma_base);
      
      const turmaData = {
        cmei_id: data.cmei_id,
        nome: data.nome,
        turma_base: data.turma_base,
        turno: data.turno || null,
        capacidade: data.capacidade,
        idade_minima: turmaBaseInfo?.idade_minima_meses || null,
        idade_maxima: turmaBaseInfo?.idade_maxima_meses || null,
        ativo: data.ativo,
        professores: data.professores,
        auxiliares: data.auxiliares,
      };

      if (isEditing && turma) {
        await updateMutation.mutateAsync({ id: turma.id, ...turmaData } as any);
      } else {
        await createMutation.mutateAsync(turmaData as Omit<Turma, "id">);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="turma-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="turma-dialog-title">
            {isEditing ? "Editar Turma" : "Nova Turma"}
          </DialogTitle>
          <DialogDescription id="turma-dialog-description">
            {isEditing ? "Atualize as informações da turma" : "Cadastre uma nova turma"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-4"
            aria-label={isEditing ? "Formulário de edição de turma" : "Formulário de cadastro de turma"}
          >
            <FormField
              control={form.control}
              name="cmei_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="turma-cmei">Unidade *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingCMEIs}
                  >
                    <FormControl>
                      <SelectTrigger 
                        id="turma-cmei"
                        aria-required="true"
                        aria-label="Selecione a unidade da turma"
                        aria-invalid={!!form.formState.errors.cmei_id}
                      >
                        <SelectValue placeholder="Selecione uma unidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent aria-label="Lista de unidades disponíveis">
                      {cmeis?.map((cmei) => (
                        <SelectItem key={cmei.id} value={cmei.id}>
                          {cmei.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="turma_base"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turma Base *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={loadingTurmasBase}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingTurmasBase ? "Carregando..." : "Selecione"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {turmasBase?.map((tb) => (
                          <SelectItem key={tb.id} value={tb.nome}>
                            {tb.nome} {tb.descricao && `(${tb.descricao})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="turno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turno</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {turnos.map((turno) => (
                          <SelectItem key={turno} value={turno}>
                            {turno}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Turma *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Turma A - Matutino" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacidade *</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Professores</div>
                  <div className="text-xs text-muted-foreground">Adicione um ou mais professores vinculados à turma.</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => professoresFieldArray.append({ nome: "", turno: "" })}
                >
                  Adicionar
                </Button>
              </div>

              {professoresFieldArray.fields.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum professor cadastrado.</div>
              ) : (
                <div className="space-y-3">
                  {professoresFieldArray.fields.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_220px_120px] gap-3">
                      <FormField
                        control={form.control}
                        name={`professores.${index}.nome`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do professor" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`professores.${index}.turno`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Turno</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {turnos.map((turno) => (
                                  <SelectItem key={turno} value={turno}>
                                    {turno}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => professoresFieldArray.remove(index)}
                          className="w-full"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Auxiliares</div>
                  <div className="text-xs text-muted-foreground">Adicione um ou mais auxiliares vinculados à turma.</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => auxiliaresFieldArray.append({ nome: "", turno: "" })}
                >
                  Adicionar
                </Button>
              </div>

              {auxiliaresFieldArray.fields.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum auxiliar cadastrado.</div>
              ) : (
                <div className="space-y-3">
                  {auxiliaresFieldArray.fields.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_220px_120px] gap-3">
                      <FormField
                        control={form.control}
                        name={`auxiliares.${index}.nome`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do auxiliar" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`auxiliares.${index}.turno`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Turno</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {turnos.map((turno) => (
                                  <SelectItem key={turno} value={turno}>
                                    {turno}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => auxiliaresFieldArray.remove(index)}
                          className="w-full"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativa</FormLabel>
                    {isEditing && temCriancasAtivas && field.value && (
                      <p className="text-sm text-muted-foreground">
                        Não é possível inativar com crianças vinculadas
                      </p>
                    )}
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isEditing && temCriancasAtivas && field.value}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isEditing && temCriancasAtivas && form.watch("ativo") && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta turma possui {criancasAtivas} criança(s) convocada(s) ou matriculada(s). 
                  Transfira as crianças antes de inativar a turma.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                aria-label="Cancelar e fechar o formulário"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                aria-label={isEditing ? "Salvar alterações da turma" : "Criar nova turma"}
                aria-busy={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : (isEditing ? "Atualizar" : "Criar")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
