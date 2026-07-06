import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Curso {
  id: string;
  titulo: string;
  descricao: string | null;
  capa_url: string | null;
  publicado: boolean;
  created_at: string;
  updated_at: string;
}

export interface Modulo {
  id: string;
  curso_id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface Aula {
  id: string;
  curso_id: string;
  modulo_id: string | null;
  requisito_aula_id: string | null;
  percentual_minimo: number | null;
  titulo: string;
  descricao: string | null;
  thumbnail_url: string | null;
  video_path: string | null;
  duracao_segundos: number | null;
  ordem: number;
  preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface AulaProgresso {
  user_id: string;
  aula_id: string;
  concluido: boolean;
  progresso_segundos: number;
  updated_at: string;
}

function thumbnailPathFromPublicUrl(url: string): string | null {
  // Expected: .../storage/v1/object/public/assets/<path>
  const marker = "/storage/v1/object/public/assets/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

// ===================== CURSOS =====================

export const useCursosAdmin = () =>
  useQuery({
    queryKey: ["cursos", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cursos").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Curso[];
    },
  });

export const useCursosPublicados = () =>
  useQuery({
    queryKey: ["cursos", "publicados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos")
        .select("*")
        .eq("publicado", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Curso[];
    },
  });

// ===================== MÓDULOS =====================

export const useModulos = (cursoId: string | null) =>
  useQuery({
    queryKey: ["cursos", cursoId, "modulos"],
    enabled: !!cursoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modulos")
        .select("*")
        .eq("curso_id", cursoId as string)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Modulo[];
    },
  });

export const useCriarModulo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Modulo> & { id?: string; curso_id: string; titulo: string }) => {
      const { data, error } = await supabase.from("modulos").insert(payload as any).select("*").single();
      if (error) throw error;
      return data as Modulo;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["cursos", vars.curso_id, "modulos"] });
      toast.success("Módulo criado");
    },
    onError: (e: any) => toast.error(`Erro ao criar módulo: ${e?.message ?? "desconhecido"}`),
  });
};

export const useAtualizarModulo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      curso_id,
      data,
    }: {
      id: string;
      curso_id: string;
      data: Partial<Modulo>;
    }) => {
      const { data: row, error } = await supabase.from("modulos").update(data as any).eq("id", id).select("*").single();
      if (error) throw error;
      return row as Modulo;
    },
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["cursos", vars.curso_id, "modulos"] });
      toast.success("Módulo atualizado");
    },
    onError: (e: any) => toast.error(`Erro ao atualizar módulo: ${e?.message ?? "desconhecido"}`),
  });
};

export const useExcluirModulo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, curso_id }: { id: string; curso_id: string }) => {
      // Try to detach aulas first (in case FK is RESTRICT)
      await supabase.from("aulas").update({ modulo_id: null }).eq("modulo_id", id);
      const { error } = await supabase.from("modulos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["cursos", vars.curso_id, "modulos"] });
      qc.invalidateQueries({ queryKey: ["cursos", vars.curso_id, "aulas"] });
      toast.success("Módulo removido");
    },
    onError: (e: any) => toast.error(`Erro ao remover módulo: ${e?.message ?? "desconhecido"}`),
  });
};

// ===================== AULAS =====================

export const useAulas = (cursoId: string | null) =>
  useQuery({
    queryKey: ["cursos", cursoId, "aulas"],
    enabled: !!cursoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("curso_id", cursoId as string)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Aula[];
    },
  });

export const useCriarAula = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Aula> & { id?: string; curso_id: string; titulo: string }) => {
      const { data, error } = await supabase.from("aulas").insert(payload as any).select("*").single();
      if (error) throw error;
      return data as Aula;
    },
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["cursos", vars.curso_id, "aulas"] });
      toast.success("Aula criada");
    },
    onError: (e: any) => toast.error(`Erro ao criar aula: ${e?.message ?? "desconhecido"}`),
  });
};

export const useAtualizarAula = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Aula> }) => {
      const { data: row, error } = await supabase.from("aulas").update(data as any).eq("id", id).select("*").single();
      if (error) throw error;
      return row as Aula;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["cursos", row.curso_id, "aulas"] });
      qc.invalidateQueries({ queryKey: ["cursos", row.curso_id, "modulos"] });
    },
    onError: (e: any) => toast.error(`Erro ao atualizar aula: ${e?.message ?? "desconhecido"}`),
  });
};

export const useExcluirAula = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      curso_id,
      video_path,
      thumbnail_url,
    }: {
      id: string;
      curso_id: string;
      video_path?: string | null;
      thumbnail_url?: string | null;
    }) => {
      const { error } = await supabase.from("aulas").delete().eq("id", id);
      if (error) throw error;

      if (video_path) {
        await supabase.storage.from("course-videos").remove([video_path]);
      }
      if (thumbnail_url) {
        const p = thumbnailPathFromPublicUrl(thumbnail_url);
        if (p) await supabase.storage.from("assets").remove([p]);
      }
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["cursos", vars.curso_id, "aulas"] });
      toast.success("Aula removida");
    },
    onError: (e: any) => toast.error(`Erro ao remover aula: ${e?.message ?? "desconhecido"}`),
  });
};

// ===================== PROGRESSO =====================

export const useAulasProgresso = (cursoId: string | null) =>
  useQuery({
    queryKey: ["cursos", cursoId, "aulas-progresso", "me"],
    enabled: !!cursoId,
    queryFn: async () => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) return {} as Record<string, AulaProgresso>;

      const { data: aulas, error: aulasErr } = await supabase
        .from("aulas")
        .select("id")
        .eq("curso_id", cursoId as string);
      if (aulasErr) throw aulasErr;
      const ids = (aulas ?? []).map((a: any) => a.id).filter(Boolean);
      if (ids.length === 0) return {} as Record<string, AulaProgresso>;

      const { data, error } = await supabase
        .from("aulas_progresso")
        .select("user_id,aula_id,concluido,progresso_segundos,updated_at")
        .eq("user_id", user.id)
        .in("aula_id", ids);
      if (error) throw error;

      const map: Record<string, AulaProgresso> = {};
      for (const p of data ?? []) map[p.aula_id] = p as any;
      return map;
    },
  });

export const getSignedVideoUrl = async (videoPath: string): Promise<string> => {
  const { data, error } = await supabase.storage.from("course-videos").createSignedUrl(videoPath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
};

export const useAtualizarProgresso = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      aulaId,
      progressoSegundos,
    }: {
      aulaId: string;
      progressoSegundos: number;
    }) => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("aulas_progresso").upsert(
        {
          user_id: user.id,
          aula_id: aulaId,
          progresso_segundos: Math.max(0, Math.floor(progressoSegundos)),
          concluido: false,
        } as any,
        { onConflict: "user_id,aula_id" },
      );
      if (error) throw error;
      return { aulaId };
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["cursos", undefined, "aulas-progresso", "me"] });
      qc.invalidateQueries({ queryKey: ["cursos"] });
      qc.invalidateQueries({ queryKey: ["cursos", vars.aulaId] });
    },
    onError: (e: any) => toast.error(`Erro ao atualizar progresso: ${e?.message ?? "desconhecido"}`),
  });
};

export const useMarcarConcluida = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ aulaId }: { aulaId: string }) => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("aulas_progresso").upsert(
        {
          user_id: user.id,
          aula_id: aulaId,
          concluido: true,
        } as any,
        { onConflict: "user_id,aula_id" },
      );
      if (error) throw error;
      return { aulaId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cursos"] });
      toast.success("Aula marcada como concluída");
    },
    onError: (e: any) => toast.error(`Erro ao marcar concluída: ${e?.message ?? "desconhecido"}`),
  });
};

export const useDesmarcarConcluida = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ aulaId }: { aulaId: string }) => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("aulas_progresso").upsert(
        {
          user_id: user.id,
          aula_id: aulaId,
          concluido: false,
        } as any,
        { onConflict: "user_id,aula_id" },
      );
      if (error) throw error;
      return { aulaId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cursos"] });
      toast.success("Aula desmarcada");
    },
    onError: (e: any) => toast.error(`Erro ao desmarcar: ${e?.message ?? "desconhecido"}`),
  });
};

