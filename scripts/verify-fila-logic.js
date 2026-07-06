
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Usando anon key pois service role não está disponível no env padrão geralmente

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Variáveis de ambiente faltando.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log("=== TESTE DE LÓGICA DE FILA E CONFIGURAÇÃO ===");

    try {
        // 1. Verificar se conseguimos chamar a RPC recalcular_posicoes_fila
        console.log("1. Tentando chamar RPC recalcular_posicoes_fila...");
        const { error: rpcError } = await supabase.rpc('recalcular_posicoes_fila');
        
        if (rpcError) {
            console.log("⚠️ Erro ao chamar RPC (pode ser permissão ou inexistência):", rpcError.message);
        } else {
            console.log("✅ RPC recalcular_posicoes_fila chamada com sucesso.");
        }

        // 2. Buscar configurações atuais
        console.log("\n2. Buscando configurações atuais...");
        const { data: config, error: configError } = await supabase
            .from('configuracoes_sistema')
            .select('*')
            .single();

        if (configError) {
            console.error("❌ Erro ao buscar config:", configError.message);
            return;
        }
        console.log("Configuração atual:", {
            idade_maxima_anos: config.idade_maxima_anos,
            data_corte: `${config.data_corte_dia}/${config.data_corte_mes}`
        });

        // 3. Simular verificação de turma base
        // Vamos usar a lógica do TS aqui para ver se bate com o esperado
        // Não podemos testar a lógica do banco diretamente sem inserir dados e ver o resultado processado (se houver trigger)
        
        // Criar uma data de nascimento que seria afetada por uma mudança de corte
        // Ex: Nasceu em 01/04/2020.
        // Se corte é 31/03 (padrão): Em 2024, faz 4 anos DEPOIS do corte. Então na data de corte tinha 3 anos. -> Infantil 3
        // Se corte mudar para 30/06: Em 2024, faz 4 anos ANTES do corte (01/04 < 30/06). Então na data de corte tem 4 anos. -> Infantil 4
        
        const dataNascimento = '2020-04-01';
        const anoReferencia = 2024;
        
        console.log(`\n3. Teste de Lógica (Simulação TS):`);
        console.log(`Data Nascimento: ${dataNascimento}, Ano Ref: ${anoReferencia}`);

        // Cenário A: Corte 31/03
        const configA = { data_corte_dia: 31, data_corte_mes: 3 };
        const turmaA = determinarTurma(dataNascimento, configA, anoReferencia);
        console.log(`Com corte 31/03: ${turmaA}`);

        // Cenário B: Corte 30/06
        const configB = { data_corte_dia: 30, data_corte_mes: 6 };
        const turmaB = determinarTurma(dataNascimento, configB, anoReferencia);
        console.log(`Com corte 30/06: ${turmaB}`);

        if (turmaA !== turmaB) {
            console.log("✅ A lógica responde corretamente à mudança de data de corte.");
        } else {
            console.log("⚠️ A lógica NÃO mudou a turma (verifique se o exemplo é válido).");
        }

        console.log("\n4. Verificando se a tabela 'criancas' tem campo de turma sugerida persistido...");
        const { data: sampleCrianca, error: sampleError } = await supabase
            .from('criancas')
            .select('*')
            .limit(1);
        
        if (sampleCrianca && sampleCrianca.length > 0) {
            const keys = Object.keys(sampleCrianca[0]);
            console.log("Campos na tabela criancas:", keys.filter(k => k.includes('turma')));
            
            // Se existir um campo 'turma_sugerida' ou similar que não seja FK, ele pode ser calculado.
            // Geralmente tem 'turma_atual_id' (FK).
        }

    } catch (e) {
        console.error("Erro inesperado:", e);
    }
}

// Réplica simplificada da função do turma-utils.ts para validar a lógica aqui
function determinarTurma(dataNascimentoStr, config, anoRef) {
    const nasc = new Date(dataNascimentoStr);
    const dataCorte = new Date(anoRef, config.data_corte_mes - 1, config.data_corte_dia);
    
    // Idade na data de corte (anos completos)
    // Diferença em anos
    let idade = anoRef - nasc.getFullYear();
    
    // Ajuste se ainda não fez aniversário na data de corte
    const aniversarioNoAnoCorte = new Date(anoRef, nasc.getMonth(), nasc.getDate());
    if (aniversarioNoAnoCorte > dataCorte) {
        idade--;
    }

    if (idade >= 0 && idade <= 5) return `Infantil ${idade}`;
    return "Fora";
}

runTest();
