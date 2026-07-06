import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error-utils";

async function loadUserActivityFallback(): Promise<UserActivity[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, nome_completo, avatar_url, created_at")
    .order("nome_completo", { ascending: true, nullsFirst: false });

  if (profilesError) throw profilesError;

  const list: UserActivity[] = (profiles ?? []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    nome: profile.nome_completo,
    avatar_url: profile.avatar_url,
    created_at: profile.created_at,
    last_sign_in_at: null,
    email_confirmed_at: null,
    banned_until: null,
  }));

  // Garante que o usuário logado (ex.: superadmin sem linha em profiles) apareça
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !list.some((u) => u.id === user.id)) {
      list.unshift({
        id: user.id,
        email: user.email ?? null,
        nome: (user.user_metadata as any)?.nome_completo ?? null,
        avatar_url: (user.user_metadata as any)?.avatar_url ?? null,
        created_at: user.created_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
        email_confirmed_at: (user as any).email_confirmed_at ?? null,
        banned_until: null,
      });
    }
  } catch {
    /* ignore */
  }

  return list;
}


function getFunctionPayloadError(error: unknown) {
  const errAny = error as any;
  const response = errAny?.context?.response;
  return response && typeof response.text === "function"
    ? response.text().then((text: string) => {
        if (!text) return "";
        try {
          return JSON.parse(text)?.error || text;
        } catch {
          return text;
        }
      })
    : Promise.resolve("");
}

export interface UserActivity {
  id: string;
  email: string | null;
  nome: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
}

async function loadUserActivity(): Promise<UserActivity[]> {
  // Fonte primária: Edge Function que lê o último login real do Auth (auth.users).
  // A tabela `profiles` não armazena last_sign_in_at, por isso precisamos do servidor.
  try {
    const { data, error } = await supabase.functions.invoke("admin-usuarios", {
      body: { action: "list-activity" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (Array.isArray(data?.users)) {
      return data.users as UserActivity[];
    }
    throw new Error("Resposta inválida da função de atividade.");
  } catch (err) {
    console.warn("[useUserActivity] list-activity indisponível, usando fallback:", err);
    return loadUserActivityFallback();
  }
}

export const useUserActivity = () => {
  return useQuery({
    queryKey: ["superadmin-activity"],
    queryFn: loadUserActivity,
    refetchInterval: 30_000,
  });
};

const IMPERSONATION_KEY = "sam_impersonation_origin";

export interface ImpersonationOrigin {
  refresh_token: string;
  access_token: string;
  admin_email: string | null;
  target_email: string | null;
  target_name: string | null;
}

export const useImpersonateUser = () => {
  return useMutation({
    mutationFn: async ({ userId, targetName }: { userId: string; targetName: string | null }) => {
      // Guardar a sessão atual do super admin para poder voltar
      const { data: sessionData } = await supabase.auth.getSession();
      const current = sessionData.session;
      if (!current) throw new Error("Sessão atual não encontrada.");

      const { data, error } = await supabase.functions.invoke("admin-usuarios", {
        body: { action: "impersonate", user_id: userId },
      });
      if (error) {
        const payloadError = await getFunctionPayloadError(error);
        const msg = `${payloadError} ${error instanceof Error ? error.message : ""}`.toLowerCase();
        if (
          msg.includes("failed to fetch") ||
          msg.includes("failed to send a request") ||
          msg.includes("networkerror")
        ) {
          throw new Error(
            'A função de servidor "admin-usuarios" está fora do ar ou não foi publicada no backend. O recurso "Acessar como" precisa dela para gerar a sessão com segurança (não é possível fazer isso pelo navegador).',
          );
        }
        if (payloadError.includes("Ação inválida") || payloadError.includes("not found")) {
          throw new Error('A impersonação ainda não está publicada no backend externo. Publique a Edge Function "admin-usuarios" atualizada.');
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      const origin: ImpersonationOrigin = {
        refresh_token: current.refresh_token,
        access_token: current.access_token,
        admin_email: current.user?.email ?? null,
        target_email: data.target?.email ?? null,
        target_name: targetName,
      };
      localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(origin));

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (verifyError) {
        localStorage.removeItem(IMPERSONATION_KEY);
        throw verifyError;
      }
      return data.target;
    },
    onError: (error: unknown) => {
      toast.error("Erro ao acessar como usuário: " + getErrorMessage(error));
    },
  });
};

export const getImpersonationOrigin = (): ImpersonationOrigin | null => {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationOrigin) : null;
  } catch {
    return null;
  }
};

export const clearImpersonationOrigin = () => localStorage.removeItem(IMPERSONATION_KEY);

export const restoreSuperAdminSession = async () => {
  const origin = getImpersonationOrigin();
  if (!origin) return false;
  const { error } = await supabase.auth.setSession({
    access_token: origin.access_token,
    refresh_token: origin.refresh_token,
  });
  clearImpersonationOrigin();
  if (error) {
    // fallback: força novo login
    await supabase.auth.signOut();
    throw error;
  }
  return true;
};
