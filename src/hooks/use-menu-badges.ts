import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/hooks/use-online-status";

const STORAGE_KEY_NOVAS_INSCRICOES = "vagou_last_seen_novas_inscricoes";

export const getLastSeenNovasInscricoes = () => localStorage.getItem(STORAGE_KEY_NOVAS_INSCRICOES);

export const markNovasInscricoesSeen = (isoDate = new Date().toISOString()) => {
  localStorage.setItem(STORAGE_KEY_NOVAS_INSCRICOES, isoDate);
};

// Hook para contar crianças novas na fila desde a última visita
export const useCriancasNovasFilaCount = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const lastVisited = getLastSeenNovasInscricoes();

  // Marcar como visto quando acessar a página da fila
  useEffect(() => {
    if (location.pathname === "/modulo/vagou/admin/fila") {
      markNovasInscricoesSeen();
      // Invalidar para atualizar o badge
      queryClient.invalidateQueries({ queryKey: ["criancas-novas-fila-count-badge"] });
    }
  }, [location.pathname, queryClient]);

  return useQuery({
    queryKey: ["criancas-novas-fila-count-badge", user?.id, lastVisited],
    queryFn: async () => {
      // Se nunca visitou, não mostrar badge (assumir que já viu tudo)
      if (!lastVisited) {
        return 0;
      }
      if (!isOnline) {
        return 0;
      }
      
      let query = supabase
        .from("criancas")
        .select("id", { count: "exact", head: true })
        .eq("status", "Fila de Espera")
        .gt("created_at", lastVisited);
      
      // Excluir crianças cadastradas pelo próprio usuário
      if (user?.id) {
        query = query.neq("created_by", user.id);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000,
    refetchInterval: isOnline ? 60000 : false,
    enabled: !!user && !!lastVisited,
    retry: false,
  });
};

// Função para resetar os timestamps (útil para testes ou forçar exibição)
export const resetBadgeTimestamps = () => {
  localStorage.removeItem(STORAGE_KEY_NOVAS_INSCRICOES);
};

// Função para inicializar os timestamps (marcar tudo como visto)
export const initializeBadgeTimestamps = () => {
  const now = new Date().toISOString();
  if (!localStorage.getItem(STORAGE_KEY_NOVAS_INSCRICOES)) {
    localStorage.setItem(STORAGE_KEY_NOVAS_INSCRICOES, now);
  }
};
