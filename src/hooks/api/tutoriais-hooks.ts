import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ==================== VÍDEOS ====================

export interface TutorialVideo {
  id: string;
  titulo: string;
  descricao: string | null;
  youtube_id: string;
  duracao: string | null;
  thumbnail_url: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

export interface TutorialVideoInput {
  titulo: string;
  descricao?: string;
  youtube_id: string;
  duracao?: string;
  thumbnail_url?: string;
  ordem?: number;
  ativo?: boolean;
}

export const useTutoriaisVideos = () => {
  return useQuery({
    queryKey: ["tutoriais-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutoriais_videos")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as TutorialVideo[];
    },
  });
};

export const useTutoriaisVideosTodos = () => {
  return useQuery({
    queryKey: ["tutoriais-videos-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutoriais_videos")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as TutorialVideo[];
    },
  });
};

export const useCreateTutorialVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (video: TutorialVideoInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("tutoriais_videos")
        .insert({
          ...video,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutoriais-videos"] });
      queryClient.invalidateQueries({ queryKey: ["tutoriais-videos-todos"] });
      toast.success("Vídeo adicionado com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar vídeo: " + error.message);
    },
  });
};

export const useUpdateTutorialVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...video }: Partial<TutorialVideo> & { id: string }) => {
      const { data, error } = await supabase
        .from("tutoriais_videos")
        .update(video)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutoriais-videos"] });
      queryClient.invalidateQueries({ queryKey: ["tutoriais-videos-todos"] });
      toast.success("Vídeo atualizado com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar vídeo: " + error.message);
    },
  });
};

export const useDeleteTutorialVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tutoriais_videos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutoriais-videos"] });
      queryClient.invalidateQueries({ queryKey: ["tutoriais-videos-todos"] });
      toast.success("Vídeo removido com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover vídeo: " + error.message);
    },
  });
};

// ==================== SEÇÕES DO GUIA ====================

export interface TutorialSecao {
  id: string;
  titulo: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  conteudo: { subtitle: string; text: string }[];
  created_at: string;
  updated_at: string;
}

export interface TutorialSecaoInput {
  titulo: string;
  descricao?: string;
  icone?: string;
  ordem?: number;
  ativo?: boolean;
  conteudo: { subtitle: string; text: string }[];
}

export const useTutorialSecoes = () => {
  return useQuery({
    queryKey: ["tutorial-secoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutorial_secoes")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      
      // Parse conteudo JSON para array tipado
      return (data || []).map((item) => ({
        ...item,
        conteudo: (item.conteudo as unknown as { subtitle: string; text: string }[]) || [],
      })) as TutorialSecao[];
    },
  });
};

export const useCreateTutorialSecao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (secao: TutorialSecaoInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("tutorial_secoes")
        .insert({
          ...secao,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorial-secoes"] });
      toast.success("Seção adicionada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar seção: " + error.message);
    },
  });
};

export const useUpdateTutorialSecao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...secao }: Partial<TutorialSecao> & { id: string }) => {
      const { data, error } = await supabase
        .from("tutorial_secoes")
        .update(secao)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorial-secoes"] });
      toast.success("Seção atualizada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar seção: " + error.message);
    },
  });
};

export const useDeleteTutorialSecao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tutorial_secoes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorial-secoes"] });
      toast.success("Seção removida com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover seção: " + error.message);
    },
  });
};

// ==================== FAQ ====================

export interface TutorialFaq {
  id: string;
  categoria: string;
  pergunta: string;
  resposta: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TutorialFaqInput {
  categoria: string;
  pergunta: string;
  resposta: string;
  ordem?: number;
  ativo?: boolean;
}

export const useTutorialFaq = () => {
  return useQuery({
    queryKey: ["tutorial-faq"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutorial_faq")
        .select("*")
        .order("categoria", { ascending: true })
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as TutorialFaq[];
    },
  });
};

export const useCreateTutorialFaq = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (faq: TutorialFaqInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("tutorial_faq")
        .insert({
          ...faq,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorial-faq"] });
      toast.success("FAQ adicionado com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar FAQ: " + error.message);
    },
  });
};

export const useUpdateTutorialFaq = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...faq }: Partial<TutorialFaq> & { id: string }) => {
      const { data, error } = await supabase
        .from("tutorial_faq")
        .update(faq)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorial-faq"] });
      toast.success("FAQ atualizado com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar FAQ: " + error.message);
    },
  });
};

export const useDeleteTutorialFaq = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tutorial_faq")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorial-faq"] });
      toast.success("FAQ removido com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover FAQ: " + error.message);
    },
  });
};

// ==================== DICAS ====================

export interface TutorialDica {
  id: string;
  titulo: string;
  descricao: string;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

export interface TutorialDicaInput {
  titulo: string;
  descricao: string;
  icone?: string;
  ordem?: number;
  ativo?: boolean;
}

export const useTutorialDicas = () => {
  return useQuery({
    queryKey: ["tutorial-dicas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutorial_dicas")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as TutorialDica[];
    },
  });
};

export const useCreateTutorialDica = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dica: TutorialDicaInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("tutorial_dicas")
        .insert({
          ...dica,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorial-dicas"] });
      toast.success("Dica adicionada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar dica: " + error.message);
    },
  });
};

export const useUpdateTutorialDica = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dica }: Partial<TutorialDica> & { id: string }) => {
      const { data, error } = await supabase
        .from("tutorial_dicas")
        .update(dica)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorial-dicas"] });
      toast.success("Dica atualizada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar dica: " + error.message);
    },
  });
};

export const useDeleteTutorialDica = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tutorial_dicas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorial-dicas"] });
      toast.success("Dica removida com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover dica: " + error.message);
    },
  });
};

// ==================== UTILS ====================

export const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const getYoutubeThumbnail = (youtubeId: string): string => {
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
};

// Mapa de ícones para usar nas seções
export const iconMap: Record<string, string> = {
  "layout-dashboard": "LayoutDashboard",
  "file-text": "FileText",
  "list-ordered": "ListOrdered",
  "bell": "Bell",
  "graduation-cap": "GraduationCap",
  "building": "Building",
  "message-circle": "MessageCircle",
  "users": "Users",
  "file-search": "FileSearch",
  "bar-chart": "BarChart",
  "settings": "Settings",
  "calendar": "Calendar",
  "help-circle": "HelpCircle",
  "info": "Info",
  "check-circle-2": "CheckCircle2",
  "alert-circle": "AlertCircle",
  "keyboard": "Keyboard",
  "filter": "Filter",
  "download": "Download",
  "moon": "Moon",
};
