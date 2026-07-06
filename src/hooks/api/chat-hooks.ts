import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMensagem {
  id: string;
  crianca_id: string | null;
  responsavel_id: string | null;
  responsavel_telefone: string | null;
  responsavel_nome: string | null;
  direcao: 'admin' | 'responsavel';
  conteudo: string;
  tipo: 'texto' | 'imagem' | 'documento' | 'audio';
  arquivo_url: string | null;
  enviado_por: string | null;
  lida_em: string | null;
  lida_por: string | null;
  reply_to_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversa {
  responsavel_id: string;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  crianca_id: string | null;
  crianca_nome?: string;
  ultima_mensagem: string;
  ultima_data: string;
  nao_lidas: number;
  arquivada?: boolean;
  fixada?: boolean;
  ultima_direcao?: 'admin' | 'responsavel';
  tipo_ultima?: 'texto' | 'imagem' | 'documento' | 'audio';
}

export interface ConversaConfig {
  id: string;
  responsavel_id: string | null;
  responsavel_telefone: string | null;
  arquivada: boolean;
  fixada: boolean;
}

// Hook para buscar configurações de conversas
export const useChatConversasConfig = (enabled = true) => {
  return useQuery({
    queryKey: ['chat-conversas-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_conversas_config')
        .select('*');

      if (error) throw error;
      return (data || []) as ConversaConfig[];
    },
    staleTime: 0,
    enabled,
  });
};

// Hook para buscar lista de conversas agrupadas (para admin)
export const useChatConversas = (incluirArquivadas = false, enabled = true) => {
  const { data: configs = [] } = useChatConversasConfig(enabled);

  return useQuery({
    queryKey: ['chat-conversas', incluirArquivadas],
    queryFn: async () => {
      const { data: mensagens, error } = await supabase
        .from('chat_mensagens')
        .select(`
          id,
          crianca_id,
          responsavel_id,
          responsavel_nome,
          conteudo,
          direcao,
          tipo,
          lida_em,
          created_at,
          criancas:crianca_id (nome),
          profiles:responsavel_id (nome_completo, email)
        `)
        .not('responsavel_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversasMap = new Map<string, Conversa>();
      const configMap = new Map(
        configs
          .filter(c => c.responsavel_id)
          .map(c => [c.responsavel_id!, c])
      );

      mensagens?.forEach((msg: any) => {
        const responsavelId = msg.responsavel_id;
        if (!responsavelId) return;
        
        const config = configMap.get(responsavelId);
        
        if (!conversasMap.has(responsavelId)) {
          conversasMap.set(responsavelId, {
            responsavel_id: responsavelId,
            responsavel_nome: msg.profiles?.nome_completo || msg.responsavel_nome,
            responsavel_email: msg.profiles?.email || null,
            crianca_id: msg.crianca_id,
            crianca_nome: msg.criancas?.nome || null,
            ultima_mensagem: msg.conteudo,
            ultima_data: msg.created_at,
            nao_lidas: 0,
            arquivada: config?.arquivada || false,
            fixada: config?.fixada || false,
            ultima_direcao: msg.direcao,
            tipo_ultima: msg.tipo,
          });
        }

        // Contar mensagens não lidas (enviadas pelo responsável e não lidas pelo admin)
        if (msg.direcao === 'responsavel' && !msg.lida_em) {
          const conversa = conversasMap.get(responsavelId)!;
          conversa.nao_lidas++;
        }
      });

      let conversas = Array.from(conversasMap.values());
      
      // Filtrar arquivadas se necessário
      if (!incluirArquivadas) {
        conversas = conversas.filter(c => !c.arquivada);
      }

      // Ordenar: fixadas primeiro, depois por data
      conversas.sort((a, b) => {
        if (a.fixada && !b.fixada) return -1;
        if (!a.fixada && b.fixada) return 1;
        return new Date(b.ultima_data).getTime() - new Date(a.ultima_data).getTime();
      });

      return conversas;
    },
    enabled,
  });
};

// Hook para buscar apenas conversas arquivadas
export const useChatConversasArquivadas = (enabled = true) => {
  const { data: configs = [] } = useChatConversasConfig(enabled);

  return useQuery({
    queryKey: ['chat-conversas-arquivadas'],
    queryFn: async () => {
      const arquivadosIds = configs
        .filter(c => c.arquivada && c.responsavel_id)
        .map(c => c.responsavel_id!);

      if (arquivadosIds.length === 0) return [];

      const { data: mensagens, error } = await supabase
        .from('chat_mensagens')
        .select(`
          id,
          crianca_id,
          responsavel_id,
          responsavel_nome,
          conteudo,
          direcao,
          tipo,
          lida_em,
          created_at,
          criancas:crianca_id (nome),
          profiles:responsavel_id (nome_completo, email)
        `)
        .in('responsavel_id', arquivadosIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversasMap = new Map<string, Conversa>();
      const configMap = new Map(
        configs
          .filter(c => c.responsavel_id)
          .map(c => [c.responsavel_id!, c])
      );

      mensagens?.forEach((msg: any) => {
        const responsavelId = msg.responsavel_id;
        if (!responsavelId) return;
        
        const config = configMap.get(responsavelId);
        
        if (!conversasMap.has(responsavelId)) {
          conversasMap.set(responsavelId, {
            responsavel_id: responsavelId,
            responsavel_nome: msg.profiles?.nome_completo || msg.responsavel_nome,
            responsavel_email: msg.profiles?.email || null,
            crianca_id: msg.crianca_id,
            crianca_nome: msg.criancas?.nome || null,
            ultima_mensagem: msg.conteudo,
            ultima_data: msg.created_at,
            nao_lidas: 0,
            arquivada: config?.arquivada || false,
            fixada: config?.fixada || false,
            ultima_direcao: msg.direcao,
            tipo_ultima: msg.tipo,
          });
        }

        if (msg.direcao === 'responsavel' && !msg.lida_em) {
          const conversa = conversasMap.get(responsavelId)!;
          conversa.nao_lidas++;
        }
      });

      return Array.from(conversasMap.values());
    },
    enabled,
  });
};

// Hook para buscar mensagens de uma conversa (para admin)
export const useChatMensagens = (responsavelId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['chat-mensagens', responsavelId],
    queryFn: async () => {
      if (!responsavelId) return [];

      const { data, error } = await supabase
        .from('chat_mensagens')
        .select('*')
        .eq('responsavel_id', responsavelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMensagem[];
    },
    enabled: enabled && !!responsavelId,
  });
};

// Hook para buscar mensagens do próprio responsável
export const useMinhasMensagens = (enabled = true) => {
  return useQuery({
    queryKey: ['minhas-mensagens'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('chat_mensagens')
        .select('*')
        .eq('responsavel_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMensagem[];
    },
    enabled,
  });
};

// Hook para enviar mensagem (admin)
export const useEnviarMensagem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      responsavel_id: string;
      mensagem: string;
      crianca_id?: string;
      responsavel_nome?: string;
      tipo?: 'texto' | 'imagem' | 'documento';
      arquivo_url?: string;
      reply_to_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase
        .from('chat_mensagens')
        .insert({
          responsavel_id: params.responsavel_id,
          responsavel_nome: params.responsavel_nome,
          crianca_id: params.crianca_id,
          direcao: 'admin',
          conteudo: params.mensagem,
          tipo: params.tipo || 'texto',
          arquivo_url: params.arquivo_url,
          reply_to_id: params.reply_to_id,
          enviado_por: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-mensagens', variables.responsavel_id] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversas'] });
    },
    onError: (error: any) => {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });
};

// Hook para responsável enviar mensagem
export const useEnviarMensagemResponsavel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      mensagem: string;
      crianca_id?: string;
      tipo?: 'texto' | 'imagem' | 'documento';
      arquivo_url?: string;
      reply_to_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Não autenticado');
      }

      // Buscar dados do profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome_completo')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase
        .from('chat_mensagens')
        .insert({
          responsavel_id: user.id,
          responsavel_nome: profile?.nome_completo,
          crianca_id: params.crianca_id,
          direcao: 'responsavel',
          conteudo: params.mensagem,
          tipo: params.tipo || 'texto',
          arquivo_url: params.arquivo_url,
          reply_to_id: params.reply_to_id,
          enviado_por: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minhas-mensagens'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-nao-lidas'] });
    },
    onError: (error: any) => {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });
};

// Hook para marcar mensagens como lidas (admin marca mensagens do responsável)
export const useMarcarLida = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responsavelId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('chat_mensagens')
        .update({
          lida_em: new Date().toISOString(),
          lida_por: user?.id,
        })
        .eq('responsavel_id', responsavelId)
        .eq('direcao', 'responsavel')
        .is('lida_em', null);

      if (error) throw error;
    },
    onSuccess: (_, responsavelId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-mensagens', responsavelId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversas'] });
      queryClient.invalidateQueries({ queryKey: ['chat-nao-lidas'] });
    },
  });
};

// Hook para responsável marcar mensagens como lidas
export const useMarcarLidaResponsavel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      const { error } = await supabase
        .from('chat_mensagens')
        .update({
          lida_em: new Date().toISOString(),
          lida_por: user.id,
        })
        .eq('responsavel_id', user.id)
        .eq('direcao', 'admin')
        .is('lida_em', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minhas-mensagens'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-nao-lidas'] });
    },
  });
};

// Hook para arquivar/desarquivar conversa
export const useArquivarConversa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ responsavelId, arquivar }: { responsavelId: string; arquivar: boolean }) => {
      const { data: existing } = await supabase
        .from('chat_conversas_config')
        .select('id')
        .eq('responsavel_id', responsavelId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('chat_conversas_config')
          .update({ arquivada: arquivar, updated_at: new Date().toISOString() })
          .eq('responsavel_id', responsavelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chat_conversas_config')
          .insert({ responsavel_id: responsavelId, arquivada: arquivar, fixada: false });
        if (error) throw error;
      }
    },
    onMutate: async ({ responsavelId, arquivar }) => {
      await queryClient.cancelQueries({ queryKey: ['chat-conversas-config'] });
      const previous = queryClient.getQueryData(['chat-conversas-config']);
      
      queryClient.setQueryData(['chat-conversas-config'], (old: ConversaConfig[] | undefined) => {
        if (!old) return [{ id: 'temp', responsavel_id: responsavelId, responsavel_telefone: null, arquivada: arquivar, fixada: false }];
        const existing = old.find(c => c.responsavel_id === responsavelId);
        if (existing) {
          return old.map(c => c.responsavel_id === responsavelId ? { ...c, arquivada: arquivar } : c);
        }
        return [...old, { id: 'temp', responsavel_id: responsavelId, responsavel_telefone: null, arquivada: arquivar, fixada: false }];
      });
      
      return { previous };
    },
    onError: (error: any, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['chat-conversas-config'], context.previous);
      }
      toast.error('Erro ao arquivar conversa: ' + error.message);
    },
    onSettled: (_, __, { arquivar }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversas-config'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversas'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversas-arquivadas'] });
      toast.success(arquivar ? 'Conversa arquivada' : 'Conversa desarquivada');
    },
  });
};

// Hook para fixar/desafixar conversa
export const useFixarConversa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ responsavelId, fixar }: { responsavelId: string; fixar: boolean }) => {
      const { data: existing } = await supabase
        .from('chat_conversas_config')
        .select('id')
        .eq('responsavel_id', responsavelId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('chat_conversas_config')
          .update({ fixada: fixar, updated_at: new Date().toISOString() })
          .eq('responsavel_id', responsavelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chat_conversas_config')
          .insert({ responsavel_id: responsavelId, fixada: fixar, arquivada: false });
        if (error) throw error;
      }
    },
    onMutate: async ({ responsavelId, fixar }) => {
      await queryClient.cancelQueries({ queryKey: ['chat-conversas-config'] });
      const previous = queryClient.getQueryData(['chat-conversas-config']);
      
      queryClient.setQueryData(['chat-conversas-config'], (old: ConversaConfig[] | undefined) => {
        if (!old) return [{ id: 'temp', responsavel_id: responsavelId, responsavel_telefone: null, fixada: fixar, arquivada: false }];
        const existing = old.find(c => c.responsavel_id === responsavelId);
        if (existing) {
          return old.map(c => c.responsavel_id === responsavelId ? { ...c, fixada: fixar } : c);
        }
        return [...old, { id: 'temp', responsavel_id: responsavelId, responsavel_telefone: null, fixada: fixar, arquivada: false }];
      });
      
      return { previous };
    },
    onError: (error: any, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['chat-conversas-config'], context.previous);
      }
      toast.error('Erro ao fixar conversa: ' + error.message);
    },
    onSettled: (_, __, { fixar }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversas-config'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversas'] });
      toast.success(fixar ? 'Conversa fixada' : 'Conversa desafixada');
    },
  });
};

// Hook para excluir conversa (todas as mensagens)
export const useExcluirConversa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responsavelId: string) => {
      // Delete all messages from this conversation
      const { error: msgError } = await supabase
        .from('chat_mensagens')
        .delete()
        .eq('responsavel_id', responsavelId);

      if (msgError) throw msgError;

      // Delete config if exists
      const { error: configError } = await supabase
        .from('chat_conversas_config')
        .delete()
        .eq('responsavel_id', responsavelId);

      if (configError) throw configError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversas'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversas-arquivadas'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversas-config'] });
      queryClient.invalidateQueries({ queryKey: ['chat-nao-lidas'] });
      toast.success('Conversa excluída com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir conversa: ' + error.message);
    },
  });
};

// Hook para buscar filhos de um responsável
export const useCriancasResponsavel = (responsavelId: string | null) => {
  return useQuery({
    queryKey: ['criancas-responsavel', responsavelId],
    queryFn: async () => {
      if (!responsavelId) return [];

      const { data, error } = await supabase
        .from('criancas')
        .select(`
          id,
          nome,
          data_nascimento,
          status,
          cmeis:cmei_atual_id (nome),
          turmas:turma_atual_id (nome)
        `)
        .eq('responsavel_user_id', responsavelId)
        .order('nome');

      if (error) throw error;
      return data || [];
    },
    enabled: !!responsavelId,
  });
};

// Hook para contagem de mensagens não lidas (para admin)
export const useChatNaoLidas = (enabled = true) => {
  const isOnline = useOnlineStatus();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['chat-nao-lidas', user?.id],
    queryFn: async () => {
      if (!isOnline || !user) return 0;
      const { count, error } = await supabase
        .from('chat_mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('direcao', 'responsavel')
        .is('lida_em', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: enabled && isOnline && !!user,
    retry: false,
  });
};

// Hook para contagem de mensagens não lidas (para responsável)
export const useMinhasNaoLidas = (enabled = true) => {
  const isOnline = useOnlineStatus();
  return useQuery({
    queryKey: ['minhas-nao-lidas'],
    queryFn: async () => {
      if (!isOnline) return 0;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('chat_mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('responsavel_id', user.id)
        .eq('direcao', 'admin')
        .is('lida_em', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: enabled && isOnline,
    retry: false,
  });
};

// Hook para escutar novas mensagens em tempo real (admin)
export const useChatRealtime = (responsavelId: string | null, enabled = true) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !responsavelId) return;

    console.log('[Chat Realtime] Subscribing to messages for:', responsavelId);

    // Usar channel name único por responsável para evitar conflitos
    const channelName = `chat-mensagens-${responsavelId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'chat_mensagens',
          filter: `responsavel_id=eq.${responsavelId}`,
        },
        (payload) => {
          console.log('[Chat Realtime] Received event:', payload.eventType, payload);
          // Invalidar imediatamente para atualizar a UI
          queryClient.invalidateQueries({ queryKey: ['chat-mensagens', responsavelId] });
          queryClient.invalidateQueries({ queryKey: ['chat-conversas'] });
          queryClient.invalidateQueries({ queryKey: ['chat-nao-lidas'] });
        }
      )
      .subscribe((status) => {
        console.log('[Chat Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Chat Realtime] Unsubscribing from:', channelName);
      supabase.removeChannel(channel);
    };
  }, [enabled, responsavelId, queryClient]);
};

// Hook para escutar novas mensagens globalmente (admin)
export const useChatGlobalRealtime = (onNewMessage?: (msg: any) => void, enabled = true) => {
  const queryClient = useQueryClient();
  const arquivarConversa = useArquivarConversa();

  useEffect(() => {
    if (!enabled) return;
    console.log('[Chat Global Realtime] Setting up global subscription');
    
    const channel = supabase
      .channel('chat-global-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'chat_mensagens',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          console.log('[Chat Global Realtime] Received event:', payload.eventType, newMessage?.id);
          
          // Se é mensagem do responsável, desarquivar a conversa automaticamente
          if (payload.eventType === 'INSERT' && newMessage?.direcao === 'responsavel' && newMessage?.responsavel_id) {
            const { data: config } = await supabase
              .from('chat_conversas_config')
              .select('arquivada')
              .eq('responsavel_id', newMessage.responsavel_id)
              .maybeSingle();

            if (config?.arquivada) {
              arquivarConversa.mutate({ 
                responsavelId: newMessage.responsavel_id, 
                arquivar: false 
              });
            }
          }

          // Invalidar queries para atualizar a UI
          queryClient.invalidateQueries({ queryKey: ['chat-conversas'] });
          queryClient.invalidateQueries({ queryKey: ['chat-nao-lidas'] });
          
          // Também invalidar as mensagens da conversa específica se tiver responsavel_id
          if (newMessage?.responsavel_id) {
            queryClient.invalidateQueries({ queryKey: ['chat-mensagens', newMessage.responsavel_id] });
          }
          
          if (payload.eventType === 'INSERT' && onNewMessage) {
            onNewMessage(newMessage);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Chat Global Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Chat Global Realtime] Unsubscribing');
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, onNewMessage]);
};

// Hook para escutar novas mensagens (responsável)
export const useMinhasMensagensRealtime = (enabled = true) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('minhas-mensagens-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_mensagens',
            filter: `responsavel_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['minhas-mensagens'] });
            queryClient.invalidateQueries({ queryKey: ['minhas-nao-lidas'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();
  }, [enabled, queryClient]);
};
