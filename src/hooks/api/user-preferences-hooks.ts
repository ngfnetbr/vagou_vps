import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";

export interface UserPreferences {
  id: string;
  user_id: string;
  tema: string;
  densidade_tabela: string;
  itens_por_pagina: number;
  colunas_personalizadas: string[] | null;
  sidebar_collapsed: boolean;
  notificacoes_som: boolean;
  notificacoes_toast: boolean;
  idioma: string;
  created_at: string;
  updated_at: string;
}

// Hook para buscar preferências do usuário
export const useUserPreferences = () => {
  return useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserPreferences | null;
    },
  });
};

// Hook para criar/atualizar preferências do usuário
export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<UserPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from("user_preferences")
          .update(preferences)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("user_preferences")
          .insert({ ...preferences, user_id: user.id })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast.success("Preferências salvas!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar preferências: " + error.message);
    },
  });
};

// Hook para obter preferências efetivas (usuário ou sistema)
export const usePreferenciasEfetivas = () => {
  const { data: userPrefs, isLoading: loadingUser } = useUserPreferences();
  const { data: config, isLoading: loadingConfig } = useConfiguracoesSistema();

  const preferencias = {
    tema: userPrefs?.tema || config?.tema_padrao || "system",
    densidade_tabela: userPrefs?.densidade_tabela || config?.densidade_tabela || "normal",
    itens_por_pagina: userPrefs?.itens_por_pagina || config?.itens_por_pagina || 25,
    colunas_fila: userPrefs?.colunas_personalizadas || (config?.colunas_visiveis_fila as string[]) || [
      "posicao", "nome", "idade", "turma", "status", "prioridade", "data_inscricao"
    ],
    sidebar_collapsed: userPrefs?.sidebar_collapsed ?? false,
    notificacoes_som: userPrefs?.notificacoes_som ?? true,
    notificacoes_toast: userPrefs?.notificacoes_toast ?? true,
    modo_visualizacao_fila: config?.modo_visualizacao_fila || "tabela",
    widgets_dashboard: (config?.widgets_dashboard as string[]) || [
      "estatisticas", "convocacoes_recentes", "ocupacao", "fila_evolucao"
    ],
  };

  return {
    preferencias,
    isLoading: loadingUser || loadingConfig,
    permitirTrocaTema: config?.permitir_troca_tema ?? true,
  };
};

// Labels para temas
export const TEMAS = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
} as const;

// Labels para densidade
export const DENSIDADES = {
  compact: "Compacta",
  normal: "Normal",
  relaxed: "Espaçada",
} as const;

export const getColunasFilaLabels = (unidadeSingular: string) => ({
  posicao: "Posição",
  nome: "Nome",
  idade: "Idade",
  turma: "Turma",
  status: "Status",
  prioridade: "Prioridade",
  data_inscricao: "Data Inscrição",
  cmei_preferencia: `${unidadeSingular} Preferido`,
  responsavel: "Responsável",
  telefone: "Telefone",
  bairro: "Bairro",
});

// Labels para widgets do dashboard
export const WIDGETS_DASHBOARD = {
  estatisticas: "Estatísticas Gerais",
  convocacoes_recentes: "Convocações Recentes",
  ocupacao: "Taxa de Ocupação",
  fila_evolucao: "Evolução da Fila",
  matriculas_recentes: "Matrículas Recentes",
  alertas: "Alertas e Pendências",
} as const;

