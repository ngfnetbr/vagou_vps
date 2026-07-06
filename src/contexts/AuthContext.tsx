import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { usePresenceTracker } from "@/hooks/use-presence";
import { useSingleSession } from "@/hooks/use-single-session";

interface UserProfile {
  nome_completo: string | null;
  cpf: string | null;
  telefone: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
  nome?: string | null;
  role?: string | null;
  school_id?: string | null;
  cmei_id?: string | null;
}

interface LegacyModuleProfile {
  id: string;
  email: string | null;
  nome: string | null;
  nome_completo: string | null;
  full_name: string | null;
  cpf: string | null;
  telefone: string | null;
  avatar_url: string | null;
  role: string | null;
  school_id: string | null;
  cmei_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: string[];
  userProfile: UserProfile | null;
  profile: LegacyModuleProfile | null;
  role: string | null;
  isLoading: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: SignUpData) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  getPrimaryRole: () => string;
}

interface SignUpData {
  nome_completo: string;
  cpf: string;
  telefone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSamCompatibleRole(userRoles: string[]) {
  if (userRoles.includes("superadmin") || userRoles.includes("admin") || userRoles.includes("gestor")) {
    return "admin";
  }
  if (userRoles.includes("school_coord")) {
    return "school_coord";
  }
  if (userRoles.includes("responsavel")) {
    return "responsavel";
  }
  return userRoles[0] ?? null;
}

function getSondagemCompatibleRole(userRoles: string[]) {
  if (userRoles.includes("superadmin") || userRoles.includes("admin")) {
    return "admin";
  }
  if (userRoles.includes("gestor")) {
    return "equipe_pedagogica";
  }
  if (userRoles.includes("responsavel")) {
    return "responsavel";
  }
  return userRoles[0] ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (!error && data) {
        setUserRoles(data.map((r) => r.role));
      } else {
        setUserRoles([]);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      setUserRoles([]);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("nome, nome_completo, cpf, telefone, avatar_url, cmei_id, school_id")
        .eq("id", userId)
        .maybeSingle();
      
      if (!error && data) {
        setUserProfile(data as UserProfile);
        return data as UserProfile;
      } else {
        setUserProfile(null);
        return null;
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setUserProfile(null);
      return null;
    }
  };

  // Vincula crianças existentes ao responsável pelo CPF (usa função com SECURITY DEFINER)
  const linkChildrenByCpf = async (userId: string, cpf: string | null) => {
    if (!cpf) return;
    
    try {
      const { error } = await supabase.rpc("link_children_by_cpf", {
        _user_id: userId,
        _cpf: cpf,
      });
      
      if (error) {
        console.error("Error linking children by CPF:", error);
      }
    } catch (error) {
      console.error("Error in linkChildrenByCpf:", error);
    }
  };

  const fetchUserData = async (userId: string) => {
    const [, profile] = await Promise.all([
      fetchUserRoles(userId),
      fetchUserProfile(userId)
    ]);
    
    // Vincular crianças pelo CPF após carregar o perfil
    if (profile?.cpf) {
      await linkChildrenByCpf(userId, profile.cpf);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Setup auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Fetch roles and profile in background
        if (currentSession?.user) {
          fetchUserData(currentSession.user.id).finally(() => {
            if (mounted) setIsLoading(false);
          });
        } else {
          setUserRoles([]);
          setUserProfile(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchUserData(currentSession.user.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome_completo: userData.nome_completo,
          cpf: userData.cpf,
          telefone: userData.telefone,
        },
      },
    });

    // Profile with CPF/nome/telefone is now created automatically by database trigger
    // Just link children by CPF if signup was successful
    if (!error && data.user) {
      await linkChildrenByCpf(data.user.id, userData.cpf);
    }

    return { error };
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserRoles([]);
    setUserProfile(null);
    // Não limpar a preferência de área ao sair, para manter a escolha do usuário
    // localStorage.removeItem("vagou_preferred_area");
    navigate("/auth/login");
  }, [navigate]);

  // Monitoramento de inatividade (10 minutos)
  useEffect(() => {
    if (!session) return;

    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos
    let timeoutId: NodeJS.Timeout;
    let lastActivity = Date.now();

    const handleLogout = () => {
      signOut();
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    };

    const handleActivity = () => {
      const now = Date.now();
      // Throttling: atualiza o timer no máximo uma vez por segundo
      if (now - lastActivity > 1000) {
        lastActivity = now;
        resetTimer();
      }
    };

    // Inicializa o timer
    resetTimer();

    // Eventos para monitorar
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [session, signOut]);

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  const isAdmin = () => {
    return userRoles.some((role) =>
      ["admin", "superadmin", "gestor"].includes(role)
    );
  };

  const getPrimaryRole = () => {
    const roleLabels: Record<string, string> = {
      superadmin: "Super Admin",
      admin: "Administrador",
      gestor: "Gestor",
      diretor_cmei: "Diretor (VAGOU)",
      school_coord: "Portal da Escola",
      responsavel: "Responsável",
    };
    
    // Retorna a role mais importante
    const priorityOrder = ["superadmin", "admin", "gestor", "diretor_cmei", "school_coord", "responsavel"];
    for (const role of priorityOrder) {
      if (userRoles.includes(role)) {
        return roleLabels[role] || role;
      }
    }
    return "Usuário";
  };

  const samCompatibleRole = useMemo(() => getSamCompatibleRole(userRoles), [userRoles]);
  const sondagemCompatibleRole = useMemo(() => getSondagemCompatibleRole(userRoles), [userRoles]);

  const legacyProfile = useMemo<LegacyModuleProfile | null>(() => {
    if (!user) return null;

    const displayName =
      userProfile?.nome_completo ||
      user.user_metadata?.nome_completo ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      null;

    return {
      id: user.id,
      email: user.email ?? null,
      nome: userProfile?.nome ?? displayName,
      nome_completo: userProfile?.nome_completo ?? displayName,
      full_name: userProfile?.full_name ?? displayName,
      cpf: userProfile?.cpf ?? null,
      telefone: userProfile?.telefone ?? null,
      avatar_url: userProfile?.avatar_url ?? null,
      role: samCompatibleRole,
      school_id: userProfile?.school_id ?? userProfile?.cmei_id ?? null,
      cmei_id: userProfile?.cmei_id ?? null,
    };
  }, [samCompatibleRole, user, userProfile]);

  // Registra o usuário como "online" (Realtime Presence) para o painel do Super Admin.
  usePresenceTracker(user?.id, user?.email);

  // Sessão única: se outra pessoa logar com a mesma conta, derruba esta sessão.
  const handleSessionKicked = useCallback(() => {
    toast.error("Sua sessão foi encerrada porque sua conta foi acessada em outro dispositivo.");
    supabase.auth.signOut().finally(() => {
      setUserRoles([]);
      setUserProfile(null);
      navigate("/auth/login");
    });
  }, [navigate]);

  useSingleSession(user?.id, handleSessionKicked);


  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRoles,
        userProfile,
        profile: legacyProfile,
        role: sondagemCompatibleRole,
        isLoading,
        loading: isLoading,
        signIn,
        signUp,
        signOut,
        hasRole,
        isAdmin,
        getPrimaryRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
