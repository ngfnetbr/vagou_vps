// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useAuth } from "@root/contexts/AuthContext";

export interface AnotacaoAluno {
  id: string;
  crianca_id: string;
  user_id: string;
  user_nome: string | null;
  texto: string;
  created_at: string | null;
  updated_at: string | null;
}

export function useAnotacoesAluno(criancaId: string) {
  return useQuery({
    queryKey: ["anotacoes-aluno", criancaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anotacoes_aluno")
        .select("*")
        .eq("crianca_id", criancaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AnotacaoAluno[];
    },
    enabled: !!criancaId,
  });
}

export function useCreateAnotacao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ criancaId, texto, userNome }: { criancaId: string; texto: string; userNome: string }) => {
      const { error } = await supabase
        .from("anotacoes_aluno")
        .insert({
          crianca_id: criancaId,
          user_id: user?.id,
          user_nome: userNome,
          texto,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["anotacoes-aluno", vars.criancaId] });
    },
  });
}

export function useDeleteAnotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, criancaId }: { id: string; criancaId: string }) => {
      const { error } = await supabase
        .from("anotacoes_aluno")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return criancaId;
    },
    onSuccess: (criancaId) => {
      queryClient.invalidateQueries({ queryKey: ["anotacoes-aluno", criancaId] });
    },
  });
}

