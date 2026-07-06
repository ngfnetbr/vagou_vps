import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
type AppRole = string;

export interface Permissao {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  modulo: string;
}

// Função auxiliar para corrigir problemas de encoding (Mojibake)
// Corrige caracteres UTF-8 que foram interpretados como Latin-1
// Ex: "ConfiguraÃ§Ãµes" -> "Configurações"
function fixString(str: string): string {
  if (!str) return str;
  try {
    // Verifica se existem caracteres que indicam possível erro de encoding
    let hasHighChars = false;
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) > 127) {
        hasHighChars = true;
        break;
      }
    }
    
    if (!hasHighChars) return str;

    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return decoder.decode(bytes);
  } catch (e) {
    return str;
  }
}

function fixPermissao(perm: Permissao): Permissao {
  return {
    ...perm,
    nome: fixString(perm.nome),
    descricao: perm.descricao ? fixString(perm.descricao) : null,
    modulo: fixString(perm.modulo),
  };
}

export interface RolePermissao {
  id: string;
  role: string;
  permissao_id: string;
  permissao?: Permissao;
}

// Hook para buscar todas as permissões
export const usePermissoes = () => {
  return useQuery({
    queryKey: ["permissoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissoes")
        .select("*")
        .order("modulo, nome");

      if (error) throw error;
      
      return (data as Permissao[]).map(fixPermissao);
    },
  });
};

// Hook para buscar permissões agrupadas por módulo
export const usePermissoesPorModulo = () => {
  const { data: permissoes, ...rest } = usePermissoes();

  const permissoesPorModulo = permissoes?.reduce((acc, perm) => {
    if (!acc[perm.modulo]) {
      acc[perm.modulo] = [];
    }
    acc[perm.modulo].push(perm);
    return acc;
  }, {} as Record<string, Permissao[]>);

  return { data: permissoesPorModulo, ...rest };
};

// Hook para buscar permissões de um papel específico
export const useRolePermissoes = (role: AppRole) => {
  return useQuery({
    queryKey: ["role-permissoes", role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissoes")
        .select(`
          id,
          role,
          permissao_id,
          permissao:permissoes (*)
        `)
        .eq("role", role);

      if (error) throw error;
      
      const rolePermissoes = data as unknown as RolePermissao[];
      return rolePermissoes.map(rp => ({
        ...rp,
        permissao: rp.permissao ? fixPermissao(rp.permissao) : undefined
      }));
    },
    enabled: !!role,
  });
};

// Hook para verificar se usuário tem uma permissão específica
export const useHasPermission = (permissionCode: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-permission", user?.id, permissionCode],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .rpc("has_permission", {
          _user_id: user.id,
          _permission_code: permissionCode,
        });

      if (error) throw error;
      return data as boolean;
    },
    enabled: !!user?.id && !!permissionCode,
  });
};

// Hook simplificado para verificar permissão (retorna boolean direto)
export const usePermission = (permissionCode: string): boolean => {
  const { data: hasPermission } = useHasPermission(permissionCode);
  return hasPermission ?? false;
};

// Hook para verificar múltiplas permissões de uma vez
export const usePermissions = (permissionCodes: string[]): Record<string, boolean> => {
  const { data: userPermissions } = useUserPermissions();
  
  return permissionCodes.reduce((acc, code) => {
    acc[code] = userPermissions?.includes(code) ?? false;
    return acc;
  }, {} as Record<string, boolean>);
};

// Hook para verificar múltiplas permissões
export const useUserPermissions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const moduleAccessCodes = ["modulos.vagou.acessar", "modulos.sam.acessar", "modulos.sondagem.acessar"] as const;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;

      const roles = data.map(r => r.role);
      
      const { data: permissoes, error: permError } = await supabase
        .from("role_permissoes")
        .select("permissoes!inner(codigo)")
        .in("role", roles);

      if (permError) throw permError;

      type RolePermissaoJoinRow = { permissoes: { codigo: string } | null };
      const rows = (permissoes ?? []) as unknown as RolePermissaoJoinRow[];
      const roleCodes = rows.map((p) => p.permissoes?.codigo).filter((codigo): codigo is string => Boolean(codigo));

      const { data: userPermRows, error: userPermError } = await supabase
        .from("user_permissoes")
        .select("permissoes!inner(codigo)")
        .eq("user_id", user.id);

      if (userPermError) throw userPermError;

      type UserPermissaoJoinRow = { permissoes: { codigo: string } | null };
      const upRows = (userPermRows ?? []) as unknown as UserPermissaoJoinRow[];
      const userCodes = upRows.map((p) => p.permissoes?.codigo).filter((codigo): codigo is string => Boolean(codigo));

      const hasExplicitModuleConfig = userCodes.some((c) => (moduleAccessCodes as readonly string[]).includes(c));
      const effectiveRoleCodes = hasExplicitModuleConfig
        ? roleCodes.filter((c) => !(moduleAccessCodes as readonly string[]).includes(c))
        : roleCodes;

      return [...new Set([...effectiveRoleCodes, ...userCodes])];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};

// Hook para adicionar permissão a um papel
export const useAddRolePermissao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role, permissaoId }: { role: AppRole; permissaoId: string }) => {
      const { error } = await supabase
        .from("role_permissoes")
        .insert({ role, permissao_id: permissaoId });

      if (error) throw error;
    },
    onSuccess: (_, { role }) => {
      queryClient.invalidateQueries({ queryKey: ["role-permissoes", role] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    },
  });
};

// Hook para remover permissão de um papel
export const useRemoveRolePermissao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role, permissaoId }: { role: AppRole; permissaoId: string }) => {
      const { error } = await supabase
        .from("role_permissoes")
        .delete()
        .eq("role", role)
        .eq("permissao_id", permissaoId);

      if (error) throw error;
    },
    onSuccess: (_, { role }) => {
      queryClient.invalidateQueries({ queryKey: ["role-permissoes", role] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    },
  });
};

// Hook para atualizar todas as permissões de um papel de uma vez
export const useUpdateRolePermissoes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role, permissaoIds }: { role: AppRole; permissaoIds: string[] }) => {
      const { error } = await supabase.rpc("set_role_permissoes", {
        target_role: role,
        permissao_ids: permissaoIds,
      });

      if (error) throw error;
    },
    onSuccess: (_, { role }) => {
      queryClient.invalidateQueries({ queryKey: ["role-permissoes", role] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
      toast.success("Permissões atualizadas com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar permissões: " + error.message);
    },
  });
};
