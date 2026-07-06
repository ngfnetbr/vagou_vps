import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotificacoesStats {
  total: number;
  sucesso: number;
  falhas: number;
  pendentes: number;
  taxaSucesso: number;
  porCanal: {
    canal: string;
    total: number;
    sucesso: number;
    falhas: number;
  }[];
  porTipo: {
    tipo: string;
    total: number;
    sucesso: number;
  }[];
  recentes: any[];
}

// Estatísticas gerais de notificações
export const useNotificacoesStats = (periodo: 'hoje' | '7dias' | '30dias' | 'tudo' = '30dias') => {
  return useQuery({
    queryKey: ["notificacoes-stats", periodo],
    queryFn: async () => {
      let dataInicio = new Date();
      
      switch (periodo) {
        case 'hoje':
          dataInicio.setHours(0, 0, 0, 0);
          break;
        case '7dias':
          dataInicio.setDate(dataInicio.getDate() - 7);
          break;
        case '30dias':
          dataInicio.setDate(dataInicio.getDate() - 30);
          break;
        case 'tudo':
          dataInicio = new Date(2000, 0, 1); // Data muito antiga para pegar todos
          break;
      }

      let query = supabase
        .from("notificacoes_log")
        .select("*")
        .eq('canal', 'whatsapp') // Apenas WhatsApp
        .neq('tipo', 'posicao_fila'); // Excluir notificações de posição na fila

      if (periodo !== 'tudo') {
        query = query.gte('created_at', dataInicio.toISOString());
      }

      const { data: logs, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const total = logs?.length || 0;
      const sucesso = logs?.filter(l => l.status === 'sucesso').length || 0;
      const falhas = logs?.filter(l => l.status === 'falha').length || 0;
      const pendentes = logs?.filter(l => l.status === 'pendente').length || 0;
      const taxaSucesso = total > 0 ? Math.round((sucesso / total) * 100) : 0;

      // Estatísticas por canal
      const canais = ['email', 'sms', 'whatsapp'];
      const porCanal = canais.map(canal => {
        const logsCanal = logs?.filter(l => l.canal === canal) || [];
        return {
          canal,
          total: logsCanal.length,
          sucesso: logsCanal.filter(l => l.status === 'sucesso').length,
          falhas: logsCanal.filter(l => l.status === 'falha').length,
        };
      });

      // Estatísticas por tipo (apenas tipos de WhatsApp relevantes)
      const tipos = ['inscricao_fila', 'convocacao', 'matricula', 'lembrete', 'fim_fila', 'desistencia', 'recusa', 'remanejamento_solicitado', 'remanejamento_concluido'];
      const porTipo = tipos.map(tipo => {
        const logsTipo = logs?.filter(l => l.tipo === tipo) || [];
        return {
          tipo,
          total: logsTipo.length,
          sucesso: logsTipo.filter(l => l.status === 'sucesso').length,
        };
      }).filter(t => t.total > 0); // Só mostrar tipos com registros

      // Notificações recentes (últimas 10)
      const recentes = logs?.slice(0, 10) || [];

      return {
        total,
        sucesso,
        falhas,
        pendentes,
        taxaSucesso,
        porCanal,
        porTipo,
        recentes,
      } as NotificacoesStats;
    },
  });
};

// Logs detalhados com paginação
export const useNotificacoesLogs = (
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    canal?: string;
    tipo?: string;
    status?: string;
    search?: string;
  }
) => {
  return useQuery({
    queryKey: ["notificacoes-logs", page, pageSize, filters],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      
      let query = supabase
        .from("notificacoes_log")
        .select("*, criancas(nome, responsavel_nome)", { count: 'exact' })
        .neq('tipo', 'posicao_fila'); // Excluir notificações de posição na fila

      if (filters?.canal && filters.canal !== 'all') {
        query = query.eq('canal', filters.canal);
      }

      if (filters?.tipo && filters.tipo !== 'all') {
        query = query.eq('tipo', filters.tipo);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(
          `destinatario_nome.ilike.%${filters.search}%,destinatario_contato.ilike.%${filters.search}%`
        );
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });
};

// Taxa de resposta dos responsáveis
export const useTaxaResposta = () => {
  return useQuery({
    queryKey: ["taxa-resposta"],
    queryFn: async () => {
      // Buscar convocações
      const { data: convocacoes, error: convError } = await supabase
        .from("notificacoes_log")
        .select("crianca_id, created_at")
        .eq("tipo", "convocacao")
        .eq("status", "sucesso");

      if (convError) throw convError;

      // Para cada convocação, verificar se teve resposta (matrícula ou recusa)
      const convocacoesComResposta = [];
      const convocacoesSemResposta = [];

      for (const conv of convocacoes || []) {
        const { data: respostas } = await supabase
          .from("historico")
          .select("*")
          .eq("crianca_id", conv.crianca_id)
          .in("acao", ["Matrícula Efetivada", "Recusa de Convocação"])
          .gte("created_at", conv.created_at);

        if (respostas && respostas.length > 0) {
          convocacoesComResposta.push(conv);
        } else {
          convocacoesSemResposta.push(conv);
        }
      }

      const total = convocacoes?.length || 0;
      const respondidas = convocacoesComResposta.length;
      const taxaResposta = total > 0 ? Math.round((respondidas / total) * 100) : 0;

      return {
        total,
        respondidas,
        naoRespondidas: convocacoesSemResposta.length,
        taxaResposta,
      };
    },
  });
};
