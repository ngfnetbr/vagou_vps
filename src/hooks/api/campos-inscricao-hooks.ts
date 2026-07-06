import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampoInscricao {
  id: string;
  secao: string;
  nome_campo: string;
  label: string;
  tipo: string;
  placeholder: string | null;
  depende_de: string | null;
  depende_valor: string | null;
  obrigatorio: boolean;
  ativo: boolean;
  ordem: number;
  opcoes: { value: string; label: string }[] | null;
  validacao: {
    min?: number;
    max?: number;
    pattern?: string;
    mensagem_erro?: string;
  } | null;
  mascara: string | null;
  campo_sistema: boolean;
  visivel_responsavel: boolean;
  editavel_apos_inscricao: boolean;
  dica: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValorCampoCustom {
  id: string;
  crianca_id: string;
  campo_id: string;
  valor: string | null;
  created_at: string;
}

export type SecaoFormulario = "crianca" | "responsavel" | "endereco" | "preferencias" | "observacoes";

// Hook para listar campos de inscrição
export const useCamposInscricao = (secao?: SecaoFormulario) => {
  return useQuery({
    queryKey: ["campos-inscricao", secao],
    queryFn: async () => {
      let query = supabase
        .from("campos_inscricao")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (secao) {
        query = query.eq("secao", secao);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data.map(campo => ({
        ...campo,
        opcoes: campo.opcoes as CampoInscricao["opcoes"],
        validacao: campo.validacao as CampoInscricao["validacao"],
      })) as CampoInscricao[];
    },
  });
};

// Hook para listar todos os campos (admin)
export const useCamposInscricaoAdmin = () => {
  return useQuery({
    queryKey: ["campos-inscricao-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campos_inscricao")
        .select("*")
        .order("secao", { ascending: true })
        .order("ordem", { ascending: true });

      if (error) throw error;
      
      return data.map(campo => ({
        ...campo,
        opcoes: campo.opcoes as CampoInscricao["opcoes"],
        validacao: campo.validacao as CampoInscricao["validacao"],
      })) as CampoInscricao[];
    },
  });
};

// Hook para criar campo
export const useCreateCampoInscricao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campo: Partial<CampoInscricao>) => {
      const { data, error } = await supabase
        .from("campos_inscricao")
        .insert(campo as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campos-inscricao"] });
      queryClient.invalidateQueries({ queryKey: ["campos-inscricao-admin"] });
      toast.success("Campo criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar campo: " + error.message);
    },
  });
};

// Hook para atualizar campo
export const useUpdateCampoInscricao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampoInscricao> & { id: string }) => {
      const { data, error } = await supabase
        .from("campos_inscricao")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campos-inscricao"] });
      queryClient.invalidateQueries({ queryKey: ["campos-inscricao-admin"] });
      toast.success("Campo atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar campo: " + error.message);
    },
  });
};

// Hook para deletar campo (apenas campos não-sistema)
export const useDeleteCampoInscricao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Verificar se é campo do sistema
      const { data: campo, error: checkError } = await supabase
        .from("campos_inscricao")
        .select("campo_sistema")
        .eq("id", id)
        .single();

      if (checkError) throw checkError;
      if (campo?.campo_sistema) {
        throw new Error("Campos do sistema não podem ser excluídos.");
      }

      // Usar select para verificar se a deleção realmente ocorreu
      const { data, error } = await supabase
        .from("campos_inscricao")
        .delete()
        .eq("id", id)
        .eq("campo_sistema", false)
        .select();

      if (error) throw error;
      
      // Se não retornou nenhum dado, a deleção não ocorreu
      if (!data || data.length === 0) {
        throw new Error("Não foi possível excluir o campo. Verifique suas permissões.");
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campos-inscricao"] });
      queryClient.invalidateQueries({ queryKey: ["campos-inscricao-admin"] });
      toast.success("Campo excluído!");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
};

// Hook para reordenar campos
export const useReordenarCampos = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campos: { id: string; ordem: number }[]) => {
      const promises = campos.map(({ id, ordem }) =>
        supabase
          .from("campos_inscricao")
          .update({ ordem })
          .eq("id", id)
      );

      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campos-inscricao"] });
      queryClient.invalidateQueries({ queryKey: ["campos-inscricao-admin"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao reordenar campos: " + error.message);
    },
  });
};

// Hook para buscar valores customizados de uma criança
export const useValoresCamposCustom = (criancaId: string) => {
  return useQuery({
    queryKey: ["valores-campos-custom", criancaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("valores_campos_custom")
        .select("*")
        .eq("crianca_id", criancaId);

      if (error) throw error;
      return data as ValorCampoCustom[];
    },
    enabled: !!criancaId,
  });
};

export const useTurnoInteresseLote = (criancaIds: string[]) => {
  const idsKey = (criancaIds || []).slice().sort().join(",");

  const prioridade = (c: { nome_campo: string | null; label: string | null; ativo?: boolean | null }) => {
    const nome = (c.nome_campo || "").toLowerCase();
    const label = (c.label || "").toLowerCase();
    const ativoBonus = c.ativo ? 0 : 10;
    if (nome === "turno") return ativoBonus + 0;
    if (nome.includes("turno")) return ativoBonus + 1;
    if (nome.includes("period")) return ativoBonus + 2;
    if (label.includes("turno")) return ativoBonus + 3;
    if (label.includes("período") || label.includes("periodo") || label.includes("period")) return ativoBonus + 4;
    return ativoBonus + 99;
  };

  return useQuery({
    queryKey: ["turno-interesse-lote", idsKey],
    queryFn: async () => {
      if (!criancaIds || criancaIds.length === 0) return {} as Record<string, string>;

      const { data: campos, error: camposError } = await supabase
        .from("campos_inscricao")
        .select("id, nome_campo, label, ativo, ordem")
        .or("nome_campo.ilike.%turno%,label.ilike.%turno%,nome_campo.ilike.%period%,label.ilike.%periodo%,label.ilike.%período%");

      if (camposError) throw camposError;

      const camposOrdenados = [...(campos || [])].sort((a, b) => {
        const diff = prioridade(a) - prioridade(b);
        if (diff !== 0) return diff;
        return (a.ordem ?? 999) - (b.ordem ?? 999);
      });
      const campoIds = camposOrdenados.map((c) => c.id).filter(Boolean);
      if (campoIds.length === 0) return {} as Record<string, string>;

      const { data: valores, error: valoresError } = await supabase
        .from("valores_campos_custom")
        .select("crianca_id, campo_id, valor")
        .in("crianca_id", criancaIds)
        .in("campo_id", campoIds);

      if (valoresError) throw valoresError;

      const byCrianca: Record<string, Record<string, string>> = {};
      for (const v of valores || []) {
        if (!v.crianca_id || !v.campo_id) continue;
        if (!byCrianca[v.crianca_id]) byCrianca[v.crianca_id] = {};
        byCrianca[v.crianca_id][v.campo_id] = v.valor || "";
      }

      const result: Record<string, string> = {};
      for (const id of criancaIds) {
        const map = byCrianca[id];
        if (!map) continue;
        for (const campo of camposOrdenados) {
          const val = map[campo.id];
          if (val && val.trim()) {
            result[id] = val.trim();
            break;
          }
        }
      }

      return result;
    },
    enabled: criancaIds.length > 0,
  });
};

// Hook para salvar valores customizados
export const useSaveValoresCamposCustom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      criancaId,
      valores,
      insertOnly,
    }: {
      criancaId: string;
      valores: Record<string, string>;
      insertOnly?: boolean;
      silent?: boolean;
    }) => {
      const entries = Object.entries(valores).map(([campo_id, valor]) => ({
        crianca_id: criancaId,
        campo_id,
        valor,
      }));

      if (entries.length === 0) return;

      const { error } = await supabase
        .from("valores_campos_custom")
        .upsert(entries, { onConflict: "crianca_id,campo_id", ignoreDuplicates: insertOnly === true });

      if (!error) return;

      const msg = String((error as any)?.message || "");
      const isRls = /row-level security|new row violates/i.test(msg);
      if (!isRls) throw error;

      const { error: rpcError } = await supabase.rpc("upsert_valores_campos_custom_public" as any, {
        p_crianca_id: criancaId,
        p_valores: valores,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: (_, { criancaId }) => {
      queryClient.invalidateQueries({ queryKey: ["valores-campos-custom", criancaId] });
    },
    onError: (error: any, variables) => {
      if (variables?.silent) return;
      toast.error("Erro ao salvar valores: " + error.message);
    },
  });
};

// Labels para seções
export const SECOES_FORMULARIO = {
  crianca: "Dados da Criança",
  responsavel: "Dados do Responsável",
  endereco: "Endereço",
  preferencias: "Preferências da Unidade",
  observacoes: "Observações",
} as const;

// Labels para tipos de campo
export const TIPOS_CAMPO = {
  text: "Texto",
  number: "Número",
  select: "Seleção",
  checkbox: "Caixa de seleção",
  date: "Data",
  textarea: "Texto longo",
  cpf: "CPF",
  phone: "Telefone",
  cep: "CEP",
  email: "E-mail",
} as const;

// Interface para histórico de alterações
export interface CampoInscricaoHistorico {
  id: string;
  campo_id: string | null;
  operacao: string;
  dados_anteriores: Record<string, any> | null;
  dados_novos: Record<string, any> | null;
  usuario_id: string | null;
  created_at: string;
}

// Hook para buscar histórico de alterações
export const useCamposInscricaoHistorico = (campoId?: string) => {
  return useQuery({
    queryKey: ["campos-inscricao-historico", campoId],
    queryFn: async () => {
      let query = supabase
        .from("campos_inscricao_historico")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (campoId) {
        query = query.eq("campo_id", campoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CampoInscricaoHistorico[];
    },
  });
};

// Labels para operações
export const OPERACOES_HISTORICO = {
  INSERT: "Criação",
  UPDATE: "Atualização",
  DELETE: "Exclusão",
} as const;
