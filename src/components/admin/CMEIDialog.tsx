import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCMEI, useUpdateCMEI } from "@/hooks/api/admin-hooks";
import { CMEI } from "@/hooks/api/supabase-hooks";
import { maskPhone } from "@/utils/masks";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { getUnidadeLabels } from "@/utils/unidade-utils";

const cmeiSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  tipo_unidade: z.enum(["cmei_creche", "escola"]),
  tipo_gestao: z.enum(["municipal", "privado"]),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
  ativo: z.boolean(),
});

type CMEIFormData = z.infer<typeof cmeiSchema>;

interface CMEIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cmei?: CMEI | null;
}

export default function CMEIDialog({ open, onOpenChange, cmei }: CMEIDialogProps) {
  const createMutation = useCreateCMEI();
  const updateMutation = useUpdateCMEI();
  const isEditing = !!cmei;
  const [searchParams] = useSearchParams();
  const { data: config } = useConfiguracoesSistema();
  const { singular } = getUnidadeLabels(config as any);

  const form = useForm<CMEIFormData>({
    resolver: zodResolver(cmeiSchema),
    defaultValues: {
      nome: "",
      tipo_unidade: "cmei_creche",
      tipo_gestao: "municipal",
      endereco: "",
      bairro: "",
      telefone: "",
      email: "",
      latitude: "",
      longitude: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (cmei) {
        form.reset({
          nome: cmei.nome || "",
          tipo_unidade: (cmei as any).tipo_unidade || "cmei_creche",
          tipo_gestao: cmei.tipo_gestao || "municipal",
          endereco: cmei.endereco || "",
          bairro: cmei.bairro || "",
          telefone: cmei.telefone || "",
          email: cmei.email || "",
          latitude: cmei.latitude ?? "",
          longitude: cmei.longitude ?? "",
          ativo: cmei.ativo ?? true,
        });
      } else {
        const tipoParam = searchParams.get("tipo");
        const defaultTipo = tipoParam === "escola" ? "escola" : "cmei_creche";
        form.reset({
          nome: "",
          tipo_unidade: defaultTipo,
          tipo_gestao: "municipal",
          endereco: "",
          bairro: "",
          telefone: "",
          email: "",
          latitude: "",
          longitude: "",
          ativo: true,
        });
      }
    }
  }, [cmei, open, searchParams]);

  const onSubmit = async (data: CMEIFormData) => {
    try {
      const cmeiData = {
        nome: data.nome,
        tipo_unidade: data.tipo_unidade,
        tipo_gestao: data.tipo_gestao,
        endereco: data.endereco || null,
        bairro: data.bairro || null,
        telefone: data.telefone || null,
        email: data.email || null,
        latitude: data.latitude === "" ? null : Number(data.latitude),
        longitude: data.longitude === "" ? null : Number(data.longitude),
        ativo: data.ativo,
      };
      
      if (isEditing && cmei) {
        await updateMutation.mutateAsync({ id: cmei.id, ...cmeiData });
      } else {
        await createMutation.mutateAsync(cmeiData);
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
        aria-describedby="cmei-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="cmei-dialog-title">
            {isEditing ? `Editar ${singular}` : `Novo ${singular}`}
          </DialogTitle>
          <DialogDescription id="cmei-dialog-description">
            {isEditing ? `Atualize as informações de ${singular}` : `Cadastre uma nova ${singular}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-4"
            aria-label={isEditing ? `Formulário de edição de ${singular}` : `Formulário de cadastro de ${singular}`}
          >
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="cmei-nome">Nome *</FormLabel>
                  <FormControl>
                    <Input 
                      id="cmei-nome"
                      placeholder={`${singular} Exemplo`} 
                      aria-required="true"
                      aria-invalid={!!form.formState.errors.nome}
                      aria-describedby={form.formState.errors.nome ? "cmei-nome-error" : undefined}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage id="cmei-nome-error" role="alert" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_unidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cmei_creche">CMEI</SelectItem>
                      <SelectItem value="escola">Escola</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_gestao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="municipal">Municipal</SelectItem>
                      <SelectItem value="privado">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, Avenida..." {...field} />
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
                      <Input placeholder="Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(00) 00000-0000" 
                        value={field.value}
                        onChange={(e) => field.onChange(maskPhone(e.target.value))}
                      />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        placeholder="-23.5505" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        placeholder="-46.6333" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativo</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
                aria-label={isEditing ? `Salvar alterações de ${singular}` : `Criar novo ${singular}`}
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
