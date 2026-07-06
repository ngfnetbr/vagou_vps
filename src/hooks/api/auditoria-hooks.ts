import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/hooks/use-realtime-updates";
import { isToastEnabled } from "@/hooks/use-notification-preferences";

export const useAuditoria = (limit = 500) => {
  const queryClient = useQueryClient();

  // Real-time subscription for audit entries (INSERT, UPDATE, DELETE)
  useEffect(() => {
    const channel = supabase
      .channel("auditoria-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auditoria",
        },
        (payload) => {
          // Only show notification for new entries
          if (payload.eventType === "INSERT") {
            const newEntry = payload.new as {
              tabela: string;
              operacao: string;
            };
            
            // Play notification sound (respects preferences)
            playNotificationSound();
            
            // Show toast notification (respects preferences)
            if (isToastEnabled()) {
              toast({
                title: "🔔 Nova atividade registrada",
                description: `${newEntry.operacao} em ${newEntry.tabela}`,
              });
            }
          }
          
          // Invalidate all auditoria queries to refresh data
          queryClient.invalidateQueries({ 
            predicate: (query) => query.queryKey[0] === "auditoria" 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["auditoria", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });

  // Query separada para contar o total real
  const countQuery = useQuery({
    queryKey: ["auditoria-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("auditoria")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  return {
    ...query,
    totalCount: countQuery.data,
    isLoadingCount: countQuery.isLoading,
  };
};

// Hook para registrar auditoria com IP e User Agent via Edge Function
interface RegistrarAuditoriaParams {
  tabela: string;
  operacao: string;
  registro_id?: string;
  dados_antigos?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
}

export const useRegistrarAuditoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RegistrarAuditoriaParams) => {
      const { data, error } = await supabase.functions.invoke('registrar-auditoria', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditoria"] });
    },
  });
};

// Função utilitária para registrar auditoria (pode ser usada fora de componentes React)
export const registrarAuditoria = async (params: RegistrarAuditoriaParams) => {
  const { data, error } = await supabase.functions.invoke('registrar-auditoria', {
    body: params,
  });

  if (error) throw error;
  return data;
};
