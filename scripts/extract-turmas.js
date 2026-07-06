import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configura o worker do PDF
GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.mjs')).toString();

async function extrairTexto(caminhoPdf) {
  try {
    const dados = new Uint8Array(fs.readFileSync(caminhoPdf));
    const tarefa = getDocument({
      data: dados,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const doc = await tarefa.promise;
    let textoCompleto = "";
    
    for (let i = 1; i <= doc.numPages; i++) {
      const pagina = await doc.getPage(i);
      const conteudo = await pagina.getTextContent();
      const textoPagina = conteudo.items.map(item => item.str).join(' ');
      textoCompleto += textoPagina + "\n";
    }
    return textoCompleto;
  } catch (erro) {
    console.log(`Erro ao ler ${path.basename(caminhoPdf)}: ${erro.message}`);
    return "";
  }
}

// Função para converter para Title Case
function toTitleCase(str) {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word => {
    if (word.length <= 2 && !['da', 'de', 'do', 'das', 'dos', 'e'].includes(word)) return word; 
    if (['da', 'de', 'do', 'das', 'dos', 'e'].includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function parseData(text, filename) {
  const turmas = [];
  let currentTurma = null;
  let cmeiNome = "CMEI João Trizzi"; // Default

  if (text.includes("ANJO DA GUARDA")) {
      cmeiNome = "CMEI Anjo da Guarda";
  } else if (text.includes("JOAO TRIZZI")) {
      cmeiNome = "CMEI João Trizzi";
  }

  const sections = text.split(/Curso:/g);

  for (const section of sections) {
    if (!section.trim()) continue;

    // Extract Turma Info
    const seriacaoMatch = section.match(/Seriação:\s*(.*?)\s*Turno/);
    const turnoMatch = section.match(/Turno:\s*(.*?)\s*Turma/);
    const turmaMatch = section.match(/Turma:\s*(\w+)/);

    if (seriacaoMatch && turnoMatch && turmaMatch) {
      const nomeBase = toTitleCase(seriacaoMatch[1].trim());
      const turno = toTitleCase(turnoMatch[1].trim());
      const letra = turmaMatch[1].trim().toUpperCase(); 
      const nomeTurma = `${nomeBase} - ${letra}`;

      currentTurma = {
        nome: nomeTurma,
        turma_base: nomeBase,
        turno: turno,
        cmei: cmeiNome, 
        alunos: []
      };
      turmas.push(currentTurma);

      const lineRegex = /\d{2}\/\d{2}\/\d{4}\s+([A-ZÀ-Ú\s]+)\s+(\d{2}\/\d{2}\/\d{4})\s+\d+\s+([MF])\s+(\(\d{2}\)[\d-]*)/g;
      let lineMatch;
      while ((lineMatch = lineRegex.exec(section)) !== null) {
          currentTurma.alunos.push({
              nome: toTitleCase(lineMatch[1].trim()),
              data_nascimento: lineMatch[2], // dd/mm/yyyy
              sexo: lineMatch[3] === 'M' ? 'Masculino' : 'Feminino',
              responsavel_telefone: lineMatch[4]
          });
      }
    }
  }
  return turmas;
}

function generateImportScript(data) {
    const scriptContent = `
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HARDCODED CREDENTIALS FOR ONE-OFF IMPORT
const supabaseUrl = "https://hzguwuofnvkgeveorixs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Z3V3dW9mbnZrZ2V2ZW9yaXhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTU4NDk5NCwiZXhwIjoyMDgxMTYwOTk0fQ.kIZYBoWxlvfEkipVOxn4VdFEEPdh-gyeBFrLmCUWBZ4"; // SERVICE ROLE KEY

console.log("URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DADOS = ${JSON.stringify(data, null, 2)};

async function importData() {
  try {
    console.log("Iniciando importação...");
    
    // Obter todos os CMEIs para mapeamento
    const { data: cmeis, error: errCmeis } = await supabase
      .from('cmeis')
      .select('*');

    if (errCmeis || !cmeis) {
      throw new Error("Erro ao buscar CMEIs: " + (errCmeis?.message || ''));
    }
    
    // Criar mapa de nome -> id (normalizando nomes)
    const cmeiMap = {};
    cmeis.forEach(c => {
        if (c.nome.toLowerCase().includes("joão trizzi")) cmeiMap["CMEI João Trizzi"] = c;
        if (c.nome.toLowerCase().includes("anjo da guarda")) cmeiMap["CMEI Anjo da Guarda"] = c;
    });

    console.log("CMEIs encontrados:", Object.keys(cmeiMap));

    const RESPONSAVEL_PADRAO = {
      responsavel_nome: "Administrador",
      responsavel_cpf: "178.409.019-05",
      cep: "87990-000",
      responsavel_email: "admin@diamantedonorte.pr.gov.br",
      aceita_qualquer_cmei: false,
      programas_sociais: false
    };

    for (const turmaData of DADOS) {
      const cmei = cmeiMap[turmaData.cmei];
      if (!cmei) {
          console.error(\`CMEI não encontrado para a turma \${turmaData.nome}: \${turmaData.cmei}\`);
          continue;
      }

      // 1. Criar/Buscar Turma Base
      console.log(\`Processando turma base: \${turmaData.turma_base} (\${cmei.nome})\`);
      
      const { data: tb, error: errTB } = await supabase.from('turmas_base')
        .upsert({ 
            nome: turmaData.turma_base,
            idade_minima_meses: 0,
            idade_maxima_meses: 72,
            descricao: \`Turma de \${turmaData.turma_base}\`
        }, { onConflict: 'nome' })
        .select()
        .single();
        
      if (errTB) console.error("Erro TB:", errTB);

      // 2. Criar Turma
      console.log(\`Processando turma: \${turmaData.nome}\`);
      let turmaId;
      
      const { data: existingTurma } = await supabase.from('turmas')
        .select('id')
        .eq('cmei_id', cmei.id)
        .eq('nome', turmaData.nome)
        .single();
        
      if (existingTurma) {
          turmaId = existingTurma.id;
      } else {
          const { data: newT, error: errT } = await supabase.from('turmas').insert({
            cmei_id: cmei.id,
            nome: turmaData.nome,
            turma_base: turmaData.turma_base,
            capacidade: 30,
            turno: turmaData.turno,
            ativo: true
          }).select().single();

          if (errT) {
              console.error("Erro Turma:", errT);
              continue;
          }
          turmaId = newT.id;
      }

      // 3. Inserir/Atualizar Alunos
      if (turmaData.alunos && turmaData.alunos.length > 0) {
        for (const a of turmaData.alunos) {
            const [dia, mes, ano] = a.data_nascimento.split('/');
            const dataNasc = \`\${ano}-\${mes}-\${dia}\`;
            
            const alunoData = {
                ...RESPONSAVEL_PADRAO,
                nome: a.nome,
                data_nascimento: dataNasc,
                sexo: a.sexo === 'M' ? 'Masculino' : 'Feminino',
                responsavel_telefone: a.responsavel_telefone,
                status: 'Matriculado',
                cmei_atual_id: cmei.id,
                turma_atual_id: turmaId
            };

            const { data: existingChild } = await supabase.from('criancas')
                 .select('id')
                 .ilike('nome', a.nome)
                 .eq('data_nascimento', dataNasc)
                 .single();
             
             if (existingChild) {
                 console.log(\`Atualizando aluno: \${a.nome} -> \${cmei.nome}\`);
                 const { error: errUpd } = await supabase.from('criancas')
                    .update({ 
                        nome: a.nome, 
                        turma_atual_id: turmaId,
                        cmei_atual_id: cmei.id
                    })
                    .eq('id', existingChild.id);
                 if (errUpd) console.error(\`Erro ao atualizar \${a.nome}: \${errUpd.message}\`);
             } else {
                 console.log(\`Inserindo novo aluno: \${a.nome} em \${cmei.nome}\`);
                 const { error: errA } = await supabase.from('criancas').insert(alunoData);
                 if (errA) console.error(\`Erro ao inserir \${a.nome}: \${errA.message}\`);
             }
        }
      }
    }
    
    console.log("Concluído!");

  } catch (error) {
    console.error("Erro fatal:", error);
    process.exit(1);
  }
}

importData();
`;

    const outputPath = path.resolve(__dirname, 'import-turmas-2025.js');
    fs.writeFileSync(outputPath, scriptContent);
    console.log(`Script de importação gerado em scripts/import-turmas-2025.js`);
}

async function main() {
  const arquivos = [
    'relatório das turmas de  2025.pdf',
    'relatório das turmas de 2025.pdf'
  ];

  let allData = [];

  for (const arq of arquivos) {
    const caminho = path.resolve(__dirname, '..', arq);
    if (fs.existsSync(caminho)) {
      console.log(`Processando ${arq}...`);
      const texto = await extrairTexto(caminho);
      console.log(`--- Início do texto de ${arq} ---`);
      console.log(texto.substring(0, 500)); // Logar os primeiros 500 caracteres
      console.log(`--- Fim do texto parcial ---`);
      const turmas = parseData(texto, arq); // Passar o nome do arquivo para identificar CMEI se necessário
      allData = [...allData, ...turmas];
    }
  }
  
  // Gerar script de importação
  generateImportScript(allData);
}

main().catch(console.error);
