import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error-utils";
import { useAuth } from "@/contexts/AuthContext";

// Edge function URL is handled automatically by supabase-js

export type AppRole =
  | "responsavel"
  | "gestor"
  | "admin"
  | "superadmin"
  | "diretor_cmei"
  | "school_coord";
export type ModuleKey = "vagou" | "sam" | "sondagem";

export interface Usuario {
  id: string;
  email: string;
  nome_completo: string | null;
  cpf: string | null;
  telefone: string | null;
  sexo: string | null;
  data_nascimento: string | null;
  avatar_url: string | null;
  created_at: string;
  ativo: boolean;
  roles: AppRole[];
  modules: ModuleKey[];
  cmeis_vinculados?: { id: string; nome: string }[];
}

export interface DiretorCmeiVinculo {
  id: string;
  user_id: string;
  cmei_id: string;
  created_at: string;
  cmei?: { id: string; nome: string };
}

// Buscar todos os usuários com suas roles
export const useUsuarios = (filtroRole?: AppRole, busca?: string) => {
  return useQuery({
    queryKey: ["usuarios", filtroRole, busca],
    queryFn: async () => {
      // Buscar profiles
      let profilesQuery = supabase
        .from("profiles")
        .select("*")
        .order("nome_completo", { ascending: true, nullsFirst: false });
      
      if (busca) {
        profilesQuery = profilesQuery.or(`nome_completo.ilike.%${busca}%,email.ilike.%${busca}%,cpf.ilike.%${busca}%`);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;

      // Buscar todas as roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      const userIds = (profiles || []).map((p) => p.id);
      const modulePermissionCodes = ["modulos.vagou.acessar", "modulos.sam.acessar", "modulos.sondagem.acessar"];
      // Módulos concedidos explicitamente por usuário (user_permissoes)
      const explicitModulesByUserId: Record<string, ModuleKey[]> = {};
      // Módulos concedidos por papel (role_permissoes) -> herdados pelo usuário
      const modulesByRole: Record<string, ModuleKey[]> = {};

      if (userIds.length > 0) {
        const { data: modulePerms, error: modulePermsError } = await supabase
          .from("permissoes")
          .select("id,codigo")
          .in("codigo", modulePermissionCodes);

        if (modulePermsError) throw modulePermsError;

        const permIdToModule = new Map<string, ModuleKey>();
        (modulePerms || []).forEach((p) => {
          if (p.codigo === "modulos.vagou.acessar") permIdToModule.set(p.id, "vagou");
          if (p.codigo === "modulos.sam.acessar") permIdToModule.set(p.id, "sam");
          if (p.codigo === "modulos.sondagem.acessar") permIdToModule.set(p.id, "sondagem");
        });

        const permIds = (modulePerms || []).map((p) => p.id);
        if (permIds.length > 0) {
          // Acesso explícito por usuário
          const { data: userPermRows, error: userPermRowsError } = await supabase
            .from("user_permissoes")
            .select("user_id, permissao_id")
            .in("user_id", userIds)
            .in("permissao_id", permIds);

          if (userPermRowsError) throw userPermRowsError;

          (userPermRows || []).forEach((row) => {
            const mod = permIdToModule.get(row.permissao_id);
            if (!mod) return;
            const cur = explicitModulesByUserId[row.user_id] || [];
            if (!cur.includes(mod)) {
              explicitModulesByUserId[row.user_id] = [...cur, mod];
            }
          });

          // Acesso herdado por papel (role_permissoes)
          const { data: rolePermRows, error: rolePermRowsError } = await supabase
            .from("role_permissoes")
            .select("role, permissao_id")
            .in("permissao_id", permIds);

          if (rolePermRowsError) throw rolePermRowsError;

          (rolePermRows || []).forEach((row) => {
            const mod = permIdToModule.get(row.permissao_id);
            if (!mod) return;
            const cur = modulesByRole[row.role] || [];
            if (!cur.includes(mod)) {
              modulesByRole[row.role] = [...cur, mod];
            }
          });
        }
      }

      const MODULE_ORDER: ModuleKey[] = ["vagou", "sam", "sondagem"];
      const sortModules = (mods: ModuleKey[]) =>
        [...new Set(mods)].sort((a, b) => MODULE_ORDER.indexOf(a) - MODULE_ORDER.indexOf(b));

      // Buscar vínculos de diretores com CMEIs
      const { data: vinculos, error: vinculosError } = await supabase
        .from("diretor_cmei_vinculo")
        .select("user_id, cmei_id, cmeis(id, nome)");
      if (vinculosError) throw vinculosError;

      // Montar lista de usuários
      const usuarios: Usuario[] = (profiles || []).map((profile) => {
        const userRoles = (allRoles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole);

        const effectiveRoles = userRoles.length > 0 ? userRoles : (["responsavel"] as AppRole[]);

        // Precedência (igual ao useUserPermissions): se o usuário tem config
        // explícita de módulo, ela prevalece; senão herda dos papéis.
        const explicit = explicitModulesByUserId[profile.id] || [];
        const inherited = effectiveRoles.flatMap((r) => modulesByRole[r] || []);
        const isSuper = effectiveRoles.includes("superadmin");
        const modules = sortModules(
          isSuper
            ? MODULE_ORDER
            : explicit.length > 0
              ? explicit
              : inherited,
        );

        const userVinculos = (vinculos || [])
          .filter((v) => v.user_id === profile.id)
          .map((v) => ({
            id: (v.cmeis as any)?.id || v.cmei_id,
            nome: (v.cmeis as any)?.nome || "Unidade não encontrada",
          }));

        return {
          id: profile.id,
          email: profile.email || "",
          nome_completo: profile.nome_completo,
          cpf: profile.cpf,
          telefone: profile.telefone,
          sexo: (profile as any).sexo ?? null,
          data_nascimento: (profile as any).data_nascimento ?? null,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at || "",
          ativo: profile.ativo ?? true,
          roles: effectiveRoles,
          modules,
          cmeis_vinculados: userVinculos,
        };
      });

      // Filtrar por role se necessário
      if (filtroRole) {
        return usuarios.filter((u) => u.roles.includes(filtroRole));
      }

      return usuarios;
    },
  });
};

// Buscar roles de um usuário específico
export const useUsuarioRoles = (userId: string) => {
  return useQuery({
    queryKey: ["usuario-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId);
      
      if (error) throw error;
      return data.map((r) => r.role as AppRole);
    },
    enabled: !!userId,
  });
};

// Buscar vínculos de um diretor
export const useDiretorVinculos = (userId: string) => {
  return useQuery({
    queryKey: ["diretor-vinculos", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diretor_cmei_vinculo")
        .select("*, cmeis(id, nome)")
        .eq("user_id", userId);
      
      if (error) throw error;
      return data as DiretorCmeiVinculo[];
    },
    enabled: !!userId,
  });
};

// Adicionar role a um usuário
export const useAddUserRole = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Verificar se já tem a role
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .single();

      if (existing) {
        throw new Error("Usuário já possui este papel");
      }

      const { data, error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["usuario-roles"] });
      toast.success("Papel adicionado com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao adicionar papel: " + getErrorMessage(error));
    },
  });
};

// Remover role de um usuário
export const useRemoveUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["usuario-roles"] });
      toast.success("Papel removido com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao remover papel: " + getErrorMessage(error));
    },
  });
};

// Vincular diretor a CMEI
export const useVincularDiretorCmei = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, cmeiId }: { userId: string; cmeiId: string }) => {
      const { data, error } = await supabase
        .from("diretor_cmei_vinculo")
        .insert({
          user_id: userId,
          cmei_id: cmeiId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["diretor-vinculos"] });
      toast.success("Diretor vinculado à unidade com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao vincular diretor: " + getErrorMessage(error));
    },
  });
};

// Desvincular diretor de CMEI
export const useDesvincularDiretorCmei = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, cmeiId }: { userId: string; cmeiId: string }) => {
      const { error } = await supabase
        .from("diretor_cmei_vinculo")
        .delete()
        .eq("user_id", userId)
        .eq("cmei_id", cmeiId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["diretor-vinculos"] });
      toast.success("Vínculo removido com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao remover vínculo: " + getErrorMessage(error));
    },
  });
};

// Excluir usuário (apenas admin/superadmin)
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("delete_user_admin", {
        target_user_id: userId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao excluir usuário: " + getErrorMessage(error));
    },
  });
};

// Promover responsável a gestor
export const usePromoverUsuario = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, novoRole }: { userId: string; novoRole: AppRole }) => {
      // Adicionar novo role
      const { data, error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: novoRole,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["usuario-roles"] });
      toast.success(`Usuário promovido a ${variables.novoRole} com sucesso!`);
    },
    onError: (error: unknown) => {
      toast.error("Erro ao promover usuário: " + getErrorMessage(error));
    },
  });
};

// Criar usuário via Edge Function
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      nome_completo: string;
      cpf?: string;
      telefone?: string;
      sexo?: string;
      data_nascimento?: string;
      role?: AppRole;
      cmei_id?: string;
      modules?: ModuleKey[];
    }) => {
      const { data: responseData, error } = await supabase.functions.invoke("admin-usuarios", {
        body: {
          action: "create-user",
          ...data,
        },
      });

      if (error) {
        let message = getErrorMessage(error);
        const errAny = error as any;
        const response = errAny?.context?.response;
        if (response && typeof response.text === "function") {
          try {
            const text = await response.text();
            if (text) {
              try {
                const parsed = JSON.parse(text);
                if (parsed?.error && typeof parsed.error === "string") {
                  message = parsed.error;
                } else {
                  message = text;
                }
              } catch {
                message = text;
              }
            }
          } catch {}
        }
        throw new Error(message);
      }

      if (responseData && responseData.error) {
        throw new Error(responseData.error);
      }

      const createdUserId = responseData?.user?.id as string | undefined;
      if (createdUserId) {
        const { error: profileUpsertError } = await supabase.from("profiles").upsert(
          {
            id: createdUserId,
            email: data.email,
            nome_completo: data.nome_completo,
            cpf: data.cpf || null,
            telefone: data.telefone || null,
            sexo: data.sexo || null,
            data_nascimento: data.data_nascimento || null,
          } as any,
          { onConflict: "id" }
        );

        if (profileUpsertError) {
          toast.error("Usuário criado, mas não foi possível salvar os dados do perfil. Verifique as permissões do banco.");
        }
      }

      const modules = data.modules && data.modules.length > 0 ? data.modules : undefined;
      if (createdUserId && modules) {
        const moduleToPermissionCode: Record<(typeof modules)[number], string> = {
          vagou: "modulos.vagou.acessar",
          sam: "modulos.sam.acessar",
          sondagem: "modulos.sondagem.acessar",
        };
        const permissionCodes = Array.from(new Set(modules.map((m) => moduleToPermissionCode[m])));

        const { data: perms, error: permsError } = await supabase
          .from("permissoes")
          .select("id,codigo")
          .in("codigo", permissionCodes);

        if (permsError) throw permsError;

        const rows = (perms || []).map((p) => ({
          user_id: createdUserId,
          permissao_id: p.id,
        }));

        if (rows.length !== permissionCodes.length) {
          throw new Error("Permissões de módulo não encontradas. Verifique as migrações do banco.");
        }

        const { error: upsertError } = await supabase
          .from("user_permissoes")
          .upsert(rows, { onConflict: "user_id,permissao_id" });

        if (upsertError) throw upsertError;
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário criado com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useSetUserModules = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { userId: string; modules: ModuleKey[] }) => {
      const modules = Array.from(new Set(data.modules));
      if (modules.length === 0) {
        throw new Error("Selecione pelo menos um módulo");
      }

      const modulePermissionCodes = ["modulos.vagou.acessar", "modulos.sam.acessar", "modulos.sondagem.acessar"];
      const { data: perms, error: permsError } = await supabase
        .from("permissoes")
        .select("id,codigo")
        .in("codigo", modulePermissionCodes);

      if (permsError) throw permsError;

      const moduleToCode: Record<ModuleKey, string> = {
        vagou: "modulos.vagou.acessar",
        sam: "modulos.sam.acessar",
        sondagem: "modulos.sondagem.acessar",
      };

      const selectedCodes = modules.map((m) => moduleToCode[m]);
      const selectedPermIds = (perms || []).filter((p) => selectedCodes.includes(p.codigo)).map((p) => p.id);
      const allModulePermIds = (perms || []).map((p) => p.id);

      if (selectedPermIds.length !== selectedCodes.length) {
        throw new Error("Permissões de módulo não encontradas. Verifique as migrações do banco.");
      }

      const { error: deleteError } = await supabase
        .from("user_permissoes")
        .delete()
        .eq("user_id", data.userId)
        .in("permissao_id", allModulePermIds);

      if (deleteError) throw deleteError;

      const rows = selectedPermIds.map((permissao_id) => ({
        user_id: data.userId,
        permissao_id,
        created_by: user?.id,
      }));

      const { error: insertError } = await supabase.from("user_permissoes").insert(rows);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Módulos atualizados com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// Atualizar perfil do usuário via Edge Function
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      user_id: string;
      nome_completo?: string;
      cpf?: string;
      telefone?: string;
      sexo?: string;
      data_nascimento?: string;
    }) => {
      const { data: responseData, error } = await supabase.functions.invoke("admin-usuarios", {
        body: {
          action: "update-user",
          ...data,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao atualizar usuário");
      }

      if (responseData && responseData.error) {
        throw new Error(responseData.error);
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Dados atualizados com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// Resetar senha do usuário via Edge Function
export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: async (data: { userId: string; newPassword?: string }) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      let currentSession = sessionData.session;

      if (sessionError) {
        throw new Error("Não foi possível validar a sessão atual. Faça login novamente.");
      }

      if (!currentSession) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        currentSession = refreshed.session;
        if (refreshError || !currentSession) {
          throw new Error("Sua sessão expirou. Faça login novamente para gerar uma nova senha.");
        }
      }
      const { data: responseData, error } = await supabase.functions.invoke("admin-usuarios", {
        body: {
          action: "reset-password",
          user_id: data.userId,
          new_password: data.newPassword,
        },
      });

      if (error) {
        let message = error.message || "Erro ao redefinir senha";
        const errAny = error as any;
        const response = errAny?.context?.response;
        let status: number | null = null;
        try {
          status = response?.status ?? null;
        } catch {}
        if (!status && message === "Edge Function returned a non-2xx status code") {
          message = "Falha ao chamar a função de reset de senha. Se o problema persistir, faça login novamente.";
        }
        if (response && typeof response.text === "function") {
          try {
            const text = await response.text();
            if (text) {
              try {
                const parsed = JSON.parse(text);
                if (parsed?.error && typeof parsed.error === "string") {
                  message = parsed.error;
                } else {
                  message = text;
                }
              } catch {
                message = text;
              }
            }
          } catch {}
        }
        if (status === 401 || /session|jwt|unauthorized|não autorizado/i.test(message)) {
          message = "Sua sessão expirou ou ficou inválida. Faça login novamente e tente gerar a senha mais uma vez.";
        }
        throw new Error(message);
      }

      if (responseData && responseData.error) {
        throw new Error(responseData.error);
      }
      return responseData;
    },
    onSuccess: () => {
      toast.success("Nova senha gerada com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// Alternar status do usuário (ativo/inativo) via Edge Function
export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { user_id: string; ativo: boolean; motivo?: string }) => {
      const { data: responseData, error } = await supabase.functions.invoke("admin-usuarios", {
        body: {
          action: "toggle-user-status",
          ...data,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao alterar status do usuário");
      }

      if (responseData && responseData.error) {
        throw new Error(responseData.error);
      }

      return responseData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success(variables.ativo ? "Usuário ativado com sucesso!" : "Usuário desativado com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// Buscar histórico de alterações de um usuário
export const useUsuarioHistorico = (userId: string | null) => {
  return useQuery({
    queryKey: ["usuario-historico", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .or(`registro_id.eq.${userId},usuario_id.eq.${userId}`)
        .in("tabela", ["profiles", "user_roles", "diretor_cmei_vinculo"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

// Labels dos papéis
export const roleLabels: Record<AppRole, string> = {
  responsavel: "Responsável",
  gestor: "Gestor",
  admin: "Administrador",
  superadmin: "Super Admin",
  diretor_cmei: "Diretor",
  school_coord: "Portal da Escola",
};

// Cores dos badges
export const roleColors: Record<AppRole, string> = {
  responsavel: "bg-gray-100 text-gray-800",
  gestor: "bg-blue-100 text-blue-800",
  admin: "bg-purple-100 text-purple-800",
  superadmin: "bg-red-100 text-red-800",
  diretor_cmei: "bg-green-100 text-green-800",
  school_coord: "bg-emerald-100 text-emerald-800",
};
