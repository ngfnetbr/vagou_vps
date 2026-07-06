import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PRIORIDADES_FEDERAIS_PADRAO } from "@/constants/prioridades-federais";

export interface TipoPrioridade {
  id: string;
  nome: string;
  descricao: string | null;
  codigo: string;
  peso: number;
  cor: string;
  icone: string;
  exige_documento: boolean;
  documento_tipo_id: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface CriancaPrioridade {
  id: string;
  crianca_id: string;
  prioridade_id: string;
  documento_comprovante_url: string | null;
  status: "pendente" | "aprovado" | "recusado";
  aprovado_por: string | null;
  aprovado_em: string | null;
  motivo_recusa: string | null;
  created_at: string;
  updated_at: string;
  prioridade?: TipoPrioridade;
}

export const uploadDocumentoComprovantePrioridade = async ({
  criancaId,
  prioridadeId,
  arquivo,
}: {
  criancaId: string;
  prioridadeId: string;
  arquivo: File;
}): Promise<string> => {
  const fileExt = arquivo.name.split(".").pop() || "bin";
  const fileName = `${criancaId}/prioridades/${prioridadeId}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(fileName, arquivo, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(fileName);
  return urlData.publicUrl;
};

export const useEnviarComprovantePrioridade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      criancaId,
      prioridadeId,
      arquivo,
    }: {
      criancaId: string;
      prioridadeId: string;
      arquivo: File;
    }) => {
      const url = await uploadDocumentoComprovantePrioridade({ criancaId, prioridadeId, arquivo });

      const { error } = await supabase.from("crianca_prioridades").upsert(
        {
          crianca_id: criancaId,
          prioridade_id: prioridadeId,
          documento_comprovante_url: url,
          status: "pendente",
        } as any,
        { onConflict: "crianca_id,prioridade_id" },
      );

      if (error) throw error;
      return { criancaId };
    },
    onSuccess: ({ criancaId }) => {
      queryClient.invalidateQueries({ queryKey: ["crianca-prioridades", criancaId] });
      toast.success("Comprovante enviado! Aguarde a análise.");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar comprovante: " + (error?.message || "erro desconhecido"));
    },
  });
};

// Hook para listar tipos de prioridade
export const useTiposPrioridade = () => {
  return useQuery({
    queryKey: ["tipos-prioridade"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_prioridade")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as TipoPrioridade[];
    },
  });
};

// Hook para listar tipos de prioridade ativos
export const useTiposPrioridadeAtivos = () => {
  return useQuery({
    queryKey: ["tipos-prioridade-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_prioridade")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as TipoPrioridade[];
    },
  });
};

// Hook para criar tipo de prioridade
export const useCreateTipoPrioridade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prioridade: Partial<TipoPrioridade>) => {
      const { data, error } = await supabase
        .from("tipos_prioridade")
        .insert(prioridade as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-prioridade"] });
      queryClient.invalidateQueries({ queryKey: ["tipos-prioridade-ativos"] });
      toast.success("Tipo de prioridade criado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar: " + error.message);
    },
  });
};

// Hook para atualizar tipo de prioridade
export const useUpdateTipoPrioridade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TipoPrioridade> & { id: string }) => {
      const { data, error } = await supabase
        .from("tipos_prioridade")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-prioridade"] });
      queryClient.invalidateQueries({ queryKey: ["tipos-prioridade-ativos"] });
      toast.success("Tipo de prioridade atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
};

// Hook para deletar tipo de prioridade
export const useDeleteTipoPrioridade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tipos_prioridade")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-prioridade"] });
      queryClient.invalidateQueries({ queryKey: ["tipos-prioridade-ativos"] });
      toast.success("Tipo de prioridade excluído!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });
};

// Hook para buscar prioridades de uma criança
export const useCriancaPrioridades = (criancaId: string) => {
  return useQuery({
    queryKey: ["crianca-prioridades", criancaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crianca_prioridades")
        .select(`
          *,
          prioridade:tipos_prioridade(*)
        `)
        .eq("crianca_id", criancaId);

      if (error) throw error;
      return data as CriancaPrioridade[];
    },
    enabled: !!criancaId,
  });
};

// Hook para atribuir prioridade a uma criança
export const useAtribuirPrioridade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      crianca_id: string;
      prioridade_id: string;
      documento_comprovante_url?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("crianca_prioridades")
        .insert({
          ...data,
          status: data.documento_comprovante_url ? "pendente" : "aprovado",
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["crianca-prioridades", variables.crianca_id] });
      toast.success("Prioridade atribuída!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atribuir prioridade: " + error.message);
    },
  });
};

// Hook para aprovar/recusar prioridade
export const useAprovarPrioridade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      criancaId,
      status,
      motivo_recusa,
    }: {
      id: string;
      criancaId: string;
      status: "aprovado" | "recusado";
      motivo_recusa?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("crianca_prioridades")
        .update({
          status,
          motivo_recusa: status === "recusado" ? motivo_recusa : null,
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, criancaId };
    },
    onSuccess: ({ criancaId }) => {
      queryClient.invalidateQueries({ queryKey: ["crianca-prioridades", criancaId] });
      toast.success("Prioridade atualizada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
};

// Hook para remover prioridade de uma criança
export const useRemoverPrioridade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, criancaId }: { id: string; criancaId: string }) => {
      const { error } = await supabase
        .from("crianca_prioridades")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return criancaId;
    },
    onSuccess: (criancaId) => {
      queryClient.invalidateQueries({ queryKey: ["crianca-prioridades", criancaId] });
      toast.success("Prioridade removida!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });
};

// Calcular peso total das prioridades que contam para fila (aprovado ou pendente)
export const calcularPesoTotal = (prioridades: CriancaPrioridade[]): number => {
  return prioridades
    .filter(p => p.status !== "recusado" && p.prioridade?.ativo !== false && p.prioridade)
    .reduce((total, p) => total + (p.prioridade?.peso || 0), 0);
};
export { PRIORIDADES_FEDERAIS_PADRAO };

export const useInstalarPrioridadesFederais = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const nomesDocs = Array.from(
        new Set(PRIORIDADES_FEDERAIS_PADRAO.map((p) => p.documento_tipo_nome).filter(Boolean) as string[]),
      );

      if (nomesDocs.length > 0) {
        const { data: docsExistentes, error: docsExistentesError } = await supabase
          .from("documentos_tipos")
          .select("id,nome,ordem")
          .in("nome", nomesDocs);
        if (docsExistentesError) throw docsExistentesError;

        const existentesSet = new Set((docsExistentes || []).map((d) => d.nome));
        const faltantes = nomesDocs.filter((n) => !existentesSet.has(n));

        if (faltantes.length > 0) {
          const maxOrdemAtual =
            (docsExistentes || []).reduce((acc, d) => Math.max(acc, d.ordem || 0), 0) ||
            (
              await supabase
                .from("documentos_tipos")
                .select("ordem")
                .order("ordem", { ascending: false })
                .limit(1)
            ).data?.[0]?.ordem ||
            0;

          const inserts = faltantes.map((nome, idx) => {
            const seed = PRIORIDADES_FEDERAIS_PADRAO.find((p) => p.documento_tipo_nome === nome);
            return {
              nome,
              descricao: seed?.documento_tipo_descricao || null,
              obrigatorio: false,
              ativo: true,
              ordem: maxOrdemAtual + idx + 1,
            };
          });

          const { error: insertDocsError } = await supabase.from("documentos_tipos").insert(inserts as any);
          if (insertDocsError) throw insertDocsError;
        }
      }

      const { data: docsAfter, error: docsAfterError } = await supabase
        .from("documentos_tipos")
        .select("id,nome")
        .in(
          "nome",
          PRIORIDADES_FEDERAIS_PADRAO.map((p) => p.documento_tipo_nome).filter(Boolean) as string[],
        );
      if (docsAfterError) throw docsAfterError;

      const docIdByNome = new Map<string, string>((docsAfter || []).map((d) => [d.nome, d.id]));

      const upserts = PRIORIDADES_FEDERAIS_PADRAO.map((p) => ({
        codigo: p.codigo,
        nome: p.nome,
        descricao: p.descricao,
        peso: p.peso,
        cor: p.cor,
        icone: p.icone,
        exige_documento: p.exige_documento,
        documento_tipo_id: p.documento_tipo_nome ? docIdByNome.get(p.documento_tipo_nome) || null : null,
        ativo: true,
        ordem: p.ordem,
      }));

      const { error: upsertError } = await supabase
        .from("tipos_prioridade")
        .upsert(upserts as any, { onConflict: "codigo" });
      if (upsertError) throw upsertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-prioridade"] });
      queryClient.invalidateQueries({ queryKey: ["tipos-prioridade-ativos"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-tipos"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-tipos-ativos"] });
      toast.success("Critérios federais instalados/atualizados!");
    },
    onError: (error: any) => {
      toast.error("Erro ao instalar critérios: " + (error?.message || "erro desconhecido"));
    },
  });
};
