import { useEffect, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock } from "lucide-react";
import { maskPhone, maskCEP } from "@/utils/masks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCMEIs } from "@/hooks/api/supabase-hooks";
import { DynamicFormField, deveRenderizarDinamicamente } from "@/components/inscricao/DynamicFormField";
import { useCamposInscricao, useSaveValoresCamposCustom, useValoresCamposCustom } from "@/hooks/api/campos-inscricao-hooks";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const editSchema = z.object({
  responsavel_nome: z.string().min(3, "Nome do responsável é obrigatório"),
  responsavel_email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  responsavel_telefone: z.string().min(10, "Telefone é obrigatório"),
  responsavel_celular: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cmei1_preferencia: z.string().optional(),
  cmei2_preferencia: z.string().optional(),
  aceita_qualquer_cmei: z.boolean().default(false),
}).passthrough(); // Allow dynamic fields

type EditFormData = z.infer<typeof editSchema>;

interface EditarCriancaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId: string | undefined;
}

export function EditarCriancaDialog({ open, onOpenChange, criancaId }: EditarCriancaDialogProps) {
  const queryClient = useQueryClient();
  const { data: cmeis } = useCMEIs();
  const { data: config } = useConfiguracoesPublicas();
  const { singular } = getUnidadeLabels(config as any);
  const saveValoresCustom = useSaveValoresCamposCustom();

  // Buscar campos dinâmicos por seção (apenas editáveis após inscrição)
  const { data: camposResponsavel } = useCamposInscricao("responsavel");
  const { data: camposEndereco } = useCamposInscricao("endereco");

  // Buscar valores dos campos customizados
  const { data: valoresCustom } = useValoresCamposCustom(criancaId || "");

  // Filtrar campos dinâmicos editáveis após inscrição
  const camposDinamicosResponsavel = useMemo(() => 
    camposResponsavel?.filter(c => 
      deveRenderizarDinamicamente(c.nome_campo) && 
      !c.campo_sistema && 
      c.editavel_apos_inscricao
    ) || [],
    [camposResponsavel]
  );
  const camposDinamicosEndereco = useMemo(() => 
    camposEndereco?.filter(c => 
      deveRenderizarDinamicamente(c.nome_campo) && 
      !c.campo_sistema && 
      c.editavel_apos_inscricao
    ) || [],
    [camposEndereco]
  );

  const todosOsCamposCustom = useMemo(() => [
    ...camposDinamicosResponsavel,
    ...camposDinamicosEndereco,
  ], [camposDinamicosResponsavel, camposDinamicosEndereco]);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      responsavel_nome: "",
      responsavel_email: "",
      responsavel_telefone: "",
      responsavel_celular: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      cmei1_preferencia: "",
      cmei2_preferencia: "",
      aceita_qualquer_cmei: false,
    },
  });

  const watchedFields = form.watch();

  // Carregar dados da criança
  const { data: crianca, isLoading } = useQuery({
    queryKey: ["crianca-editar", criancaId],
    queryFn: async () => {
      if (!criancaId) return null;
      const { data, error } = await supabase
        .from("criancas")
        .select("*")
        .eq("id", criancaId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!criancaId && open,
  });

  // Preencher formulário quando carregar dados
  useEffect(() => {
    if (crianca) {
      const formValues: any = {
        responsavel_nome: crianca.responsavel_nome || "",
        responsavel_email: crianca.responsavel_email || "",
        responsavel_telefone: crianca.responsavel_telefone || "",
        responsavel_celular: crianca.responsavel_celular || "",
        cep: crianca.cep || "",
        logradouro: crianca.logradouro || "",
        numero: crianca.numero || "",
        complemento: crianca.complemento || "",
        bairro: crianca.bairro || "",
        cidade: crianca.cidade || "",
        estado: crianca.estado || "",
        cmei1_preferencia: crianca.cmei1_preferencia || "",
        cmei2_preferencia: crianca.cmei2_preferencia || "",
        aceita_qualquer_cmei: crianca.aceita_qualquer_cmei || false,
      };

      // Adicionar valores dos campos customizados
      if (valoresCustom) {
        valoresCustom.forEach(vc => {
          const campo = todosOsCamposCustom.find(c => c.id === vc.campo_id);
          if (campo) {
            formValues[campo.nome_campo] = vc.valor;
          }
        });
      }

      form.reset(formValues);
    }
  }, [crianca, valoresCustom, todosOsCamposCustom, form]);

  // Mutation para atualizar
  const updateMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      if (!criancaId) throw new Error("ID da criança não encontrado");
      
      const { error } = await supabase
        .from("criancas")
        .update({
          responsavel_nome: data.responsavel_nome,
          responsavel_email: data.responsavel_email || null,
          responsavel_telefone: data.responsavel_telefone.replace(/\D/g, ""),
          responsavel_celular: data.responsavel_celular?.replace(/\D/g, "") || null,
          cep: data.cep?.replace(/\D/g, "") || null,
          logradouro: data.logradouro || null,
          numero: data.numero || null,
          complemento: data.complemento || null,
          bairro: data.bairro || null,
          cidade: data.cidade || null,
          estado: data.estado || null,
          cmei1_preferencia: data.cmei1_preferencia || null,
          cmei2_preferencia: data.cmei2_preferencia || null,
          aceita_qualquer_cmei: data.aceita_qualquer_cmei,
        })
        .eq("id", criancaId);
      
      if (error) throw error;

      // Salvar valores dos campos customizados
      if (todosOsCamposCustom.length > 0) {
        const valoresCustom: Record<string, string> = {};
        todosOsCamposCustom.forEach(campo => {
          const valor = (data as any)[campo.nome_campo];
          if (valor !== undefined && valor !== null && valor !== "") {
            valoresCustom[campo.id] = String(valor);
          }
        });
        
        if (Object.keys(valoresCustom).length > 0) {
          await saveValoresCustom.mutateAsync({ 
            criancaId, 
            valores: valoresCustom 
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["crianca-editar", criancaId] });
      queryClient.invalidateQueries({ queryKey: ["valores-campos-custom"] });
      toast.success("Dados atualizados com sucesso!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const onSubmit = (data: EditFormData) => {
    updateMutation.mutate(data);
  };

  if (!criancaId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Editar Informações</DialogTitle>
          <DialogDescription>
            Atualize os dados de contato e preferências. Dados da criança não podem ser alterados.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[65vh] pr-2 sm:pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
              {crianca && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">Dados da Criança (não editável)</h3>
                  <p className="font-medium">{crianca.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Nascimento: {new Date(crianca.data_nascimento).toLocaleDateString("pt-BR")} • 
                    Sexo: {crianca.sexo}
                  </p>
                </div>
              )}

              {/* Dados do Responsável */}
              <div className="space-y-4">
                <h3 className="font-medium">Dados do Responsável</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="responsavel_nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsavel_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsavel_telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone Principal *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                            maxLength={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsavel_celular"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                            maxLength={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Campos dinâmicos da seção Responsável */}
                {camposDinamicosResponsavel.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {camposDinamicosResponsavel.map((campo) => (
                      <DynamicFormField
                        key={campo.id}
                        campo={campo}
                        register={form.register}
                        setValue={form.setValue}
                        errors={form.formState.errors}
                        value={watchedFields[campo.nome_campo as keyof typeof watchedFields]}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="font-medium">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={9} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="logradouro"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Campos dinâmicos da seção Endereço */}
                {camposDinamicosEndereco.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {camposDinamicosEndereco.map((campo) => (
                      <DynamicFormField
                        key={campo.id}
                        campo={campo}
                        register={form.register}
                        setValue={form.setValue}
                        errors={form.formState.errors}
                        value={watchedFields[campo.nome_campo as keyof typeof watchedFields]}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Preferências */}
              <div className="space-y-4">
                <h3 className="font-medium">Preferências de {singular}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cmei1_preferencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>1ª Preferência</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={`Selecione ${singular}`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {cmeis?.map((cmei) => (
                              <SelectItem key={cmei.id} value={cmei.id}>
                                {cmei.nome}
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
                    name="cmei2_preferencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>2ª Preferência</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={`Selecione ${singular}`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {cmeis?.map((cmei) => (
                              <SelectItem key={cmei.id} value={cmei.id}>
                                {cmei.nome}
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
                  name="aceita_qualquer_cmei"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Aceita vaga em qualquer {singular}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}



