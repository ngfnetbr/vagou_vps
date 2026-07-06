import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se é superadmin
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !roles?.some(r => r.role === 'superadmin')) {
      throw new Error('Acesso negado. Apenas superadmin pode limpar dados.');
    }

    console.log('Iniciando limpeza de dados...');

    // Ordem de limpeza respeitando foreign keys
    const tabelasParaLimpar = [
      'historico',
      'notificacoes_log',
      'criancas',
      'turmas',
      'cmeis',
      'auditoria',
    ];

    const resultados = [];

    for (const tabela of tabelasParaLimpar) {
      try {
        const { count: countAntes } = await supabase
          .from(tabela)
          .select('*', { count: 'exact', head: true });

        const { error } = await supabase
          .from(tabela)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo exceto ID impossível

        if (error) {
          console.error(`Erro ao limpar ${tabela}:`, error);
          resultados.push({
            tabela,
            sucesso: false,
            erro: error.message,
            registrosDeletados: 0,
          });
        } else {
          console.log(`Tabela ${tabela} limpa com sucesso`);
          resultados.push({
            tabela,
            sucesso: true,
            registrosDeletados: countAntes || 0,
          });
        }
      } catch (err) {
        console.error(`Erro ao processar ${tabela}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        resultados.push({
          tabela,
          sucesso: false,
          erro: errorMessage,
          registrosDeletados: 0,
        });
      }
    }

    const totalDeletados = resultados.reduce((acc, r) => acc + (r.registrosDeletados || 0), 0);
    const sucesso = resultados.every(r => r.sucesso);

    return new Response(
      JSON.stringify({
        sucesso,
        totalRegistrosDeletados: totalDeletados,
        detalhes: resultados,
        mensagem: sucesso 
          ? `Limpeza concluída com sucesso. ${totalDeletados} registros deletados.`
          : 'Limpeza concluída com alguns erros. Verifique os detalhes.',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: errorMessage,
      }),
      {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});
