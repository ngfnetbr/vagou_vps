import { useEffect, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { maskCPF, maskPhone } from "@/utils/masks";
import { validarCPF } from "@/utils/validations/inscricao";

const completarCadastroSchema = z.object({
  nome_completo: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string()
    .min(14, "CPF inválido")
    .refine(validarCPF, "CPF inválido"),
  telefone: z.string().min(14, "Telefone inválido").optional().or(z.literal("")),
});

type CompletarCadastroForm = z.infer<typeof completarCadastroSchema>;

export default function CompletarCadastro() {
  const { user, userProfile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CompletarCadastroForm>({
    resolver: zodResolver(completarCadastroSchema),
    defaultValues: {
      nome_completo: "",
      cpf: "",
      telefone: "",
    },
  });

  // Pré-preencher com dados do Google se disponíveis
  useEffect(() => {
    if (user) {
      const googleName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      form.setValue("nome_completo", googleName);
    }
  }, [user, form]);

  // Redirecionar se não autenticado ou se perfil já completo
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth/login", { replace: true });
        return;
      }
      
      // Se já tem CPF, perfil está completo
      if (userProfile?.cpf) {
        navigate("/auth/redirect", { replace: true });
      }
    }
  }, [user, userProfile, authLoading, navigate]);

  const onSubmit = async (data: CompletarCadastroForm) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const cpfLimpo = data.cpf.replace(/\D/g, "");
      const telefoneLimpo = data.telefone?.replace(/\D/g, "") || null;
      
      const { error } = await supabase
        .from("profiles")
        .update({
          nome_completo: data.nome_completo,
          cpf: cpfLimpo,
          telefone: telefoneLimpo,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Erro ao atualizar perfil:", error);
        if (error.code === "23505" && error.message?.includes("profiles_cpf_key")) {
          toast.error("Este CPF já está cadastrado no sistema. Se você é o responsável, tente fazer login com o e-mail correto.");
        } else {
          toast.error("Erro ao salvar dados. Tente novamente.");
        }
        return;
      }

      // Vincular crianças pelo CPF
      await supabase.rpc("link_children_by_cpf", {
        _user_id: user.id,
        _cpf: cpfLimpo,
      });

      toast.success("Cadastro concluído com sucesso!");
      
      // Redirecionar diretamente para área do responsável
      // (evita loop com AuthRedirect que pode ver userProfile desatualizado)
      navigate("/modulo/vagou/responsavel", { replace: true });
    } catch (error) {
      console.error("Erro ao completar cadastro:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          role="status"
          aria-label="Carregando"
          className="h-9 w-9 rounded-full border-b-2 border-primary animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Complete seu Cadastro</CardTitle>
            <CardDescription>
              Para continuar, precisamos de algumas informações adicionais.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome_completo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Seu nome completo" 
                          {...field} 
                        />
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
                      <FormLabel>CPF *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          {...field}
                          onChange={(e) => {
                            const formatted = maskCPF(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={14}
                        />
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
                      <FormLabel className="flex items-center gap-2">
                        <WhatsAppIcon className="h-4 w-4 fill-primary" />
                        Telefone (WhatsApp)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          onChange={(e) => {
                            const formatted = maskPhone(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Concluir Cadastro"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      
      <PublicFooter />
    </div>
  );
}




