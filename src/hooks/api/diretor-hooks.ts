import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Hook para obter CMEIs vinculados ao diretor logado
export const useDiretorCmeis = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["diretor-cmeis", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("diretor_cmei_vinculo")
        .select(`
          cmei_id,
          cmeis:cmei_id (
            id,
            nome,
            endereco,
            bairro,
            telefone,
            email,
            capacidade_total,
            ativo
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data?.map((d: any) => d.cmeis).filter(Boolean) || [];
    },
    enabled: !!user?.id,
  });
};

// Hook para verificar se usuário é diretor
export const useIsDiretor = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-diretor", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "diretor_cmei")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id,
  });
};

// Hook para estatísticas dos CMEIs do diretor
export const useDiretorStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["diretor-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Buscar CMEIs do diretor
      const { data: vinculos } = await supabase
        .from("diretor_cmei_vinculo")
        .select("cmei_id")
        .eq("user_id", user.id);

      const cmeiIds = vinculos?.map((v) => v.cmei_id) || [];
      if (cmeiIds.length === 0) return null;

      // Total matriculados nos CMEIs do diretor
      const { count: totalMatriculados } = await supabase
        .from("criancas")
        .select("*", { count: "exact", head: true })
        .in("cmei_atual_id", cmeiIds)
        .in("status", ["Matriculado", "Matriculada"]);

      // Total convocados aguardando nos CMEIs
      const { count: totalConvocados } = await supabase
        .from("criancas")
        .select("*", { count: "exact", head: true })
        .in("cmei_atual_id", cmeiIds)
        .eq("status", "Convocado");

      // Buscar capacidade total
      const { data: cmeis } = await supabase
        .from("cmeis")
        .select("capacidade_total")
        .in("id", cmeiIds);

      const capacidadeTotal = cmeis?.reduce((sum, c) => sum + (c.capacidade_total || 0), 0) || 0;

      // Turmas dos CMEIs
      const { count: totalTurmas } = await supabase
        .from("turmas")
        .select("*", { count: "exact", head: true })
        .in("cmei_id", cmeiIds)
        .eq("ativo", true);

      return {
        totalMatriculados: totalMatriculados || 0,
        totalConvocados: totalConvocados || 0,
        capacidadeTotal,
        vagas: capacidadeTotal - (totalMatriculados || 0),
        totalTurmas: totalTurmas || 0,
        percentualOcupacao: capacidadeTotal > 0 
          ? Math.round(((totalMatriculados || 0) / capacidadeTotal) * 100)
          : 0,
      };
    },
    enabled: !!user?.id,
  });
};

// Hook para crianças dos CMEIs do diretor
export const useDiretorCriancas = (
  statusFilter?: string, 
  turmaId?: string, 
  turmaBaseFilter?: string,
  dataInicio?: string,
  dataFim?: string
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["diretor-criancas", user?.id, statusFilter, turmaId, turmaBaseFilter, dataInicio, dataFim],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar CMEIs do diretor
      const { data: vinculos } = await supabase
        .from("diretor_cmei_vinculo")
        .select("cmei_id")
        .eq("user_id", user.id);

      const cmeiIds = vinculos?.map((v) => v.cmei_id) || [];
      if (cmeiIds.length === 0) return [];

      let query = supabase
        .from("criancas")
        .select(`
          *,
          cmei_atual:cmeis!criancas_cmei_atual_id_fkey(id, nome),
          turma_atual:turmas!criancas_turma_atual_id_fkey(id, nome, turma_base)
        `)
        .in("cmei_atual_id", cmeiIds);

      if (statusFilter) {
        query = query.eq("status", statusFilter as any);
      } else {
        query = query.in("status", ["Matriculado", "Matriculada", "Convocado"]);
      }

      if (turmaId) {
        query = query.eq("turma_atual_id", turmaId);
      }

      if (dataInicio) {
        query = query.gte("created_at", `${dataInicio}T00:00:00`);
      }

      if (dataFim) {
        query = query.lte("created_at", `${dataFim}T23:59:59`);
      }

      const { data, error } = await query.order("nome");

      if (error) throw error;

      // Filtrar por turma base se especificado
      if (turmaBaseFilter) {
        return data?.filter((c: any) => c.turma_atual?.turma_base === turmaBaseFilter) || [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
};

// Hook para turmas dos CMEIs do diretor
export const useDiretorTurmas = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["diretor-turmas", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar CMEIs do diretor
      const { data: vinculos } = await supabase
        .from("diretor_cmei_vinculo")
        .select("cmei_id")
        .eq("user_id", user.id);

      const cmeiIds = vinculos?.map((v) => v.cmei_id) || [];
      if (cmeiIds.length === 0) return [];

      // Buscar turmas
      const { data: turmas, error } = await supabase
        .from("turmas")
        .select(`
          *,
          cmei:cmeis!turmas_cmei_id_fkey(id, nome)
        `)
        .in("cmei_id", cmeiIds)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;

      // Calcular ocupação de cada turma
      const turmasComOcupacao = await Promise.all(
        (turmas || []).map(async (turma) => {
          const { count } = await supabase
            .from("criancas")
            .select("*", { count: "exact", head: true })
            .eq("turma_atual_id", turma.id)
            .in("status", ["Matriculado", "Matriculada"]);

          return {
            ...turma,
            ocupados: count || 0,
          };
        })
      );

      return turmasComOcupacao;
    },
    enabled: !!user?.id,
  });
};

// Hook para ocupação por CMEI do diretor
export const useDiretorOcupacao = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["diretor-ocupacao", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar CMEIs do diretor com detalhes
      const { data: vinculos } = await supabase
        .from("diretor_cmei_vinculo")
        .select(`
          cmei:cmeis!diretor_cmei_vinculo_cmei_id_fkey (
            id,
            nome,
            capacidade_total,
            bairro
          )
        `)
        .eq("user_id", user.id);

      if (!vinculos) return [];

      const cmeis = vinculos.map((v: any) => v.cmei).filter(Boolean);

      // Calcular ocupação de cada CMEI
      const ocupacao = await Promise.all(
        cmeis.map(async (cmei: any) => {
          const { count } = await supabase
            .from("criancas")
            .select("*", { count: "exact", head: true })
            .eq("cmei_atual_id", cmei.id)
            .in("status", ["Matriculado", "Matriculada"]);

          const ocupados = count || 0;
          return {
            ...cmei,
            ocupados,
            vagas: (cmei.capacidade_total || 0) - ocupados,
            percentual: cmei.capacidade_total > 0
              ? Math.round((ocupados / cmei.capacidade_total) * 100)
              : 0,
          };
        })
      );

      return ocupacao;
    },
    enabled: !!user?.id,
  });
};

export const useDiretorFilaEspera = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["diretor-fila-espera", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: vinculos, error: vinculosError } = await supabase
        .from("diretor_cmei_vinculo")
        .select("cmei_id")
        .eq("user_id", user.id);

      if (vinculosError) throw vinculosError;
      const cmeiId = vinculos?.[0]?.cmei_id;
      if (!cmeiId) return [];

      const { data, error } = await supabase
        .from("criancas")
        .select(`
          id,
          nome,
          data_nascimento,
          status,
          posicao_fila,
          posicao_fila_cmei2,
          posicao_fila_cmei3,
          cmei1_preferencia,
          cmei2_preferencia,
          cmei3_preferencia,
          prioridade,
          programas_sociais,
          created_at
        `)
        .eq("status", "Fila de Espera")
        .or(`cmei1_preferencia.eq.${cmeiId},cmei2_preferencia.eq.${cmeiId},cmei3_preferencia.eq.${cmeiId}`);

      if (error) throw error;

      const withPosicao = (data || []).map((c: any) => {
        let posicao: number | null = null;
        if (c.cmei1_preferencia === cmeiId) posicao = c.posicao_fila ?? null;
        else if (c.cmei2_preferencia === cmeiId) posicao = c.posicao_fila_cmei2 ?? null;
        else if (c.cmei3_preferencia === cmeiId) posicao = c.posicao_fila_cmei3 ?? null;
        return { ...c, posicao };
      });

      withPosicao.sort((a: any, b: any) => {
        const ap = a.posicao ?? Number.POSITIVE_INFINITY;
        const bp = b.posicao ?? Number.POSITIVE_INFINITY;
        return ap - bp;
      });

      return withPosicao;
    },
    enabled: !!user?.id,
  });
};

export const useDiretorConvocados = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["diretor-convocados", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: vinculos, error: vinculosError } = await supabase
        .from("diretor_cmei_vinculo")
        .select("cmei_id")
        .eq("user_id", user.id);

      if (vinculosError) throw vinculosError;
      const cmeiId = vinculos?.[0]?.cmei_id;
      if (!cmeiId) return [];

      const { data: criancas, error: criancasError } = await supabase
        .from("criancas")
        .select(`
          id,
          nome,
          data_nascimento,
          status,
          convocacao_deadline,
          data_convocacao,
          responsavel_nome,
          cmei_atual_id
        `)
        .eq("status", "Convocado")
        .eq("cmei_atual_id", cmeiId)
        .order("data_convocacao", { ascending: true, nullsFirst: false });

      if (criancasError) throw criancasError;
      const criancaIds = (criancas || []).map((c: any) => c.id);
      if (criancaIds.length === 0) return [];

      const { data: tiposObrigatorios, error: tiposObrigatoriosError } = await supabase
        .from("documentos_tipos")
        .select("id,nome")
        .eq("obrigatorio", true)
        .eq("ativo", true);

      if (tiposObrigatoriosError) throw tiposObrigatoriosError;

      const { data: prioridades, error: prioridadesError } = await supabase
        .from("crianca_prioridades")
        .select("crianca_id,status,documento_comprovante_url,prioridade:tipos_prioridade(exige_documento,ativo,documento_tipo_id)")
        .in("crianca_id", criancaIds);

      if (prioridadesError) throw prioridadesError;

      const extraTipoIds = new Set<string>();
      (prioridades || []).forEach((p: any) => {
        const prio = p?.prioridade;
        const tipoId = prio?.documento_tipo_id as string | null | undefined;
        const exige = !!prio?.exige_documento;
        const ativo = !!prio?.ativo;
        if (exige && ativo && tipoId) extraTipoIds.add(tipoId);
      });

      const obrigatoriosIds = new Set<string>((tiposObrigatorios || []).map((t: any) => t.id));
      extraTipoIds.forEach((id) => obrigatoriosIds.add(id));
      const idsObrigatorios = [...obrigatoriosIds];

      const { data: tiposNomesData, error: tiposNomesError } = await supabase
        .from("documentos_tipos")
        .select("id,nome")
        .in("id", idsObrigatorios);

      if (tiposNomesError) throw tiposNomesError;
      const idsTiposAtivos = new Set<string>((tiposNomesData || []).map((t: any) => t.id));
      const tipoNomeById = new Map<string, string>(
        (tiposNomesData || []).map((t: any) => [t.id, t.nome])
      );

      const { data: docs, error: docsError } = idsObrigatorios.length
        ? await supabase
            .from("documentos_crianca")
            .select("crianca_id,tipo_documento_id,status")
            .in("crianca_id", criancaIds)
            .in("tipo_documento_id", idsObrigatorios)
        : { data: [], error: null };

      if (docsError) throw docsError;

      const aprovadosDocByCrianca = new Map<string, Set<string>>();
      (docs || []).forEach((d: any) => {
        if (d.status !== "aprovado") return;
        const set = aprovadosDocByCrianca.get(d.crianca_id) || new Set<string>();
        set.add(d.tipo_documento_id);
        aprovadosDocByCrianca.set(d.crianca_id, set);
      });

      const aprovadosPrioByCrianca = new Map<string, Set<string>>();
      (prioridades || []).forEach((p: any) => {
        if (p.status !== "aprovado" || !p.documento_comprovante_url) return;
        const tipoId = p?.prioridade?.documento_tipo_id as string | null | undefined;
        if (!tipoId) return;
        const set = aprovadosPrioByCrianca.get(p.crianca_id) || new Set<string>();
        set.add(tipoId);
        aprovadosPrioByCrianca.set(p.crianca_id, set);
      });

      return (criancas || []).map((c: any) => {
        const idsObrigatoriosSet = new Set<string>((tiposObrigatorios || []).map((t: any) => t.id));
        (prioridades || [])
          .filter((p: any) => p.crianca_id === c.id)
          .forEach((p: any) => {
            const prio = p?.prioridade;
            const tipoId = prio?.documento_tipo_id as string | null | undefined;
            const exige = !!prio?.exige_documento;
            const ativo = !!prio?.ativo;
            if (exige && ativo && tipoId && idsTiposAtivos.has(tipoId)) idsObrigatoriosSet.add(tipoId);
          });

        const obrigatorios = [...idsObrigatoriosSet];
        const aprovadosDoc = aprovadosDocByCrianca.get(c.id) || new Set<string>();
        const aprovadosPrio = aprovadosPrioByCrianca.get(c.id) || new Set<string>();

        const pendentesIds = obrigatorios.filter((id: string) => !aprovadosDoc.has(id) && !aprovadosPrio.has(id));
        const nomesPendentes = pendentesIds
          .map((id: string) => tipoNomeById.get(id))
          .filter(Boolean) as string[];

        const total = obrigatorios.length;
        const pendentes = pendentesIds.length;
        return {
          ...c,
          documentacao: {
            total,
            pendentes,
            completos: pendentes === 0,
            nomesPendentes,
          },
        };
      });
    },
    enabled: !!user?.id,
  });
};
