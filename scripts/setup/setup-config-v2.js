
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupConfig() {
  console.log("Iniciando configuração do sistema v2...");

  // 1. Verificar se já existe configuração
  const { data: existingConfig, error: fetchError } = await supabase
    .from('configuracoes_sistema')
    .select('*')
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error("Erro ao buscar configurações:", fetchError.message);
    return;
  }

  if (existingConfig) {
    console.log("✅ Configuração já existe:", existingConfig);
    return;
  }

  console.log("Tabela vazia. Tentando inserir configuração padrão...");

  const defaultConfig = {
    ano_letivo_atual: new Date().getFullYear(),
    data_inicio_inscricao: `${new Date().getFullYear()}-01-01`,
    data_fim_inscricao: `${new Date().getFullYear()}-12-31`,
    // vagas_por_turma: 20, // Removido pois não existe na interface
    // sistema_ativo: true, // Removido
    modo_manutencao: false,
    bloquear_novas_inscricoes: false,
    data_corte_dia: 31,
    data_corte_mes: 3,
    idade_minima_meses: 6,
    idade_maxima_anos: 5,
    prioridade_social_habilitada: true,
    prioridade_remanejamento_habilitada: true,
    nome_municipio: "Diamante do Norte",
    nome_secretaria: "Secretaria de Educação",
    sistema_nome: "Vagou!",
    prazo_resposta_dias: 3,
    limite_inscricoes_responsavel: 3
  };

  const { data, error } = await supabase
    .from('configuracoes_sistema')
    .insert([defaultConfig])
    .select();

  if (error) {
    console.error("❌ Erro ao inserir configuração:", error.message);
  } else {
    console.log("✅ Configuração padrão inserida com sucesso:", data);
  }
}

setupConfig();
