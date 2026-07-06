import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface ChatMarcador {
  id: string;
  nome: string;
  cor: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export interface ChatConversaMarcador {
  id: string;
  responsavel_id: string;
  marcador_id: string;
  created_at: string;
  marcador?: ChatMarcador;
}

export interface ChatRespostaRapida {
  id: string;
  titulo: string;
  mensagem: string;
  atalho: string | null;
  categoria: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

// Hooks para Marcadores
export function useChatMarcadores() {
  return useQuery({
    queryKey: ["chat-marcadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_marcadores")
        .select("*")
        .eq("ativo", true)
        .order("ordem");

      if (error) throw error;
      return data as ChatMarcador[];
    },
  });
}

export function useChatMarcadoresAdmin() {
  return useQuery({
    queryKey: ["chat-marcadores-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_marcadores")
        .select("*")
        .order("ordem");

      if (error) throw error;
      return data as ChatMarcador[];
    },
  });
}

export function useCreateMarcador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (marcador: Omit<ChatMarcador, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("chat_marcadores")
        .insert(marcador)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-marcadores"] });
      queryClient.invalidateQueries({ queryKey: ["chat-marcadores-admin"] });
      toast.success("Marcador criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar marcador");
    },
  });
}

export function useUpdateMarcador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...marcador }: Partial<ChatMarcador> & { id: string }) => {
      const { data, error } = await supabase
        .from("chat_marcadores")
        .update({ ...marcador, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-marcadores"] });
      queryClient.invalidateQueries({ queryKey: ["chat-marcadores-admin"] });
      toast.success("Marcador atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar marcador");
    },
  });
}

export function useDeleteMarcador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_marcadores")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-marcadores"] });
      queryClient.invalidateQueries({ queryKey: ["chat-marcadores-admin"] });
      toast.success("Marcador excluído!");
    },
    onError: () => {
      toast.error("Erro ao excluir marcador");
    },
  });
}

// Hooks para Marcadores de Conversa
export function useConversaMarcadores(responsavelId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["conversa-marcadores", responsavelId],
    queryFn: async () => {
      if (!responsavelId) return [];
      
      const { data, error } = await supabase
        .from("chat_conversa_marcadores")
        .select(`
          *,
          marcador:chat_marcadores(*)
        `)
        .eq("responsavel_id", responsavelId);

      if (error) throw error;
      return data as (ChatConversaMarcador & { marcador: ChatMarcador })[];
    },
    enabled: enabled && !!responsavelId,
  });
}

export function useAddConversaMarcador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ responsavelId, marcadorId }: { responsavelId: string; marcadorId: string }) => {
      const { data, error } = await supabase
        .from("chat_conversa_marcadores")
        .insert({
          responsavel_id: responsavelId,
          marcador_id: marcadorId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversa-marcadores", variables.responsavelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversas"] });
    },
    onError: () => {
      toast.error("Erro ao adicionar marcador");
    },
  });
}

export function useRemoveConversaMarcador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ responsavelId, marcadorId }: { responsavelId: string; marcadorId: string }) => {
      const { error } = await supabase
        .from("chat_conversa_marcadores")
        .delete()
        .eq("responsavel_id", responsavelId)
        .eq("marcador_id", marcadorId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversa-marcadores", variables.responsavelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversas"] });
    },
    onError: () => {
      toast.error("Erro ao remover marcador");
    },
  });
}

// Hooks para Respostas Rápidas
export function useChatRespostasRapidas() {
  return useQuery({
    queryKey: ["chat-respostas-rapidas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_respostas_rapidas")
        .select("*")
        .eq("ativo", true)
        .order("ordem");

      if (error) throw error;
      return data as ChatRespostaRapida[];
    },
  });
}

export function useChatRespostasRapidasAdmin() {
  return useQuery({
    queryKey: ["chat-respostas-rapidas-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_respostas_rapidas")
        .select("*")
        .order("ordem");

      if (error) throw error;
      return data as ChatRespostaRapida[];
    },
  });
}

export function useCreateRespostaRapida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resposta: Omit<ChatRespostaRapida, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("chat_respostas_rapidas")
        .insert(resposta)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-respostas-rapidas"] });
      queryClient.invalidateQueries({ queryKey: ["chat-respostas-rapidas-admin"] });
      toast.success("Resposta rápida criada!");
    },
    onError: () => {
      toast.error("Erro ao criar resposta rápida");
    },
  });
}

export function useUpdateRespostaRapida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...resposta }: Partial<ChatRespostaRapida> & { id: string }) => {
      const { data, error } = await supabase
        .from("chat_respostas_rapidas")
        .update({ ...resposta, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-respostas-rapidas"] });
      queryClient.invalidateQueries({ queryKey: ["chat-respostas-rapidas-admin"] });
      toast.success("Resposta rápida atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar resposta rápida");
    },
  });
}

export function useDeleteRespostaRapida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_respostas_rapidas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-respostas-rapidas"] });
      queryClient.invalidateQueries({ queryKey: ["chat-respostas-rapidas-admin"] });
      toast.success("Resposta rápida excluída!");
    },
    onError: () => {
      toast.error("Erro ao excluir resposta rápida");
    },
  });
}

// Hook para buscar todos os marcadores de todas as conversas (para filtragem)
export function useAllConversaMarcadores(enabled = true) {
  return useQuery({
    queryKey: ["all-conversa-marcadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversa_marcadores")
        .select("responsavel_id, marcador_id");

      if (error) throw error;
      
      // Agrupar por responsavel_id
      const byResponsavel: Record<string, string[]> = {};
      data?.forEach((item) => {
        if (!item.responsavel_id) return;
        if (!byResponsavel[item.responsavel_id]) {
          byResponsavel[item.responsavel_id] = [];
        }
        byResponsavel[item.responsavel_id].push(item.marcador_id);
      });
      
      return byResponsavel;
    },
    enabled,
  });
}
