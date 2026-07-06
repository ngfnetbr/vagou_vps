import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLastSeenNovasInscricoes, markNovasInscricoesSeen } from "@/hooks/use-menu-badges";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/hooks/use-online-status";

type NovaInscricao = {
  id: string;
  nome: string;
  responsavel_nome: string | null;
  created_at: string;
  cmei1?: { nome: string } | null;
};

export const useDashboardInscricoesNotifications = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const initialLastSeen = useMemo(() => getLastSeenNovasInscricoes(), []);
  const [items, setItems] = useState<NovaInscricao[]>([]);

  const query = useQuery({
    queryKey: ["dashboard-novas-inscricoes", user?.id, initialLastSeen],
    queryFn: async () => {
      if (!initialLastSeen || !isOnline) {
        return [] as NovaInscricao[];
      }

      let request = supabase
        .from("criancas")
        .select(`
          id,
          nome,
          responsavel_nome,
          created_at,
          cmei1:cmeis!criancas_cmei1_preferencia_fkey(nome)
        `)
        .gt("created_at", initialLastSeen)
        .order("created_at", { ascending: false })
        .limit(8);

      if (user?.id) {
        request = request.neq("created_by", user.id);
      }

      const { data, error } = await request;
      if (error) throw error;
      return (data || []) as unknown as NovaInscricao[];
    },
    staleTime: 15000,
    refetchInterval: isOnline ? 30000 : false,
    enabled: !!user && !!initialLastSeen,
    retry: false,
  });

  useEffect(() => {
    if (!query.data?.length) return;

    setItems((current) => {
      const seen = new Set(current.map((item) => item.id));
      const incoming = query.data.filter((item) => !seen.has(item.id));
      return [...incoming, ...current].slice(0, 8);
    });

    const latestCreatedAt = query.data[0]?.created_at;
    if (latestCreatedAt) {
      markNovasInscricoesSeen(latestCreatedAt);
      queryClient.invalidateQueries({ queryKey: ["criancas-novas-fila-count-badge"] });
    }
  }, [query.data, queryClient]);

  const dismissItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const dismissAll = () => {
    setItems([]);
  };

  return {
    notifications: items,
    dismissItem,
    dismissAll,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
};

