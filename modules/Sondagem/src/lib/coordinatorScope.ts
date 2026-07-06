import { useQuery } from "@tanstack/react-query";
import { supabase } from "@sondagem/integrations/supabase/client";
import { useAuth } from "@root/contexts/AuthContext";

interface ScopedUserProfile {
  cmei_id?: string | null;
  school_id?: string | null;
}

export function getCoordinatorSchoolId(
  role: string | null | undefined,
  userProfile: ScopedUserProfile | null | undefined,
) {
  if (role !== "coordenador") return undefined;
  return userProfile?.cmei_id || userProfile?.school_id || undefined;
}

export function useCoordinatorSchoolId() {
  const { role, user, userProfile } = useAuth();
  const profileSchoolId = getCoordinatorSchoolId(role, userProfile);

  const { data: linkedSchoolId } = useQuery({
    queryKey: ["sondagem-coordinator-school", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("diretor_cmei_vinculo")
        .select("cmei_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.cmei_id || null;
    },
    enabled: role === "coordenador" && !!user?.id && !profileSchoolId,
  });

  return profileSchoolId || linkedSchoolId || undefined;
}
