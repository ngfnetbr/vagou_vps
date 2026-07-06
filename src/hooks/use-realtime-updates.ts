import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isSoundEnabled, isToastEnabled } from './use-notification-preferences';

// Notification sound function
const playNotificationSound = () => {
  // Check if sound is enabled in preferences
  if (!isSoundEnabled()) return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Could not play notification sound:', e);
  }
};

// Force play sound (ignores preferences, for testing)
const forcePlayNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Could not play notification sound:', e);
  }
};

// Show toast if enabled in preferences
const showNotificationToast = (title: string, description: string, type: 'success' | 'info' | 'warning' = 'info') => {
  if (!isToastEnabled()) return;
  
  if (type === 'success') {
    toast.success(title, { description, duration: 3000 });
  } else if (type === 'warning') {
    toast.warning(title, { description, duration: 3000 });
  } else {
    toast.info(title, { description, duration: 3000 });
  }
};

interface RealtimeUpdateOptions {
  table: 'criancas' | 'historico' | 'notificacoes_log' | 'auditoria';
  queryKey: string[];
  onInsert?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  showToast?: boolean;
  playSound?: boolean;
}

export const useRealtimeUpdates = ({
  table,
  queryKey,
  onInsert,
  onUpdate,
  onDelete,
  showToast = true,
  playSound = false
}: RealtimeUpdateOptions) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`[Realtime] INSERT in ${table}:`, payload);
          
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey });
          
          if (playSound) {
            playNotificationSound();
          }
          
          if (showToast) {
            showNotificationToast('Dados atualizados', 'Novo registro adicionado', 'success');
          }
          
          onInsert?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`[Realtime] UPDATE in ${table}:`, payload);
          
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey });
          
          if (showToast) {
            showNotificationToast('Dados atualizados', 'Registro modificado', 'info');
          }
          
          onUpdate?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`[Realtime] DELETE in ${table}:`, payload);
          
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey });
          
          if (showToast) {
            showNotificationToast('Dados atualizados', 'Registro removido', 'warning');
          }
          
          onDelete?.();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for ${table}:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Successfully subscribed to ${table} changes`);
        }
      });

    // Cleanup
    return () => {
      console.log(`[Realtime] Unsubscribing from ${table} changes`);
      supabase.removeChannel(channel);
    };
  }, [table, queryKey, onInsert, onUpdate, onDelete, showToast, playSound, queryClient]);
};

// Hook especializado para atualizações de crianças
export const useCriancasRealtimeUpdates = (showToast = true) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('criancas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'criancas'
        },
        (payload) => {
          console.log('[Realtime] Change in criancas:', payload);
          
          // Invalidar TODAS as queries relacionadas a crianças (usando predicate para pegar queries com filtros)
          queryClient.invalidateQueries({ predicate: (query) => {
            const key = query.queryKey[0];
            return key === 'admin-criancas' || 
                   key === 'admin-fila' || 
                   key === 'convocacoes-pendentes' ||
                   key === 'criancas-aguardando-docs' ||
                   key === 'criancas-com-docs-pendentes' ||
                   key === 'dashboard-stats' ||
                   key === 'dashboard-novas-inscricoes' ||
                   key === 'fila-stats' ||
                   key === 'fila-publica' ||
                   key === 'historico-fila' ||
                   key === 'admin-matriculas';
          }});
          
          if (showToast && payload.eventType === 'UPDATE') {
            showNotificationToast('Dados atualizados', 'Registro de criança atualizado', 'info');
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status for criancas:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to criancas changes');
        }
      });

    return () => {
      console.log('[Realtime] Unsubscribing from criancas changes');
      supabase.removeChannel(channel);
    };
  }, [queryClient, showToast]);
};

// Hook especializado para atualizações de histórico (logs)
export const useHistoricoRealtimeUpdates = (showToast = false, playSound = false) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('historico-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'historico'
        },
        (payload) => {
          console.log('[Realtime] Change in historico:', payload);
          
          // Invalidar todas as queries relacionadas a logs e históricos
          queryClient.invalidateQueries({ queryKey: ['logs'] });
          queryClient.invalidateQueries({ queryKey: ['crianca-historico'] });
          queryClient.invalidateQueries({ queryKey: ['historico-geral'] });
          queryClient.invalidateQueries({ queryKey: ['atividades-recentes'] });
          queryClient.invalidateQueries({ queryKey: ['historico-fila'] });
          queryClient.invalidateQueries({ queryKey: ['historico-matriculas'] });
          
          if (playSound) {
            playNotificationSound();
          }
          
          if (showToast && payload.eventType === 'INSERT') {
            showNotificationToast('Novo log registrado', 'Nova atividade no sistema', 'success');
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status for historico-logs:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to historico changes');
        }
      });

    return () => {
      console.log('[Realtime] Unsubscribing from historico-logs changes');
      supabase.removeChannel(channel);
    };
  }, [queryClient, showToast, playSound]);
};

// Hook especializado para atualizações de notificações
export const useNotificacoesRealtimeUpdates = (showToast = false) => {
  return useRealtimeUpdates({
    table: 'notificacoes_log',
    queryKey: ['notificacoes-log'],
    showToast,
  });
};

// Hook especializado para atualizações de auditoria com som
export const useAuditoriaRealtimeUpdates = (showToast = true, playSound = true) => {
  return useRealtimeUpdates({
    table: 'auditoria',
    queryKey: ['auditoria'],
    showToast,
    playSound,
  });
};

// Hook genérico para qualquer tabela com query key customizada
export const useTableRealtimeUpdates = (
  table: 'criancas' | 'historico' | 'notificacoes_log' | 'auditoria',
  queryKeys: string[],
  showToast = false,
  playSound = false
) => {
  return useRealtimeUpdates({
    table,
    queryKey: queryKeys,
    showToast,
    playSound,
  });
};

// Export the sound functions for use elsewhere
// playNotificationSound respects preferences, forcePlayNotificationSound ignores them
export { playNotificationSound, forcePlayNotificationSound };
