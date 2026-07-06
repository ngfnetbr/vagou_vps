import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";

// Interface para CMEI com zonas
export interface CMEIComZonas {
  id: string;
  nome: string;
  tipo_unidade?: "cmei_creche" | "escola" | null;
  tipo_gestao?: "municipal" | "privado" | null;
  endereco: string | null;
  bairro: string | null;
  telefone: string | null;
  email: string | null;
  capacidade_total: number | null;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
  zonas: {
    zona_id: string;
    prioridade: number;
    zona: ZonaAtendimento | null;
  }[];
}

export interface ZonaAtendimento {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  bairros: string[] | null;
  ceps: string[] | null;
  poligono: any | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmeiZona {
  id: string;
  cmei_id: string;
  zona_id: string;
  prioridade: number;
  created_at: string;
  zona?: ZonaAtendimento;
}

// Hook para verificar se zoneamento está habilitado
export const useZoneamentoConfig = () => {
  const { data: config } = useConfiguracoesSistema();

  return {
    habilitado: config?.habilitar_zoneamento ?? false,
    priorizarZona: config?.priorizar_zona ?? true,
    mostrarDistancia: config?.mostrar_distancia ?? false,
    raioProximidadeKm: config?.raio_proximidade_km ?? 2,
  };
};

// Hook para listar zonas de atendimento
export const useZonasAtendimento = () => {
  return useQuery({
    queryKey: ["zonas-atendimento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zonas_atendimento")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as ZonaAtendimento[];
    },
  });
};

// Hook para listar zonas ativas
export const useZonasAtendimentoAtivas = () => {
  return useQuery({
    queryKey: ["zonas-atendimento-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_zonas_atendimento_ativas_publicas");

      if (error) throw error;
      return (data || []) as ZonaAtendimento[];
    },
  });
};

// Hook para buscar CMEIs com suas zonas vinculadas
export const useCMEIsComZonas = () => {
  return useQuery({
    queryKey: ["cmeis-com-zonas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cmeis")
        .select(`
          id,
          nome,
          tipo_unidade,
          tipo_gestao,
          endereco,
          bairro,
          telefone,
          email,
          capacidade_total,
          latitude,
          longitude,
          ativo,
          zonas:cmei_zonas(
            id,
            zona_id,
            prioridade,
            zona:zonas_atendimento(*)
          )
        `)
        .eq("ativo", true)
        .eq("tipo_unidade", "cmei_creche")
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as unknown as CMEIComZonas[];
    },
  });
};

// Função para ordenar CMEIs por relevância de zona
export const ordenarCMEIsPorZona = (
  cmeis: CMEIComZonas[],
  zonasEndereco: ZonaAtendimento[]
): CMEIComZonas[] => {
  if (!cmeis || !zonasEndereco.length) return cmeis || [];

  const zonasIds = new Set(zonasEndereco.map((z) => z.id));

  return [...cmeis].sort((a, b) => {
    const aZonas = a.zonas?.filter((z) => zonasIds.has(z.zona_id)) || [];
    const bZonas = b.zonas?.filter((z) => zonasIds.has(z.zona_id)) || [];

    const aTemZona = aZonas.length > 0;
    const bTemZona = bZonas.length > 0;

    // CMEIs da zona vêm primeiro
    if (aTemZona && !bTemZona) return -1;
    if (!aTemZona && bTemZona) return 1;

    if (aTemZona && bTemZona) {
      const aPrioridade = Math.min(...aZonas.map((z) => z.prioridade ?? 9999));
      const bPrioridade = Math.min(...bZonas.map((z) => z.prioridade ?? 9999));

      if (aPrioridade !== bPrioridade) return aPrioridade - bPrioridade;
    }

    // Se ambos têm ou não têm zona (ou empatou), ordenar alfabeticamente
    return a.nome.localeCompare(b.nome);
  });
};

// Hook para criar zona
export const useCreateZona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (zona: Partial<ZonaAtendimento>) => {
      const { data, error } = await supabase
        .from("zonas_atendimento")
        .insert(zona as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zonas-atendimento"] });
      queryClient.invalidateQueries({ queryKey: ["zonas-atendimento-ativas"] });
      toast.success("Zona criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar zona: " + error.message);
    },
  });
};

// Hook para atualizar zona
export const useUpdateZona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ZonaAtendimento> & { id: string }) => {
      const { data, error } = await supabase
        .from("zonas_atendimento")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zonas-atendimento"] });
      queryClient.invalidateQueries({ queryKey: ["zonas-atendimento-ativas"] });
      toast.success("Zona atualizada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar zona: " + error.message);
    },
  });
};

// Hook para deletar zona
export const useDeleteZona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("zonas_atendimento")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zonas-atendimento"] });
      queryClient.invalidateQueries({ queryKey: ["zonas-atendimento-ativas"] });
      toast.success("Zona excluída!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir zona: " + error.message);
    },
  });
};

// Hook para listar zonas de um CMEI
export const useCmeiZonas = (cmeiId: string) => {
  return useQuery({
    queryKey: ["cmei-zonas", cmeiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cmei_zonas")
        .select(`
          *,
          zona:zonas_atendimento(*)
        `)
        .eq("cmei_id", cmeiId)
        .order("prioridade", { ascending: true });

      if (error) throw error;
      return data as CmeiZona[];
    },
    enabled: !!cmeiId,
  });
};

// Hook para vincular CMEI a zona
export const useVincularCmeiZona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { cmei_id: string; zona_id: string; prioridade?: number }) => {
      const { data: result, error } = await supabase
        .from("cmei_zonas")
        .upsert(data, { onConflict: "cmei_id,zona_id" })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cmei-zonas", variables.cmei_id] });
      queryClient.invalidateQueries({ queryKey: ["cmeis-com-zonas"] });
      toast.success("Unidade vinculada à zona!");
    },
    onError: (error: any) => {
      toast.error("Erro ao vincular: " + error.message);
    },
  });
};

// Hook para desvincular CMEI de zona
export const useDesvincularCmeiZona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cmeiId, zonaId }: { id?: string; cmeiId: string; zonaId: string }) => {
      const query = supabase.from("cmei_zonas").delete();
      const { error } = id
        ? await query.eq("id", id)
        : await query.eq("cmei_id", cmeiId).eq("zona_id", zonaId);

      if (error) throw error;
      return cmeiId;
    },
    onSuccess: (cmeiId) => {
      queryClient.invalidateQueries({ queryKey: ["cmei-zonas", cmeiId] });
      queryClient.invalidateQueries({ queryKey: ["cmeis-com-zonas"] });
      toast.success("Vínculo removido!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover vínculo: " + error.message);
    },
  });
};

// Função para calcular distância entre dois pontos (Haversine)
export const calcularDistanciaKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

const normalizarTextoChave = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

const normalizarCepChave = (value: string): string => value.replace(/\D/g, "");

const calcularScoreMatchZona = (
  bairro: string | null,
  cep: string | null,
  zona: ZonaAtendimento
): number => {
  const cepLimpo = cep ? normalizarCepChave(cep) : "";

  if (cepLimpo && zona.ceps?.length) {
    for (const c of zona.ceps) {
      const prefixo = normalizarCepChave(c);
      if (prefixo.length === 0) continue;
      if (cepLimpo.startsWith(prefixo)) return 2;
    }
  }

  if (bairro && zona.bairros?.length) {
    const bairroKey = normalizarTextoChave(bairro);
    for (const b of zona.bairros) {
      if (normalizarTextoChave(b) === bairroKey) return 1;
    }
  }

  return 0;
};

// Função para verificar se um endereço está em uma zona
export const verificarEnderecoNaZona = (
  bairro: string | null,
  cep: string | null,
  zona: ZonaAtendimento
): boolean => {
  return calcularScoreMatchZona(bairro, cep, zona) > 0;
};

// Função para encontrar zonas de um endereço
export const encontrarZonasEndereco = (
  bairro: string | null,
  cep: string | null,
  zonas: ZonaAtendimento[]
): ZonaAtendimento[] => {
  return zonas
    .map((zona) => ({ zona, score: calcularScoreMatchZona(bairro, cep, zona) }))
    .filter((i) => i.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.zona.nome.localeCompare(b.zona.nome);
    })
    .map((i) => i.zona);
};
