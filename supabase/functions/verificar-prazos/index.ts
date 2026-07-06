import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

const isSafeWebhookUrl = (raw: string) => {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (/^(10|127)\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
};

interface Crianca {
  id: string;
  nome: string;
  responsavel_nome: string;
  responsavel_email: string | null;
  responsavel_telefone: string;
  responsavel_celular: string | null;
  convocacao_deadline: string;
  status: string;
  cmei_atual_id: string | null;
  turma_atual_id: string | null;
}

interface Config {
  webhook_url_notificacao: string | null;
  notificacao_whatsapp: boolean;
  notificacao_email: boolean;
  mover_automatico_prazo_vencido: boolean;
  dias_antecedencia_lembrete: number;
}

interface Resultado {
  crianca_id: string;
  crianca_nome: string;
  tipo?: string;
  dias_restantes?: number;
  webhook_enviado?: boolean;
  motivo?: string;
  status?: string;
  nova_posicao?: number;
  deadline?: string;
  acao_automatica?: boolean;
}

async function processarLembrete(
  supabaseClient: any,
  crianca: Crianca,
  hoje: Date,
  config: Config | null,
  resultados: Resultado[]
) {
  const deadline = new Date(crianca.convocacao_deadline);
  const diasRestantes = Math.ceil((deadline.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log(`[Verificar Prazos] Processando lembrete para ${crianca.nome} - ${diasRestantes} dia(s) restante(s)`);

  // Verificar se já enviou lembrete hoje
  const { data: lembreteExistente } = await supabaseClient
    .from('notificacoes_log')
    .select('id')
    .eq('crianca_id', crianca.id)
    .eq('tipo', 'lembrete')
    .gte('created_at', hoje.toISOString())
    .limit(1);

  if (lembreteExistente && lembreteExistente.length > 0) {
    console.log(`[Verificar Prazos] Lembrete já enviado hoje para ${crianca.nome}, pulando...`);
    return;
  }

  const mensagem = diasRestantes === 0 
    ? `URGENTE: Hoje é o último dia para responder à convocação de ${crianca.nome}!`
    : diasRestantes === 1
    ? `ATENÇÃO: Amanhã vence o prazo para responder à convocação de ${crianca.nome}.`
    : `Lembrete: Faltam ${diasRestantes} dias para responder à convocação de ${crianca.nome}.`;

  // Quando o prazo está próximo de vencer (dentro da antecedência configurada),
  // envia automaticamente para o contato alternativo (Telefone de contato 2 = responsavel_celular)
  const diasAntecedencia = config?.dias_antecedencia_lembrete ?? 3;
  const usarContatoAlternativo = diasRestantes <= diasAntecedencia && !!crianca.responsavel_celular;
  const telefoneDestino = usarContatoAlternativo
    ? (crianca.responsavel_celular as string)
    : crianca.responsavel_telefone;

  // Preparar payload do lembrete
  const lembretePayload = {
    tipo: 'lembrete',
    urgencia: diasRestantes <= 1 ? 'alta' : diasRestantes <= 2 ? 'media' : 'baixa',
    timestamp: new Date().toISOString(),
    message: mensagem,
    mensagem_whatsapp: mensagem,
    usar_contato_alternativo: usarContatoAlternativo,
    to_phone: telefoneDestino,
    phone: telefoneDestino,
    to_email: crianca.responsavel_email || null,
    to_name: crianca.responsavel_nome,
    crianca: {
      id: crianca.id,
      nome: crianca.nome,
    },
    responsavel: {
      nome: crianca.responsavel_nome,
      telefone: crianca.responsavel_telefone,
      celular: crianca.responsavel_celular,
      email: crianca.responsavel_email,
    },
    prazo: {
      data: crianca.convocacao_deadline,
      dias_restantes: diasRestantes,
    },
    mensagem,
  };

  // Enviar via webhook se configurado
  if (config?.webhook_url_notificacao && config?.notificacao_whatsapp && isSafeWebhookUrl(config.webhook_url_notificacao)) {
    try {
      const webhookResponse = await fetch(config.webhook_url_notificacao, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lembretePayload),
      });

      // Registrar log
      await supabaseClient.from('notificacoes_log').insert({
        crianca_id: crianca.id,
        tipo: 'lembrete',
        canal: 'whatsapp',
        status: webhookResponse.ok ? 'sucesso' : 'falha',
        destinatario_nome: crianca.responsavel_nome,
        destinatario_contato: telefoneDestino,
        payload: lembretePayload,
        resposta: { status: webhookResponse.status },
      });

      resultados.push({
        crianca_id: crianca.id,
        crianca_nome: crianca.nome,
        tipo: 'lembrete',
        dias_restantes: diasRestantes,
        webhook_enviado: webhookResponse.ok,
      });
    } catch (error) {
      console.error(`[Verificar Prazos] Erro ao enviar lembrete para ${crianca.nome}:`, error);
      
      await supabaseClient.from('notificacoes_log').insert({
        crianca_id: crianca.id,
        tipo: 'lembrete',
        canal: 'whatsapp',
        status: 'falha',
        destinatario_nome: crianca.responsavel_nome,
        destinatario_contato: telefoneDestino,
        payload: lembretePayload,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  } else {
    console.log(`[Verificar Prazos] Webhook não configurado, registrando lembrete pendente`);
    
    await supabaseClient.from('notificacoes_log').insert({
      crianca_id: crianca.id,
      tipo: 'lembrete',
      canal: 'sistema',
      status: 'pendente',
      destinatario_nome: crianca.responsavel_nome,
      payload: lembretePayload,
      erro: 'Webhook não configurado',
    });

    resultados.push({
      crianca_id: crianca.id,
      crianca_nome: crianca.nome,
      tipo: 'lembrete',
      dias_restantes: diasRestantes,
      webhook_enviado: false,
      motivo: 'Webhook não configurado',
    });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const cronSecret = Deno.env.get("VERIFICAR_PRAZOS_SECRET")?.trim();
    if (!cronSecret) {
      return new Response(JSON.stringify({ error: "secret_not_configured" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const providedSecret = req.headers.get("x-cron-secret")?.trim();
    if (!providedSecret || providedSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: "nao_autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('[Verificar Prazos] Iniciando verificação de prazos...');

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Buscar configurações
    const { data: config } = await supabaseClient
      .from('configuracoes_sistema')
      .select('webhook_url_notificacao, notificacao_whatsapp, notificacao_email, mover_automatico_prazo_vencido, dias_antecedencia_lembrete')
      .single();

    const moverAutomatico = config?.mover_automatico_prazo_vencido ?? false;
    const diasAntecedencia = config?.dias_antecedencia_lembrete ?? 3;

    // Calcular data limite para lembretes
    const diasAFrente = new Date(hoje);
    diasAFrente.setDate(diasAFrente.getDate() + diasAntecedencia);

    console.log(`[Verificar Prazos] Verificando prazos com ${diasAntecedencia} dias de antecedência`);

    const resultados: Resultado[] = [];

    // ============================================
    // LEMBRETES PARA CONVOCADOS
    // ============================================
    const { data: criancasConvocadas, error: convocadoError } = await supabaseClient
      .from('criancas')
      .select('id, nome, responsavel_nome, responsavel_email, responsavel_telefone, responsavel_celular, convocacao_deadline, status, cmei_atual_id, turma_atual_id')
      .eq('status', 'Convocado')
      .not('convocacao_deadline', 'is', null)
      .lte('convocacao_deadline', diasAFrente.toISOString().split('T')[0])
      .gte('convocacao_deadline', hoje.toISOString().split('T')[0]);

    if (convocadoError) {
      console.error('[Verificar Prazos] Erro ao buscar convocados:', convocadoError);
      throw convocadoError;
    }

    console.log(`[Verificar Prazos] Encontradas ${criancasConvocadas?.length || 0} crianças convocadas com prazo próximo`);

    // Processar lembretes para convocados
    for (const crianca of criancasConvocadas || []) {
      await processarLembrete(supabaseClient, crianca as Crianca, hoje, config as Config, resultados);
    }

    // ============================================
    // VERIFICAR CONVOCAÇÕES VENCIDAS
    // ============================================
    const { data: criancasVencidas, error: vencidoError } = await supabaseClient
      .from('criancas')
      .select('id, nome, convocacao_deadline, cmei_atual_id, turma_atual_id, responsavel_nome, responsavel_email')
      .eq('status', 'Convocado')
      .not('convocacao_deadline', 'is', null)
      .lt('convocacao_deadline', hoje.toISOString().split('T')[0]);

    if (!vencidoError && criancasVencidas && criancasVencidas.length > 0) {
      console.log(`[Verificar Prazos] Encontradas ${criancasVencidas.length} convocações vencidas`);
      
      for (const crianca of criancasVencidas) {
        if (moverAutomatico) {
          // Mover automaticamente para fim de fila
          console.log(`[Verificar Prazos] Movendo ${crianca.nome} para fim de fila (automático)`);
          
          // Buscar próxima posição na fila
          const { data: ultimaPosicao } = await supabaseClient
            .from('criancas')
            .select('posicao_fila')
            .eq('status', 'Fila de Espera')
            .order('posicao_fila', { ascending: false })
            .limit(1)
            .single();

          const novaPosicao = (ultimaPosicao?.posicao_fila || 0) + 1;

          // Atualizar criança
          const { error: updateError } = await supabaseClient
            .from('criancas')
            .update({
              status: 'Fila de Espera',
              cmei_atual_id: null,
              turma_atual_id: null,
              convocacao_deadline: null,
              data_convocacao: null,
              data_penalidade: new Date().toISOString(),
              posicao_fila: novaPosicao,
            })
            .eq('id', crianca.id);

          if (!updateError) {
            // Registrar no histórico
            await supabaseClient.from('historico').insert({
              crianca_id: crianca.id,
              acao: 'Prazo de Convocação Expirado',
              status_anterior: 'Convocado',
              status_novo: 'Fila de Espera',
              cmei_anterior: crianca.cmei_atual_id,
              justificativa: 'Prazo de resposta à convocação expirado. Criança movida automaticamente para fim de fila.',
              descricao: `Prazo vencido em ${crianca.convocacao_deadline}. Nova posição: ${novaPosicao}`,
            });

            // Registrar notificação
            await supabaseClient.from('notificacoes_log').insert({
              crianca_id: crianca.id,
              tipo: 'prazo_expirado',
              canal: 'sistema',
              status: 'sucesso',
              destinatario_nome: crianca.responsavel_nome,
              payload: {
                tipo: 'prazo_expirado',
                crianca_nome: crianca.nome,
                nova_posicao: novaPosicao,
                mensagem: `O prazo de resposta à convocação de ${crianca.nome} expirou. A criança foi movida para o fim da fila de espera (posição ${novaPosicao}).`,
              },
            });

            resultados.push({
              crianca_id: crianca.id,
              crianca_nome: crianca.nome,
              status: 'movido_fim_fila',
              nova_posicao: novaPosicao,
              deadline: crianca.convocacao_deadline,
            });
          } else {
            console.error(`[Verificar Prazos] Erro ao mover ${crianca.nome}:`, updateError);
          }
        } else {
          // Apenas registrar log - não mover automaticamente
          console.log(`[Verificar Prazos] Prazo vencido para ${crianca.nome} - movimentação automática desabilitada`);
          
          resultados.push({
            crianca_id: crianca.id,
            crianca_nome: crianca.nome,
            status: 'prazo_vencido',
            deadline: crianca.convocacao_deadline,
            acao_automatica: false,
          });
        }
      }
    }

    console.log('[Verificar Prazos] Verificação concluída:', resultados);

    return new Response(
      JSON.stringify({
        sucesso: true,
        data_verificacao: hoje.toISOString(),
        mover_automatico_habilitado: moverAutomatico,
        total_lembretes: resultados.filter(r => r.dias_restantes !== undefined).length,
        total_vencidos: resultados.filter(r => r.status === 'prazo_vencido' || r.status === 'movido_fim_fila').length,
        total_movidos: resultados.filter(r => r.status === 'movido_fim_fila').length,
        resultados,
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Verificar Prazos] Erro geral:', error);
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
