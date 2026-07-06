import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres:583927104678@db.hzguwuofnvkgeveorixs.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    
    console.log('\n🔍 --- DIAGNÓSTICO DO WEBHOOK WHATSAPP ---\n');
    
    // 1. Verificar Configuração
    const configQuery = `SELECT notificacao_whatsapp, webhook_url_notificacao FROM configuracoes_sistema LIMIT 1;`;
    const configRes = await client.query(configQuery);
    
    if (configRes.rows.length > 0) {
      const config = configRes.rows[0];
      console.log('1️⃣  CONFIGURAÇÃO:');
      console.log(`    • Ativado: ${config.notificacao_whatsapp ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`    • URL:     ${config.webhook_url_notificacao ? config.webhook_url_notificacao : '❌ VAZIA'}`);
      
      if (config.notificacao_whatsapp && !config.webhook_url_notificacao) {
         console.log('    ⚠️  ALERTA: O recurso está ligado, mas sem URL configurada!');
      }
    } else {
      console.log('❌ ERRO: Nenhuma configuração encontrada no banco.');
    }

    // 2. Verificar Logs Recentes
    console.log('\n2️⃣  ÚLTIMOS ENVIOS (Logs):');
    const logQuery = `
      SELECT to_char(created_at, 'DD/MM/YYYY HH24:MI') as data, status, erro 
      FROM notificacoes_log 
      WHERE canal = 'whatsapp' 
      ORDER BY created_at DESC 
      LIMIT 5;
    `;
    const logRes = await client.query(logQuery);
    
    if (logRes.rows.length === 0) {
      console.log('    (Nenhum histórico de envio encontrado)');
    } else {
      logRes.rows.forEach(row => {
        const icon = row.status === 'sucesso' ? '✅' : '❌';
        console.log(`    ${icon} [${row.data}] Status: ${row.status} ${row.erro ? `| Erro: ${row.erro}` : ''}`);
      });
    }
    console.log('\n----------------------------------------------\n');

  } catch (err) {
    console.error('❌ Erro Fatal:', err.message);
  } finally {
    await client.end();
  }
}

run();
