import { useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, User } from "lucide-react";
import { toast } from "sonner";
import { validarCPF } from "@/utils/validations/inscricao";

const perfilSchema = z.object({
  nome_completo: z.string().min(1, "Nome é obrigatório").max(200),
  cpf: z.string()
    .min(11, "CPF inválido")
    .max(14)
    .refine(validarCPF, "CPF inválido"),
  telefone: z.string().min(10, "Telefone inválido").max(15),
  email: z.string().email("Email inválido").max(255),
});

type PerfilForm = z.infer<typeof perfilSchema>;

const Perfil = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PerfilForm) => {
      if (!user) throw new Error("Usuário não autenticado");

      const cpfLimpo = data.cpf.replace(/\D/g, "");

      const { data: updated, error } = await supabase
        .from("profiles")
        .update({
          nome_completo: data.nome_completo,
          cpf: cpfLimpo,
          telefone: data.telefone.replace(/\D/g, ""),
          email: data.email,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      // Vincular crianças pelo CPF após atualizar perfil
      if (cpfLimpo) {
        await supabase.rpc("link_children_by_cpf", {
          _user_id: user.id,
          _cpf: cpfLimpo,
        });
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["responsavel-stats"] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar perfil: " + error.message);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nome_completo: "",
      cpf: "",
      telefone: "",
      email: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        nome_completo: profile.nome_completo || "",
        cpf: profile.cpf || "",
        telefone: profile.telefone || "",
        email: profile.email || user?.email || "",
      });
    }
  }, [profile, user, reset]);

  const onSubmit = (data: PerfilForm) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <ResponsavelLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ResponsavelLayout>
    );
  }

  return (
    <ResponsavelLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Meu Perfil</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Gerencie suas informações pessoais
            </p>
          </div>
          <User className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground flex-shrink-0" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>
                Suas informações de cadastro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input
                    id="nome_completo"
                    {...register("nome_completo")}
                    placeholder="Seu nome completo"
                  />
                  {errors.nome_completo && (
                    <p className="text-sm text-destructive">
                      {errors.nome_completo.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    {...register("cpf")}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {errors.cpf && (
                    <p className="text-sm text-destructive">{errors.cpf.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="seu@email.com"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Email não pode ser alterado
                  </p>
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    {...register("telefone")}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                  {errors.telefone && (
                    <p className="text-sm text-destructive">
                      {errors.telefone.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações da Conta */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
              <CardDescription>
                Detalhes da sua conta no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo de Conta:</span>
                  <p className="font-medium mt-1">Responsável</p>
                </div>

                <div>
                  <span className="text-muted-foreground">Email de Login:</span>
                  <p className="font-medium mt-1">{user?.email}</p>
                </div>

                {profile?.created_at && (
                  <div>
                    <span className="text-muted-foreground">Membro desde:</span>
                    <p className="font-medium mt-1">
                      {new Date(profile.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>
                Gerencie a segurança da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Alterar Senha</p>
                    <p className="text-sm text-muted-foreground">
                      Redefina sua senha de acesso
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!user?.email) return;
                      
                      const { error } = await supabase.auth.resetPasswordForEmail(
                        user.email,
                        {
                          redirectTo: `${window.location.origin}/auth/reset-password`,
                        }
                      );

                      if (error) {
                        toast.error("Erro ao enviar email: " + error.message);
                      } else {
                        toast.success(
                          "Email de redefinição enviado! Verifique sua caixa de entrada."
                        );
                      }
                    }}
                  >
                    Enviar Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={!isDirty || updateMutation.isPending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isDirty || updateMutation.isPending} className="w-full sm:w-auto">
              {updateMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ResponsavelLayout>
  );
};

export default Perfil;

