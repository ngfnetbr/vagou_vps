// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useAuth } from "@root/contexts/AuthContext";
import type { Tables } from "@sondagem/integrations/supabase/db";

export interface MetaSondagem {
  id: string;
  periodo_codigo: string;
  turma_tipo: string | null;
  tipo: string;
  nivel_codigo: string;
  descricao: string | null;
  obrigatoria: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type MetaSondagemRow = Tables<"metas_sondagem">;

export function useMetas(periodoCodigo?: string) {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["metas", periodoCodigo],
    queryFn: async () => {
      let query = supabase
        .from("metas_sondagem")
        .select("*")
        .order("periodo_codigo")
        .order("tipo")
        .order("turma_tipo");
      if (periodoCodigo) query = query.eq("periodo_codigo", periodoCodigo);
      const { data, error } = await query;
      if (error) throw error;
      return ((data || []) as MetaSondagemRow[]).map((m) => ({
        ...m,
        periodo_codigo: m.periodo_codigo.trim().toUpperCase(),
        nivel_codigo: m.nivel_codigo.trim().toUpperCase(),
        tipo: (() => {
          const t = m.tipo.toLowerCase();
          return t.includes("produc") ? "producao_texto" : "escrita";
        })(),
      })) as MetaSondagem[];
    },
    enabled: !loading && !!user,
  });
}

export function useCreateMeta() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (meta: {
      periodo_codigo: string;
      turma_tipo: string | null;
      tipo: string;
      nivel_codigo: string;
      descricao: string | null;
      obrigatoria: boolean;
    }) => {
      const payload = {
        ...meta,
        periodo_codigo: meta.periodo_codigo.trim().toUpperCase(),
        nivel_codigo: meta.nivel_codigo.trim().toUpperCase(),
      };
      const { data, error } = await supabase
        .from("metas_sondagem")
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas"] }),
  });
}

export function useUpdateMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meta: {
      id: string;
      periodo_codigo: string;
      turma_tipo: string | null;
      tipo: string;
      nivel_codigo: string;
      descricao: string | null;
    }) => {
      const { id, ...rest } = meta;
      const payload = {
        ...rest,
        periodo_codigo: rest.periodo_codigo.trim().toUpperCase(),
        nivel_codigo: rest.nivel_codigo.trim().toUpperCase(),
      };
      const { error } = await supabase.from("metas_sondagem").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas"] }),
  });
}

export function useDeleteMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metas_sondagem").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas"] }),
  });
}
