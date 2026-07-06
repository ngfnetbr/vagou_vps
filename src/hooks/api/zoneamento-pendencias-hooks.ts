import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ZoneamentoBairroPendente = {
  id: string;
  created_at: string;
  last_seen_at: string;
  bairro: string;
  cep: string | null;
  cidade: string | null;
  estado: string;
  origem: string;
  vezes: number;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_zona_id: string | null;
};

export const useZoneamentoBairrosPendentes = (options?: { includeResolved?: boolean }) => {
  const includeResolved = options?.includeResolved ?? false;

  return useQuery({
    queryKey: ["zoneamento-bairros-pendentes", includeResolved],
    queryFn: async () => {
      let query = supabase.from("zoneamento_bairros_pendentes").select("*");
      if (!includeResolved) query = query.is("resolved_at", null);
      const { data, error } = await query.order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ZoneamentoBairroPendente[];
    },
  });
};

export const useResolverBairroPendente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; resolved_at: string; resolved_by: string; resolved_zona_id?: string | null }) => {
      const { error } = await supabase
        .from("zoneamento_bairros_pendentes")
        .update({
          resolved_at: data.resolved_at,
          resolved_by: data.resolved_by,
          resolved_zona_id: data.resolved_zona_id ?? null,
        } as any)
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zoneamento-bairros-pendentes"] });
      toast.success("Pendência resolvida!");
    },
    onError: (error: any) => {
      toast.error("Erro ao resolver pendência: " + error.message);
    },
  });
};

