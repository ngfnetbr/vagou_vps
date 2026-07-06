import { useState, useEffect, useMemo, useRef } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Check, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { maskCPF, maskPhone, maskCEP } from "@/utils/masks";
import { validarCPF } from "@/utils/validations/inscricao";
import { DynamicFormField, deveRenderizarDinamicamente } from "@/components/inscricao/DynamicFormField";
import { useCamposInscricao, useSaveValoresCamposCustom, useValoresCamposCustom } from "@/hooks/api/campos-inscricao-hooks";
import { useZonasAtendimentoAtivas } from "@/hooks/api/zonas-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const parseISODateOnly = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getTodayISODate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isNotFutureDate = (value: string): boolean => {
  const date = parseISODateOnly(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
};

const editSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  data_nascimento: z
    .string()
    .min(1, "Data de nascimento é obrigatória")
    .refine(isNotFutureDate, "Data de nascimento não pode ser futura"),
  cpf_crianca: z.string().optional().refine((val) => !val || validarCPF(val), "CPF inválido"),
  sexo: z.enum(["Masculino", "Feminino"]),
  responsavel_nome: z.string().min(3, "Nome do responsável é obrigatório"),
  responsavel_cpf: z.string().min(11, "CPF do responsável é obrigatório").refine((val) => validarCPF(val), "CPF inválido"),
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
  cmei3_preferencia: z.string().optional(),
  aceita_qualquer_cmei: z.boolean().default(false),
  programas_sociais: z.boolean().default(false),
  zona_atendimento_id: z.string().optional(),
}).passthrough(); // Allow dynamic fields

type EditFormData = z.infer<typeof editSchema>;

interface CriancaEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId: string;
}

export function CriancaEditDialog({ open, onOpenChange, criancaId }: CriancaEditDialogProps) {
  const queryClient = useQueryClient();
  const saveValoresCustom = useSaveValoresCamposCustom();
  const maxDataNascimento = getTodayISODate();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  
  // Estados para busca de CPF
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [cpfPreenchido, setCpfPreenchido] = useState(false);
  const cpfOriginal = useRef<string>("");

  // Buscar campos dinâmicos por seção
  const { data: camposCrianca } = useCamposInscricao("crianca");
  const { data: camposResponsavel } = useCamposInscricao("responsavel");
  const { data: camposEndereco } = useCamposInscricao("endereco");
  const { data: camposPreferencias } = useCamposInscricao("preferencias");
  const { data: camposObservacoes } = useCamposInscricao("observacoes");

  // Buscar valores dos campos customizados
  const { data: valoresCustom } = useValoresCamposCustom(criancaId);

  // Filtrar campos dinâmicos
  const camposDinamicosCrianca = useMemo(() => 
    camposCrianca?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema) || [],
    [camposCrianca]
  );
  const camposDinamicosResponsavel = useMemo(() => 
    camposResponsavel?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema) || [],
    [camposResponsavel]
  );
  const camposDinamicosEndereco = useMemo(() => 
    camposEndereco?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema) || [],
    [camposEndereco]
  );
  const camposDinamicosPreferencias = useMemo(() => 
    camposPreferencias?.filter(c => deveRenderizarDinamicamente(c.nome_campo) && !c.campo_sistema) || [],
    [camposPreferencias]
  );
  const camposDinamicosObservacoes = useMemo(() => 
    camposObservacoes?.filter(c => !c.campo_sistema) || [],
    [camposObservacoes]
  );

  const todosOsCamposCustom = useMemo(() => [
    ...camposDinamicosCrianca,
    ...camposDinamicosResponsavel,
    ...camposDinamicosEndereco,
    ...camposDinamicosPreferencias,
    ...camposDinamicosObservacoes,
  ], [camposDinamicosCrianca, camposDinamicosResponsavel, camposDinamicosEndereco, camposDinamicosPreferencias, camposDinamicosObservacoes]);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nome: "",
      data_nascimento: "",
      cpf_crianca: "",
      sexo: "Masculino",
      responsavel_nome: "",
      responsavel_cpf: "",
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
      cmei3_preferencia: "",
      aceita_qualquer_cmei: false,
      programas_sociais: false,
      zona_atendimento_id: "",
    },
  });

  const watchedFields = form.watch();

  // Busca automática de dados do responsável pelo CPF
  const buscarResponsavelPorCpf = async (cpfValue: string) => {
    const cpfLimpo = cpfValue.replace(/\D/g, "");
    // Não busca se for o CPF original da criança sendo editada
    if (cpfLimpo.length !== 11 || cpfLimpo === cpfOriginal.current) return;
    
    setBuscandoCpf(true);
    try {
      const { data: responsavelExistente } = await supabase
        .from("criancas")
        .select("responsavel_nome, responsavel_telefone, responsavel_celular, responsavel_email, cep, logradouro, numero, complemento, bairro, cidade, estado")
        .eq("responsavel_cpf", cpfLimpo)
        .limit(1)
        .maybeSingle();
      
      if (responsavelExistente) {
        form.setValue("responsavel_nome", responsavelExistente.responsavel_nome || "");
        form.setValue("responsavel_telefone", responsavelExistente.responsavel_telefone || "");
        form.setValue("responsavel_celular", responsavelExistente.responsavel_celular || "");
        form.setValue("responsavel_email", responsavelExistente.responsavel_email || "");
        
        // Preencher endereço se existir
        if (responsavelExistente.cep) {
          form.setValue("cep", responsavelExistente.cep);
          form.setValue("logradouro", responsavelExistente.logradouro || "");
          form.setValue("numero", responsavelExistente.numero || "");
          form.setValue("complemento", responsavelExistente.complemento || "");
          form.setValue("bairro", responsavelExistente.bairro || "");
          form.setValue("cidade", responsavelExistente.cidade || "");
          form.setValue("estado", responsavelExistente.estado || "");
        }
        
        setCpfPreenchido(true);
        toast.success("Dados do responsável preenchidos automaticamente!");
      } else {
        setCpfPreenchido(false);
      }
    } catch (error) {
      console.error("Erro ao buscar responsável:", error);
    } finally {
      setBuscandoCpf(false);
    }
  };

  // Buscar CMEIs
  const { data: cmeis } = useQuery({
    queryKey: ["cmeis-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cmeis")
        .select("id, nome")
        .eq("ativo", true)
        .eq("tipo_unidade", "cmei_creche")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: configSistema } = useQuery({
    queryKey: ["configuracoes-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes_sistema").select("*").limit(1).single();
      if (error) throw error;
      return data as any;
    },
  });
  const preferenciasCmeiQtd = (configSistema as any)?.preferencias_cmei_qtd ?? 2;
  const prioridadeZonaHabilitada = (configSistema as any)?.prioridade_zona_habilitada ?? false;
  const { data: zonasAtivas } = useZonasAtendimentoAtivas();

  // Buscar dados da criança
  const { data: crianca, isLoading: loadingCrianca } = useQuery({
    queryKey: ["crianca-edit", criancaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criancas")
        .select("*")
        .eq("id", criancaId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!criancaId,
  });

  // Preencher formulário quando carregar dados
  useEffect(() => {
    if (crianca) {
      // Salvar o CPF original para não buscar quando é o mesmo
      cpfOriginal.current = crianca.responsavel_cpf?.replace(/\D/g, "") || "";
      setCpfPreenchido(false);
      
      const formValues: Partial<Record<string, unknown>> = {
        nome: crianca.nome || "",
        data_nascimento: crianca.data_nascimento || "",
        cpf_crianca: crianca.cpf_crianca || "",
        sexo: crianca.sexo as "Masculino" | "Feminino",
        responsavel_nome: crianca.responsavel_nome || "",
        responsavel_cpf: crianca.responsavel_cpf || "",
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
        cmei3_preferencia: (crianca as any).cmei3_preferencia || "",
        aceita_qualquer_cmei: crianca.aceita_qualquer_cmei || false,
        programas_sociais: crianca.programas_sociais || false,
        zona_atendimento_id: (crianca as any).zona_atendimento_id || "",
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

  const updateMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      const updateData = {
        nome: data.nome,
        data_nascimento: data.data_nascimento,
        cpf_crianca: data.cpf_crianca?.replace(/\D/g, "") || null,
        sexo: data.sexo,
        responsavel_nome: data.responsavel_nome,
        responsavel_cpf: data.responsavel_cpf.replace(/\D/g, ""),
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
        cmei3_preferencia: data.cmei3_preferencia || null,
        aceita_qualquer_cmei: data.aceita_qualquer_cmei,
        programas_sociais: data.programas_sociais,
        zona_atendimento_id: prioridadeZonaHabilitada ? (data.zona_atendimento_id || null) : null,
        prioridade: (data.programas_sociais ? "Social" : "Geral") as "Social" | "Geral",
      };

      const { error } = await supabase
        .from("criancas")
        .update(updateData)
        .eq("id", criancaId);

      if (error) throw error;

      // Salvar valores dos campos customizados
      if (todosOsCamposCustom.length > 0) {
        const valoresCustom: Record<string, string> = {};
        todosOsCamposCustom.forEach(campo => {
          const dataRecord = data as unknown as Record<string, unknown>;
          const valor = dataRecord[campo.nome_campo];
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

      // Registrar no histórico
      await supabase.from("historico").insert({
        crianca_id: criancaId,
        acao: "Dados Atualizados",
        descricao: "Dados cadastrais atualizados pelo administrador",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crianca"] });
      queryClient.invalidateQueries({ queryKey: ["crianca-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["crianca-matricula-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["valores-campos-custom"] });
      toast.success("Dados atualizados com sucesso!");
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao atualizar dados";
      toast.error(`Erro ao atualizar dados: ${message}`);
    },
  });

  const onSubmit = (data: EditFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Dados da Criança</DialogTitle>
          <DialogDescription>
            Atualize as informações cadastrais da criança e do responsável.
          </DialogDescription>
        </DialogHeader>

        {loadingCrianca ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Dados da Criança */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Dados da Criança</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cpf_crianca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF da Criança (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={maskCPF(field.value || "")}
                            onChange={(e) => field.onChange(maskCPF(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="data_nascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} max={maxDataNascimento} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sexo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sexo</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Masculino" id="masc" />
                              <label htmlFor="masc">Masculino</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Feminino" id="fem" />
                              <label htmlFor="fem">Feminino</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="programas_sociais"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Participa de Programas Sociais</FormLabel>
                    </FormItem>
                  )}
                />

                {/* Campos dinâmicos da seção Criança */}
                {camposDinamicosCrianca.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {camposDinamicosCrianca.map((campo) => (
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

              {/* Dados do Responsável */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Dados do Responsável</h3>
                
                {cpfPreenchido && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Os dados do responsável estão vinculados a outros cadastros e não podem ser editados aqui.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="responsavel_cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          CPF do Responsável
                          {buscandoCpf && <Spinner className="h-3 w-3 animate-spin" />}
                          {cpfPreenchido && <Badge variant="outline" className="text-xs text-amber-600"><Lock className="h-3 w-3 mr-1" />Bloqueado</Badge>}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              value={maskCPF(field.value)}
                              onChange={(e) => {
                                const masked = maskCPF(e.target.value);
                                field.onChange(masked);
                                const cpfLimpo = masked.replace(/\D/g, "");
                                if (cpfLimpo.length === 11) {
                                  buscarResponsavelPorCpf(masked);
                                }
                              }}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsavel_nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Responsável</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                    control={form.control}
                    name="responsavel_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            {...field} 
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="responsavel_telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={maskPhone(field.value)}
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
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
                            value={maskPhone(field.value || "")}
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Campos dinâmicos da seção Responsável */}
                {camposDinamicosResponsavel.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
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
                <h3 className="font-semibold text-lg">Endereço</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logradouro"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
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
                          <Input 
                            {...field} 
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
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
                          <Input 
                            {...field} 
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
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
                          <Input 
                            {...field} 
                            disabled={cpfPreenchido}
                            className={cpfPreenchido ? "bg-muted/50 cursor-not-allowed" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {prioridadeZonaHabilitada && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zona_atendimento_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zona de atendimento</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a zona" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              {(zonasAtivas || []).map((z) => (
                                <SelectItem key={z.id} value={z.id}>
                                  {z.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Campos dinâmicos da seção Endereço */}
                {camposDinamicosEndereco.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
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
                <h3 className="font-semibold text-lg">Preferências de {singular}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cmei1_preferencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>1ª Opção de {singular}</FormLabel>
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
                        <FormLabel>2ª Opção de {singular}</FormLabel>
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

                {preferenciasCmeiQtd === 3 && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cmei3_preferencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>3ª Opção de {singular}</FormLabel>
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
                              {cmeis
                                ?.filter((cmei) => cmei.id !== watchedFields.cmei1_preferencia && cmei.id !== watchedFields.cmei2_preferencia)
                                .map((cmei) => (
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
                )}

                {camposDinamicosPreferencias.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {camposDinamicosPreferencias.map((campo) => (
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

              {/* Campos dinâmicos da seção Observações */}
              {camposDinamicosObservacoes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Observações</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {camposDinamicosObservacoes.map((campo) => (
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
                </div>
              )}

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
        )}
      </DialogContent>
    </Dialog>
  );
}



