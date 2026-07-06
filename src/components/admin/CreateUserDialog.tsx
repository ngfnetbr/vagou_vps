import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, RefreshCw, UserPlus } from "lucide-react";
import { Spinner as LoadingSpinner } from "@/components/common/Spinner";
import { useCreateUser, AppRole, roleLabels } from "@/hooks/api/usuarios-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { maskCPF, maskPhone } from "@/utils/masks";
import { consultarCpf } from "@/utils/consultar-cpf";
import { useAllCMEIs } from "@/hooks/api/admin-hooks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

import { validarCPF } from "@/utils/validations/inscricao";

const createUserSchema = z
  .object({
    nome_completo: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("E-mail inválido"),
    cpf: z.string().optional().refine((val) => !val || validarCPF(val), "CPF inválido"),
    telefone: z.string().optional(),
    sexo: z.string().optional(),
    data_nascimento: z.string().optional(),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    role: z.string().default("responsavel"),
    cmei_id: z.string().optional(),
    modules: z.array(z.enum(["vagou", "sam", "sondagem"])).min(1, "Selecione pelo menos um módulo"),
  })
  .superRefine((data, ctx) => {
    if (data.role === "diretor_cmei" && !data.cmei_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cmei_id"],
        message: "Selecione a unidade vinculada ao Diretor",
      });
    }
    if (data.role === "diretor_cmei" && !data.modules.includes("vagou")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modules"],
        message: "O papel Diretor exige acesso ao módulo VAGOU",
      });
    }
    if (data.role === "diretor_cmei" && (data.modules.includes("sam") || data.modules.includes("sondagem"))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modules"],
        message: "O papel Diretor deve ter acesso apenas ao módulo VAGOU",
      });
    }
    if (data.role === "school_coord" && !data.cmei_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cmei_id"],
        message: "Selecione a instituição vinculada ao Portal da Escola",
      });
    }
    if (data.role === "school_coord" && !data.modules.includes("sam")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modules"],
        message: "O Portal da Escola exige acesso ao módulo SAM",
      });
    }
    if (data.role === "school_coord" && (data.modules.includes("vagou") || data.modules.includes("sondagem"))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modules"],
        message: "O Portal da Escola deve ter acesso apenas ao módulo SAM",
      });
    }
  });

type CreateUserForm = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isConsultandoCpf, setIsConsultandoCpf] = useState(false);
  const createUser = useCreateUser();
  const { hasRole } = useAuth();
  const { data: cmeis } = useAllCMEIs();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);
  const samHabilitado = config?.habilitar_sam ?? true;
  const sondagemHabilitada = config?.habilitar_sondagem ?? true;
  
  const isSuperAdmin = hasRole("superadmin");
  const isAdmin = hasRole("admin");

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      cpf: "",
      telefone: "",
      sexo: "",
      data_nascimento: "",
      password: "",
      role: "responsavel",
      cmei_id: "",
      modules: ["vagou"],
    },
  });

  const handleConsultarCpf = async (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return;
    setIsConsultandoCpf(true);
    try {
      const res = await consultarCpf(cpf, "responsavel");
      if (res.found) {
        if (res.nome && !form.getValues("nome_completo")) {
          form.setValue("nome_completo", res.nome, { shouldValidate: true });
        }
        if (res.data_nascimento && !form.getValues("data_nascimento")) {
          form.setValue("data_nascimento", res.data_nascimento, { shouldValidate: true });
        }
      }
    } finally {
      setIsConsultandoCpf(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("password", password);
  };

  const onSubmit = async (data: CreateUserForm) => {
    const filteredModules = (data.modules || []).filter((m) => {
      if (m === "sam") return samHabilitado;
      if (m === "sondagem") return sondagemHabilitada;
      return true;
    });
    const roleModuleOverride =
      data.role === "diretor_cmei" ? (["vagou"] as const) : data.role === "school_coord" ? (["sam"] as const) : null;
    const safeModules = roleModuleOverride
      ? Array.from(roleModuleOverride)
      : filteredModules.length > 0
        ? filteredModules
        : ["vagou"];

    const success = await createUser.mutateAsync({
      email: data.email,
      password: data.password,
      nome_completo: data.nome_completo,
      cpf: data.cpf || undefined,
      telefone: data.telefone || undefined,
      sexo: data.sexo || undefined,
      data_nascimento: data.data_nascimento || undefined,
      role: data.role as AppRole,
      cmei_id: data.role === "diretor_cmei" || data.role === "school_coord" ? (data.cmei_id || undefined) : undefined,
      modules: safeModules as any,
    });

    if (success) {
      form.reset();
      onOpenChange(false);
    }
  };

  // Dentro do VAGOU só é possível criar usuários com papéis do próprio VAGOU
  const getAllowedRoles = (): AppRole[] => {
    return ["responsavel", "gestor", "diretor_cmei", "admin"];
  };

  const allowedRoles = getAllowedRoles();
  const selectedRole = form.watch("role");
  const unidadesVinculo = (cmeis || []).filter((c: any) => {
    if (!c.ativo) return false;
    if (selectedRole === "school_coord") return c.tipo_unidade === "escola";
    if (selectedRole === "diretor_cmei") return c.tipo_unidade !== "escola";
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do novo usuário. Um e-mail de boas-vindas será enviado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="000.000.000-00"
                          {...field}
                          onChange={(e) => field.onChange(maskCPF(e.target.value))}
                          onBlur={(e) => handleConsultarCpf(e.target.value)}
                          maxLength={14}
                        />
                        {isConsultandoCpf && (
                          <LoadingSpinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha Inicial *</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button type="button" variant="outline" onClick={generatePassword}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Clique no botão para gerar uma senha aleatória
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel Inicial</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // VAGOU cria apenas usuários do módulo VAGOU
                      form.setValue("modules", ["vagou"]);
                      if (value !== "diretor_cmei") {
                        form.setValue("cmei_id", "");
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um papel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allowedRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    O papel determina as permissões do usuário no sistema
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === "diretor_cmei" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                Esse perfil acessa apenas o VAGOU e visualiza apenas a unidade vinculada.
              </div>
            )}

            {selectedRole === "school_coord" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                Esse perfil acessa apenas o Portal da Escola (SAM) e visualiza apenas a instituição vinculada.
              </div>
            )}

            {(selectedRole === "diretor_cmei" || selectedRole === "school_coord") && (
              <FormField
                control={form.control}
                name="cmei_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedRole === "school_coord" ? "Instituição vinculada ao Portal da Escola *" : `${singular} vinculada ao Diretor *`}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedRole === "school_coord" ? "Selecione a instituição" : `Selecione ${singular}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unidadesVinculo.map((cmei) => (
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
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
