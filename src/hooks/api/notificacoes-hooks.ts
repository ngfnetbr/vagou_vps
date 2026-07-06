import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoNotificacao = 'inscricao_fila' | 'inscricao_realizada' | 'convocacao' | 'matricula' | 'matricula_confirmada' | 'remanejamento' | 'remanejamento_concluido' | 'remanejamento_solicitado' | 'remanejamento_aprovado' | 'lembrete' | 'lembrete_prazo' | 'lembrete_assinatura' | 'documento_recusado' | 'documentos_aprovados' | 'desistencia' | 'recusa' | 'fim_fila' | 'prazo_expirado' | 'transferencia';

interface EnviarNotificacaoParams {
  crianca_id: string;
  tipo: TipoNotificacao;
  dados_adicionais?: Record<string, any>;
}

export const useEnviarNotificacao = () => {
  return useMutation({
    mutationFn: async ({ crianca_id, tipo, dados_adicionais }: EnviarNotificacaoParams) => {
      const { data, error } = await supabase.functions.invoke('enviar-notificacao', {
        body: {
          crianca_id,
          tipo,
          dados_adicionais,
        },
      });

      if (error) {
        console.error('Erro ao enviar notificação:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('Notificação enviada com sucesso:', data);
      
      // Verificar se algum canal teve sucesso
      const algumSucesso = data?.resultados?.some((r: any) => r.sucesso);
      
      if (algumSucesso) {
        toast.success('Notificação enviada com sucesso!');
      } else {
        toast.warning('Notificação processada mas nenhum canal teve sucesso');
      }
    },
    onError: (error: any) => {
      console.error('Erro na mutation de notificação:', error);
      toast.error('Erro ao enviar notificação: ' + error.message);
    },
  });
};
