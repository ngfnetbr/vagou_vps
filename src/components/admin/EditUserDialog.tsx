import { useEffect, useState } from "react";
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
import { UserCog } from "lucide-react";
import { useUpdateUserProfile, Usuario } from "@/hooks/api/usuarios-hooks";
import { maskCPF, maskPhone } from "@/utils/masks";
import { consultarCpf } from "@/utils/consultar-cpf";

import { validarCPF } from "@/utils/validations/inscricao";

const editUserSchema = z.object({
  nome_completo: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().optional().refine((val) => !val || validarCPF(val), "CPF inválido"),
  telefone: z.string().optional(),
  sexo: z.string().optional(),
  data_nascimento: z.string().optional(),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
}

export function EditUserDialog({ open, onOpenChange, usuario }: EditUserDialogProps) {
  const updateUser = useUpdateUserProfile();
  const [isConsultandoCpf, setIsConsultandoCpf] = useState(false);

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      nome_completo: "",
      cpf: "",
      telefone: "",
      sexo: "",
      data_nascimento: "",
    },
  });

  useEffect(() => {
    if (usuario && open) {
      form.reset({
        nome_completo: usuario.nome_completo || "",
        cpf: maskCPF(usuario.cpf || ""),
        telefone: maskPhone(usuario.telefone || ""),
        sexo: usuario.sexo || "",
        data_nascimento: usuario.data_nascimento || "",
      });
    }
  }, [usuario, open, form]);

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

  const onSubmit = async (data: EditUserForm) => {
    if (!usuario) return;

    const success = await updateUser.mutateAsync({
      user_id: usuario.id,
      nome_completo: data.nome_completo,
      cpf: data.cpf || undefined,
      telefone: data.telefone || undefined,
      sexo: data.sexo || undefined,
      data_nascimento: data.data_nascimento || undefined,
    });

    if (success) {
      onOpenChange(false);
    }
  };

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Editar Dados do Usuário
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do perfil do usuário.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">E-mail (não editável)</p>
              <p className="font-medium">{usuario.email}</p>
            </div>

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
                        <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
