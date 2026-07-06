import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useAuth } from "@root/contexts/AuthContext";
import { fetchPrincipalCmeis, fetchPrincipalCriancas, fetchPrincipalTurmas } from "@sondagem/lib/principalData";
import type { Tables } from "@sondagem/integrations/supabase/db";

// ── CMEIs ──
export function useLocalCmeis() {
  return useQuery({
    queryKey: ["local-cmeis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("local_cmeis")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUnifiedCmeis() {
  return useQuery({
    queryKey: ["unified-cmeis"],
    queryFn: async () => {
      const [principalData, { data: localData, error: localError }] = await Promise.all([
        fetchPrincipalCmeis(),
        supabase.from("local_cmeis").select("id, nome, ativo").eq("ativo", true),
      ]);
      if (localError) throw localError;

      const items: { id: string; nome: string; fonte: string }[] = [];
      const seen = new Set<string>();

      principalData.forEach((item) => {
        if (item.id && item.nome && !seen.has(item.id)) {
          seen.add(item.id);
          items.push({ id: item.id, nome: item.nome, fonte: "principal" });
        }
      });
      (localData as Array<Pick<Tables<"local_cmeis">, "id" | "nome" | "ativo">> | null | undefined || []).forEach((item) => {
        if (item.id && item.nome && !seen.has(item.id)) {
          seen.add(item.id);
          items.push({ id: item.id, nome: item.nome, fonte: "local" });
        }
      });

      return items.sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
}

export function useCreateCmei() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("local_cmeis").insert({ nome, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-cmeis"] });
      qc.invalidateQueries({ queryKey: ["unified-cmeis"] });
    },
  });
}

export function useUpdateCmei() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from("local_cmeis").update({ nome }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-cmeis"] });
      qc.invalidateQueries({ queryKey: ["unified-cmeis"] });
    },
  });
}

export function useDeleteCmei() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("local_cmeis").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-cmeis"] });
      qc.invalidateQueries({ queryKey: ["unified-cmeis"] });
    },
  });
}

// ── Turmas ──
export function useLocalTurmas() {
  return useQuery({
    queryKey: ["local-turmas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("local_turmas")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUnifiedTurmas(cmeiId?: string) {
  return useQuery({
    queryKey: ["unified-turmas", cmeiId],
    queryFn: async () => {
      const [principalData, { data: localData, error: localError }] = await Promise.all([
        fetchPrincipalTurmas(cmeiId),
        supabase.from("local_turmas").select("id, nome, cmei_id, cmei_nome").eq("ativo", true),
      ]);
      if (localError) throw localError;

      const items: { id: string; nome: string; cmei_id: string; cmei_nome: string; fonte: string }[] = [];
      const seen = new Set<string>();

      principalData.forEach((item) => {
        if (item.id && item.nome && !seen.has(item.id)) {
          seen.add(item.id);
          items.push({
            id: item.id,
            nome: item.nome,
            cmei_id: item.cmei_id || "",
            cmei_nome: item.cmei_nome || "",
            fonte: "principal",
          });
        }
      });
      (localData as Array<Pick<Tables<"local_turmas">, "id" | "nome" | "cmei_id" | "cmei_nome">> | null | undefined || []).forEach((item) => {
        if (item.id && item.nome && !seen.has(item.id)) {
          seen.add(item.id);
          items.push({
            id: item.id,
            nome: item.nome,
            cmei_id: item.cmei_id || "",
            cmei_nome: item.cmei_nome || "",
            fonte: "local",
          });
        }
      });

      return items
        .filter((item) => !cmeiId || item.cmei_id === cmeiId)
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
}

export function useCreateTurma() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: { nome: string; cmei_id?: string; cmei_nome?: string }) => {
      const { error } = await supabase.from("local_turmas").insert({ ...payload, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-turmas"] });
      qc.invalidateQueries({ queryKey: ["unified-turmas"] });
    },
  });
}

export function useUpdateTurma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; nome: string; cmei_id?: string; cmei_nome?: string }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("local_turmas").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-turmas"] });
      qc.invalidateQueries({ queryKey: ["unified-turmas"] });
    },
  });
}

export function useDeleteTurma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("local_turmas").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-turmas"] });
      qc.invalidateQueries({ queryKey: ["unified-turmas"] });
    },
  });
}

// ── Crianças (Alunos) ──
export function useLocalCriancas() {
  return useQuery({
    queryKey: ["local-criancas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("local_criancas")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUnifiedCriancas(cmeiId?: string, turmaId?: string) {
  return useQuery({
    queryKey: ["unified-criancas", cmeiId, turmaId],
    queryFn: async () => {
      const [principalData, { data: localData, error: localError }] = await Promise.all([
        fetchPrincipalCriancas({ cmeiId, turmaId }),
        supabase.from("local_criancas").select("*").eq("ativo", true),
      ]);
      if (localError) throw localError;

      const items: { id: string; nome: string; data_nascimento: string | null; turma_id: string; turma_nome: string; cmei_id: string; cmei_nome: string; ativo: boolean; fonte: string; sexo: string | null; responsavel: string | null; responsavel_cpf: string | null; telefone: string | null }[] = [];
      const seen = new Set<string>();

      principalData.forEach((item) => {
        if (!item.id || seen.has(item.id)) return;
        seen.add(item.id);
        items.push({ ...item, ativo: true, fonte: "principal" });
      });
      (localData as Tables<"local_criancas">[] | null | undefined || []).forEach((item) => {
        if (!item.id || seen.has(item.id)) return;
        seen.add(item.id);
        items.push({
          id: item.id,
          nome: item.nome,
          data_nascimento: item.data_nascimento ?? null,
          turma_id: item.turma_id || "",
          turma_nome: item.turma_nome || "",
          cmei_id: item.cmei_id || "",
          cmei_nome: item.cmei_nome || "",
          ativo: item.ativo ?? true,
          fonte: "local",
          sexo: null,
          responsavel: item.responsavel ?? null,
          responsavel_cpf: null,
          telefone: item.telefone ?? null,
        });
      });

      return items
        .filter((item) => !cmeiId || item.cmei_id === cmeiId)
        .filter((item) => !turmaId || item.turma_id === turmaId)
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
}

export function useCreateCrianca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nome: string; data_nascimento?: string; sexo?: string; turma_id?: string; turma_nome?: string; cmei_id?: string; cmei_nome?: string; responsavel?: string; responsavel_cpf?: string; telefone?: string }) => {
      const { error } = await supabase.from("criancas").insert({
        nome: payload.nome,
        data_nascimento: payload.data_nascimento || null,
        sexo: payload.sexo || null,
        cmei_atual_id: payload.cmei_id || null,
        turma_atual_id: payload.turma_id || null,
        responsavel_nome: payload.responsavel || null,
        responsavel_cpf: payload.responsavel_cpf || null,
        responsavel_telefone: payload.telefone || null,
        status: "Matriculado",
        origem_cadastro: "sondar",
        modulo_gestor: "sam_sondar",
        ignorar_automacoes_vagou: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-criancas"] });
      qc.invalidateQueries({ queryKey: ["unified-criancas"] });
    },
  });
}

export function useUpdateCrianca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; fonte?: string; nome: string; data_nascimento?: string; sexo?: string; turma_id?: string; turma_nome?: string; cmei_id?: string; cmei_nome?: string; responsavel?: string; responsavel_cpf?: string; telefone?: string }) => {
      const { id, fonte, ...rest } = payload;

      if (fonte === "local") {
        const { error } = await supabase.from("local_criancas").update({
          nome: rest.nome,
          data_nascimento: rest.data_nascimento,
          turma_id: rest.turma_id,
          turma_nome: rest.turma_nome,
          cmei_id: rest.cmei_id,
          cmei_nome: rest.cmei_nome,
          responsavel: rest.responsavel,
          telefone: rest.telefone,
        }).eq("id", id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("criancas")
        .update({
          nome: rest.nome,
          data_nascimento: rest.data_nascimento || null,
          sexo: rest.sexo || null,
          cmei_atual_id: rest.cmei_id || null,
          turma_atual_id: rest.turma_id || null,
          responsavel_nome: rest.responsavel || null,
          responsavel_cpf: rest.responsavel_cpf || null,
          responsavel_telefone: rest.telefone || null,
          origem_cadastro: "sondar",
          modulo_gestor: "sam_sondar",
          ignorar_automacoes_vagou: true,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-criancas"] });
      qc.invalidateQueries({ queryKey: ["unified-criancas"] });
    },
  });
}

export function useDeleteCrianca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("local_criancas").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local-criancas"] });
      qc.invalidateQueries({ queryKey: ["unified-criancas"] });
    },
  });
}
