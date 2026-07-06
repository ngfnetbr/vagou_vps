import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UsuariosPorRole {
  role: string;
  quantidade: number;
}

export interface UsuariosPorStatus {
  status: string;
  quantidade: number;
}

// Hook para estatísticas de usuários por papel
export const useUsuariosPorRole = () => {
  return useQuery({
    queryKey: ["usuarios-stats-role"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role");

      if (error) throw error;

      // Contar por papel
      const contagem: Record<string, number> = {};
      data.forEach((item) => {
        contagem[item.role] = (contagem[item.role] || 0) + 1;
      });

      // Converter para array
      return Object.entries(contagem).map(([role, quantidade]) => ({
        role,
        quantidade,
      })) as UsuariosPorRole[];
    },
  });
};

// Hook para estatísticas de usuários por status (ativo/inativo)
export const useUsuariosPorStatus = () => {
  return useQuery({
    queryKey: ["usuarios-stats-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("ativo");

      if (error) throw error;

      const ativos = data.filter((p) => p.ativo !== false).length;
      const inativos = data.filter((p) => p.ativo === false).length;

      return [
        { status: "Ativos", quantidade: ativos },
        { status: "Inativos", quantidade: inativos },
      ] as UsuariosPorStatus[];
    },
  });
};

// Hook para estatísticas gerais de usuários
export const useUsuariosStats = () => {
  return useQuery({
    queryKey: ["usuarios-stats-geral"],
    queryFn: async () => {
      // Total de usuários
      const { count: total, error: totalError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (totalError) throw totalError;

      // Usuários ativos
      const { count: ativos, error: ativosError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("ativo", false);

      if (ativosError) throw ativosError;

      // Usuários criados hoje
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const { count: novosHoje, error: novosError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", hoje.toISOString());

      if (novosError) throw novosError;

      // Admins
      const { data: admins, error: adminsError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "superadmin"]);

      if (adminsError) throw adminsError;

      const uniqueAdmins = [...new Set(admins.map(a => a.user_id))].length;

      return {
        total: total || 0,
        ativos: ativos || 0,
        inativos: (total || 0) - (ativos || 0),
        novosHoje: novosHoje || 0,
        admins: uniqueAdmins,
      };
    },
  });
};
