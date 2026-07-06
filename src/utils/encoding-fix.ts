
import type { SupabaseClient } from "@supabase/supabase-js";

export function fixMojibake(str: string | null): string | null {
  if (!str) return str;
  
  // Verifica se tem padrões comuns de Mojibake (UTF-8 interpretado como Latin1)
  // C2/C3 seguido de 80-BF (ex: Ã, Â seguido de outro char)
  if (!str.match(/[\u00C2\u00C3][\u0080-\u00BF]/)) return str;

  try {
    // A abordagem "binary" pega apenas os 8 bits inferiores de cada char
    // Isso reverte o processo de "interpretar bytes UTF-8 como chars Latin1"
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xFF;
    }
    
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const fixed = decoder.decode(bytes);
    
    // Se o resultado tiver caracteres de substituição (), a conversão falhou
    if (fixed.includes('\uFFFD')) {
      return str;
    }
    
    return fixed;
  } catch (e) {
    return str;
  }
}

export const fixSystemEncoding = async (supabase: SupabaseClient) => {
  let totalFixed = 0;
  const logs: string[] = [];

  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    // 1. Tutorial Seções
    log("Processando Tutorial Seções...");
    const { data: secoes } = await supabase.from("tutorial_secoes").select("*");
    if (secoes) {
      for (const row of secoes) {
        const updates: Record<string, unknown> = {};
        let hasChanges = false;

        ['titulo', 'descricao'].forEach(col => {
          const original = row[col];
          const fixed = fixMojibake(original);
          if (fixed !== original) {
            updates[col] = fixed;
            hasChanges = true;
          }
        });

        if (Array.isArray(row.conteudo)) {
          const novoConteudo = row.conteudo.map((item: { subtitle: string | null; text: string | null; [key: string]: unknown }) => ({
            ...item,
            subtitle: fixMojibake(item.subtitle),
            text: fixMojibake(item.text)
          }));
          if (JSON.stringify(novoConteudo) !== JSON.stringify(row.conteudo)) {
            updates.conteudo = novoConteudo;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await supabase.from("tutorial_secoes").update(updates).eq("id", row.id);
          totalFixed++;
        }
      }
    }

    // 2. Tutorial FAQ
    log("Processando Tutorial FAQ...");
    const { data: faq } = await supabase.from("tutorial_faq").select("*");
    if (faq) {
      for (const row of faq) {
        const updates: Record<string, unknown> = {};
        let hasChanges = false;

        ['categoria', 'pergunta', 'resposta'].forEach(col => {
          const original = row[col];
          const fixed = fixMojibake(original);
          if (fixed !== original) {
            updates[col] = fixed;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          await supabase.from("tutorial_faq").update(updates).eq("id", row.id);
          totalFixed++;
        }
      }
    }

    // 3. Tutorial Dicas
    log("Processando Tutorial Dicas...");
    const { data: dicas } = await supabase.from("tutorial_dicas").select("*");
    if (dicas) {
      for (const row of dicas) {
        const updates: Record<string, unknown> = {};
        let hasChanges = false;

        ['titulo', 'descricao'].forEach(col => {
          const original = row[col];
          const fixed = fixMojibake(original);
          if (fixed !== original) {
            updates[col] = fixed;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          await supabase.from("tutorial_dicas").update(updates).eq("id", row.id);
          totalFixed++;
        }
      }
    }

    // 4. Tutorial Vídeos
    log("Processando Tutorial Vídeos...");
    const { data: videos } = await supabase.from("tutoriais_videos").select("*");
    if (videos) {
      for (const row of videos) {
        const updates: Record<string, unknown> = {};
        let hasChanges = false;

        ['titulo', 'descricao'].forEach(col => {
          const original = row[col];
          const fixed = fixMojibake(original);
          if (fixed !== original) {
            updates[col] = fixed;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          await supabase.from("tutoriais_videos").update(updates).eq("id", row.id);
          totalFixed++;
        }
      }
    }

    // 5. Configurações do Sistema
    log("Processando Configurações...");
    const { data: config } = await supabase.from("configuracoes_sistema").select("*").single();
    if (config) {
        const updates: Record<string, unknown> = {};
        let hasChanges = false;
        
        // Campos de texto que podem ter problemas
        const textFields = [
            'nome_municipio', 'nome_secretaria', 'sistema_nome', 'mensagem_idade_fora_faixa',
            'demo_mensagem', 'mensagem_manutencao', 'motivo_bloqueio_inscricoes',
            'mensagem_fora_horario', 'suporte_dev_nome', 'endereco_secretaria',
            'email_contato', 'telefone_contato', 'suporte_email', 'suporte_telefone',
            'suporte_dev_email', 'suporte_dev_telefone'
        ];

        textFields.forEach(col => {
            const original = config[col];
            const fixed = fixMojibake(original);
            if (fixed !== original) {
                updates[col] = fixed;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            await supabase.from("configuracoes_sistema").update(updates).eq("id", config.id);
            totalFixed++;
        }
    }

    return { success: true, fixedCount: totalFixed, logs };
  } catch (error) {
    console.error("Erro ao corrigir encoding:", error);
    return { success: false, error };
  }
};
