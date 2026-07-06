import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ImportResult {
  total: number;
  sucesso: number;
  erros: number;
  detalhes: string[];
}

export interface ImportSheet {
  headers: string[];
  rows: string[][];
}

export interface ImportCriancasArgs extends ImportSheet {
  permitirDadosIncompletos?: boolean;
}

// Normalizar valores booleanos
const parseBoolean = (value: string): boolean => {
  const normalized = value?.toLowerCase().trim();
  return ['sim', 'yes', 's', 'true', '1', 'x'].includes(normalized);
};

// Normalizar sexo
const parseSexo = (value: string): "Masculino" | "Feminino" => {
  const normalized = value?.toLowerCase().trim();
  if (['f', 'feminino', 'fem', 'female'].includes(normalized)) {
    return 'Feminino';
  }
  return 'Masculino';
};

// Limpar CPF
const limparCPF = (cpf: string): string => {
  return cpf?.replace(/\D/g, '') || '';
};

// Validação de CPF local para evitar problemas de importação
const validarCPFLocal = (cpf: string): boolean => {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(10))) return false;
  
  return true;
};

const gerarCpfValidoLocal = (): string => {
  const randomDigit = () => Math.floor(Math.random() * 10);
  const calcDigit = (digits: number[]) => {
    const fator = digits.length + 1;
    const soma = digits.reduce((acc, d, idx) => acc + d * (fator - idx), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  while (true) {
    const base = Array.from({ length: 9 }, randomDigit);
    if (base.every((d) => d === base[0])) continue;
    const d1 = calcDigit(base);
    const d2 = calcDigit([...base, d1]);
    const cpf = [...base, d1, d2].join("");
    if (cpf !== "12345678909" && validarCPFLocal(cpf)) return cpf;
  }
};

// Validar data
const validarData = (dateStr: string): string | null => {
  if (!dateStr) return null;
  
  // Tentar formato AAAA-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return dateStr;
  }
  
  // Tentar formato DD/MM/AAAA
  const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, dia, mes, ano] = brMatch;
    return `${ano}-${mes}-${dia}`;
  }
  
  return null;
};

const removerAcentos = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizarChave = (value: string) => removerAcentos(value || "").toLowerCase().trim();

const normalizarHeader = (header: string) => normalizarChave((header || "").split("(")[0]);

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    (value || "").trim(),
  );

const parseDateTime = (value: string): string | null => {
  const v = (value || "").trim();
  if (!v) return null;

  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    const [, dia, mes, ano, hh, mm, ss] = br;
    const date = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      hh ? Number(hh) : 0,
      mm ? Number(mm) : 0,
      ss ? Number(ss) : 0,
    );
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  const isoDate = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const [ano, mes, dia] = [Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3])];
    const date = new Date(ano, mes - 1, dia, 0, 0, 0);
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  const date = new Date(v);
  if (!isNaN(date.getTime())) return date.toISOString();

  return null;
};

type CampoInscricaoImport = {
  id: string;
  nome_campo: string;
  label: string;
  tipo: string;
  obrigatorio: boolean;
  campo_sistema: boolean;
  opcoes: { value: string; label: string }[] | null;
};

const booleanLikeTokens = new Set([
  "sim",
  "nao",
  "não",
  "yes",
  "no",
  "true",
  "false",
  "1",
  "0",
  "x",
]);

const campoPareceBooleano = (campo: CampoInscricaoImport) => {
  if (campo.tipo === "checkbox") return true;
  if (campo.tipo !== "select") return false;
  if (!campo.opcoes?.length) return false;
  return campo.opcoes.every((o) => {
    const v = normalizarChave(o.value);
    const l = normalizarChave(o.label);
    return booleanLikeTokens.has(v) || booleanLikeTokens.has(l);
  });
};

const getHeaderIndexMap = (headers: string[]) => {
  const map = new Map<string, number>();
  headers.forEach((h, idx) => {
    const key = normalizarHeader(h);
    if (!key) return;
    if (map.has(key)) return;
    map.set(key, idx);
  });
  return map;
};

const getCellValue = (row: string[], headerIndexMap: Map<string, number>, keys: string[]) => {
  for (const k of keys) {
    const idx = headerIndexMap.get(normalizarHeader(k));
    if (idx === undefined) continue;
    return (row[idx] ?? "").toString();
  }
  return "";
};

const getOpcaoSelectValue = (campo: CampoInscricaoImport, raw: string) => {
  const v = (raw || "").trim();
  if (!v) return null;
  const key = normalizarChave(v);
  const opt = campo.opcoes?.find(
    (o) => normalizarChave(o.value) === key || normalizarChave(o.label) === key,
  );
  return opt?.value ?? v;
};

// Importar crianças do Excel
export const useImportarCriancas = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sheet: ImportCriancasArgs): Promise<ImportResult> => {
      const permitirDadosIncompletos = sheet.permitirDadosIncompletos === true;
      const result: ImportResult = {
        total: sheet.rows.length,
        sucesso: 0,
        erros: 0,
        detalhes: [],
      };

      if (!sheet.headers?.length) {
        return {
          total: 0,
          sucesso: 0,
          erros: 1,
          detalhes: ["Arquivo sem cabeçalho válido"],
        };
      }

      const headerIndexMap = getHeaderIndexMap(sheet.headers);

      // Buscar CMEIs para mapeamento por nome
      const { data: cmeis } = await supabase
        .from('cmeis')
        .select('id, nome')
        .eq('ativo', true);

      const cmeiMap = new Map(cmeis?.map(c => [c.nome.toLowerCase(), c.id]) || []);

      // Buscar turmas para mapeamento
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id, nome, cmei_id')
        .eq('ativo', true);

      const turmaMap = new Map(turmas?.map(t => [`${t.cmei_id}-${t.nome.toLowerCase()}`, t.id]) || []);

      const { data: camposInscricaoData, error: camposInscricaoError } = await supabase
        .from("campos_inscricao")
        .select("id,nome_campo,label,tipo,obrigatorio,campo_sistema,opcoes")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (camposInscricaoError) throw camposInscricaoError;

      const camposInscricao = (camposInscricaoData || []).map((c: any) => ({
        ...c,
        opcoes: (c.opcoes as CampoInscricaoImport["opcoes"]) ?? null,
      })) as CampoInscricaoImport[];

      const campoByNome = new Map<string, CampoInscricaoImport>();
      const campoByLabel = new Map<string, CampoInscricaoImport>();
      for (const campo of camposInscricao) {
        campoByNome.set(normalizarChave(campo.nome_campo), campo);
        campoByLabel.set(normalizarChave(campo.label), campo);
      }

      const camposPresentes = new Map<string, CampoInscricaoImport>();
      for (const h of sheet.headers) {
        const key = normalizarHeader(h);
        if (!key) continue;
        const campo = campoByNome.get(key) || campoByLabel.get(key);
        if (campo) camposPresentes.set(campo.id, campo);
      }

      const parseCmeiId = (raw: string) => {
        const v = (raw || "").trim();
        if (!v) return null;
        if (isUuid(v)) return v;
        return cmeiMap.get(v.toLowerCase()) || null;
      };

      for (let i = 0; i < sheet.rows.length; i++) {
        const row = sheet.rows[i];
        const linha = i + 2; // +2 porque linha 1 é header

        try {
          const nome = getCellValue(row, headerIndexMap, ["nome"]);
          const data_nascimento = getCellValue(row, headerIndexMap, ["data_nascimento"]);
          const sexo = getCellValue(row, headerIndexMap, ["sexo"]);
          const programas_sociais = getCellValue(row, headerIndexMap, ["programas_sociais"]);
          const aceita_qualquer_cmei = getCellValue(row, headerIndexMap, ["aceita_qualquer_cmei"]);
          const responsavel_nome = getCellValue(row, headerIndexMap, ["responsavel_nome"]);
          const responsavel_cpf = getCellValue(row, headerIndexMap, ["responsavel_cpf"]);
          const responsavel_telefone = getCellValue(row, headerIndexMap, ["responsavel_telefone"]);
          const responsavel_celular = getCellValue(row, headerIndexMap, ["responsavel_celular"]);
          const responsavel_email = getCellValue(row, headerIndexMap, ["responsavel_email"]);
          const cep = getCellValue(row, headerIndexMap, ["cep"]);
          const logradouro = getCellValue(row, headerIndexMap, ["logradouro", "endereco"]);
          const numero = getCellValue(row, headerIndexMap, ["numero"]);
          const complemento = getCellValue(row, headerIndexMap, ["complemento"]);
          const bairro = getCellValue(row, headerIndexMap, ["bairro"]);
          const cidade = getCellValue(row, headerIndexMap, ["cidade"]);
          const estado = getCellValue(row, headerIndexMap, ["estado"]);
          const observacoes = getCellValue(row, headerIndexMap, ["observacoes"]);
          const status = getCellValue(row, headerIndexMap, ["status"]);
          const cmei1_nome = getCellValue(row, headerIndexMap, ["cmei1_preferencia", "cmei1_nome"]);
          const cmei2_nome = getCellValue(row, headerIndexMap, ["cmei2_preferencia", "cmei2_nome"]);
          const cmei3_nome = getCellValue(row, headerIndexMap, ["cmei3_preferencia", "cmei3_nome"]);
          const cmei_atual_nome = getCellValue(row, headerIndexMap, ["cmei_atual_nome", "cmei_atual_id"]);
          const turma_atual_nome = getCellValue(row, headerIndexMap, ["turma_atual_nome", "turma_atual_id"]);
          const data_inscricao_raw = getCellValue(row, headerIndexMap, ["data_inscricao", "created_at"]);
          const data_retorno_fila_raw = getCellValue(row, headerIndexMap, ["data_retorno_fila"]);
          const cpf_crianca = getCellValue(row, headerIndexMap, ["cpf_crianca"]);
          const certidao_nascimento = getCellValue(row, headerIndexMap, ["certidao_nascimento"]);

          // Validações obrigatórias
          if (!nome?.trim()) {
            result.erros++;
            result.detalhes.push(`Linha ${linha}: Nome é obrigatório`);
            continue;
          }

          const dataNascValida = validarData(data_nascimento);
          if (!dataNascValida) {
            result.erros++;
            result.detalhes.push(`Linha ${linha}: Data de nascimento inválida (${data_nascimento})`);
            continue;
          }

          const cpfLimpo = limparCPF(responsavel_cpf);
          const cpfResponsavelFinal = cpfLimpo
            ? (validarCPFLocal(cpfLimpo) ? cpfLimpo : null)
            : (permitirDadosIncompletos ? gerarCpfValidoLocal() : null);

          if (!permitirDadosIncompletos) {
            if (!responsavel_nome?.trim()) {
              result.erros++;
              result.detalhes.push(`Linha ${linha}: Nome do responsável é obrigatório`);
              continue;
            }

            if (!cpfResponsavelFinal) {
              result.erros++;
              result.detalhes.push(`Linha ${linha}: CPF do responsável inválido`);
              continue;
            }

            if (!responsavel_telefone?.trim()) {
              result.erros++;
              result.detalhes.push(`Linha ${linha}: Telefone do responsável é obrigatório`);
              continue;
            }
          } else {
            if (cpfLimpo && !cpfResponsavelFinal) {
              result.erros++;
              result.detalhes.push(`Linha ${linha}: CPF do responsável inválido`);
              continue;
            }
          }

          if (cpf_crianca?.trim()) {
            const cpfCriancaLimpo = limparCPF(cpf_crianca);
            if (!validarCPFLocal(cpfCriancaLimpo)) {
              result.erros++;
              result.detalhes.push(`Linha ${linha}: CPF da criança inválido`);
              continue;
            }
          }

          if (data_inscricao_raw?.trim()) {
            const parsed = parseDateTime(data_inscricao_raw);
            if (!parsed) {
              result.erros++;
              result.detalhes.push(`Linha ${linha}: Data de inscrição inválida (${data_inscricao_raw})`);
              continue;
            }
          }

          if (data_retorno_fila_raw?.trim()) {
            const parsed = parseDateTime(data_retorno_fila_raw);
            if (!parsed) {
              result.erros++;
              result.detalhes.push(`Linha ${linha}: Data de retorno à fila inválida (${data_retorno_fila_raw})`);
              continue;
            }
          }

          // Resolver IDs de CMEIs
          const cmei1Id = parseCmeiId(cmei1_nome);
          const cmei2Id = parseCmeiId(cmei2_nome);
          const cmei3Id = parseCmeiId(cmei3_nome);
          const cmeiAtualId = parseCmeiId(cmei_atual_nome);
          
          // Resolver turma atual
          let turmaAtualId = null;
          const turmaAtualRaw = (turma_atual_nome || "").trim();
          if (turmaAtualRaw) {
            if (isUuid(turmaAtualRaw)) {
              turmaAtualId = turmaAtualRaw;
            } else if (cmeiAtualId) {
              turmaAtualId = turmaMap.get(`${cmeiAtualId}-${turmaAtualRaw.toLowerCase()}`) || null;
            }
          }

          // Determinar status válido
          const statusValidos = ['Fila de Espera', 'Convocado', 'Matriculado', 'Matriculada', 'Desistente', 'Recusada', 'Concluinte'];
          const statusFinal = statusValidos.find(s => s.toLowerCase() === status?.toLowerCase().trim()) || 'Fila de Espera';

          // Determinar prioridade
          const prioridade = parseBoolean(programas_sociais) ? 'Social' : 'Geral';

          const createdAt = data_inscricao_raw?.trim() ? parseDateTime(data_inscricao_raw) : null;
          const dataRetornoFila = data_retorno_fila_raw?.trim() ? parseDateTime(data_retorno_fila_raw) : null;

          const responsavelNomeFinal = responsavel_nome?.trim() || (permitirDadosIncompletos ? "Não informado" : "");
          const responsavelTelefoneFinal = responsavel_telefone?.trim() || (permitirDadosIncompletos ? "0000000000" : "");
          const dadosIncompletosFinal =
            permitirDadosIncompletos &&
            (!responsavel_nome?.trim() || !cpfLimpo || !responsavel_telefone?.trim());

          const insertData: any = {
            nome: nome.trim(),
            data_nascimento: dataNascValida,
            sexo: parseSexo(sexo),
            programas_sociais: parseBoolean(programas_sociais),
            aceita_qualquer_cmei: parseBoolean(aceita_qualquer_cmei),
            responsavel_nome: responsavelNomeFinal,
            responsavel_cpf: cpfResponsavelFinal,
            responsavel_telefone: responsavelTelefoneFinal,
            responsavel_celular: responsavel_celular?.trim() || null,
            responsavel_email: responsavel_email?.trim() || null,
            cep: cep?.trim() || null,
            logradouro: logradouro?.trim() || null,
            numero: numero?.trim() || null,
            complemento: complemento?.trim() || null,
            bairro: bairro?.trim() || null,
            cidade: cidade?.trim() || null,
            estado: estado?.trim() || null,
            observacoes: observacoes?.trim() || null,
            status: statusFinal as any,
            prioridade: prioridade as any,
            cmei1_preferencia: cmei1Id || null,
            cmei2_preferencia: cmei2Id || null,
            cmei3_preferencia: cmei3Id || null,
            cmei_atual_id: cmeiAtualId || null,
            turma_atual_id: turmaAtualId || null,
            dados_incompletos: dadosIncompletosFinal,
          };

          if (createdAt) insertData.created_at = createdAt;
          if (dataRetornoFila) insertData.data_retorno_fila = dataRetornoFila;
          if (cpf_crianca?.trim()) insertData.cpf_crianca = limparCPF(cpf_crianca);
          if (certidao_nascimento?.trim()) insertData.certidao_nascimento = certidao_nascimento.trim();

          for (const campo of camposPresentes.values()) {
            if (!campo.campo_sistema) continue;
            const key = normalizarChave(campo.nome_campo);
            if (
              [
                "nome",
                "data_nascimento",
                "sexo",
                "programas_sociais",
                "aceita_qualquer_cmei",
                "responsavel_nome",
                "responsavel_cpf",
                "responsavel_telefone",
                "responsavel_celular",
                "responsavel_email",
                "cep",
                "logradouro",
                "numero",
                "complemento",
                "bairro",
                "cidade",
                "estado",
                "observacoes",
                "status",
                "prioridade",
                "cmei1_preferencia",
                "cmei2_preferencia",
                "cmei3_preferencia",
                "cmei_atual_id",
                "turma_atual_id",
                "created_at",
                "updated_at",
              ].includes(key)
            ) {
              continue;
            }

            const raw = getCellValue(row, headerIndexMap, [campo.nome_campo, campo.label]);
            if (!raw?.trim()) {
              if (campo.obrigatorio && !permitirDadosIncompletos) {
                result.erros++;
                result.detalhes.push(`Linha ${linha}: Campo obrigatório ausente (${campo.label || campo.nome_campo})`);
                throw new Error("Linha inválida");
              }
              continue;
            }

            if (key.endsWith("_cpf")) {
              const cpf = limparCPF(raw);
              if (!validarCPFLocal(cpf)) {
                result.erros++;
                result.detalhes.push(`Linha ${linha}: CPF inválido (${campo.label || campo.nome_campo})`);
                throw new Error("Linha inválida");
              }
              insertData[campo.nome_campo] = cpf;
              continue;
            }

            if (campoPareceBooleano(campo) && booleanLikeTokens.has(normalizarChave(raw))) {
              insertData[campo.nome_campo] = parseBoolean(raw);
              continue;
            }

            if (campo.tipo === "checkbox") {
              insertData[campo.nome_campo] = parseBoolean(raw);
              continue;
            }

            if (campo.tipo === "date") {
              const dt = validarData(raw);
              if (!dt) {
                result.erros++;
                result.detalhes.push(`Linha ${linha}: Data inválida (${campo.label || campo.nome_campo})`);
                throw new Error("Linha inválida");
              }
              insertData[campo.nome_campo] = dt;
              continue;
            }

            if (campo.tipo === "number") {
              const n = Number(raw);
              insertData[campo.nome_campo] = Number.isFinite(n) ? n : null;
              continue;
            }

            if (campo.tipo === "select") {
              insertData[campo.nome_campo] = getOpcaoSelectValue(campo, raw);
              continue;
            }

            insertData[campo.nome_campo] = raw.trim();
          }

          // Inserir criança
          const { data: inserted, error } = await supabase
            .from('criancas')
            .insert(insertData)
            .select("id")
            .single();

          if (error) {
            if (error.code === '23505') {
              result.erros++;
              result.detalhes.push(`Linha ${linha}: CPF já cadastrado`);
            } else {
              throw error;
            }
          } else {
            const criancaId = inserted?.id as string | undefined;
            if (criancaId) {
              const valoresCustom: { crianca_id: string; campo_id: string; valor: string }[] = [];
              for (const campo of camposPresentes.values()) {
                if (campo.campo_sistema) continue;
                const raw = getCellValue(row, headerIndexMap, [campo.nome_campo, campo.label]);
                if (!raw?.trim()) {
                  if (campo.obrigatorio && !permitirDadosIncompletos) {
                    result.erros++;
                    result.detalhes.push(`Linha ${linha}: Campo obrigatório ausente (${campo.label || campo.nome_campo})`);
                    throw new Error("Linha inválida");
                  }
                  continue;
                }

                if (campo.tipo === "checkbox") {
                  valoresCustom.push({
                    crianca_id: criancaId,
                    campo_id: campo.id,
                    valor: parseBoolean(raw) ? "true" : "false",
                  });
                  continue;
                }

                if (campo.tipo === "date") {
                  const dt = validarData(raw);
                  if (!dt) {
                    result.erros++;
                    result.detalhes.push(`Linha ${linha}: Data inválida (${campo.label || campo.nome_campo})`);
                    throw new Error("Linha inválida");
                  }
                  valoresCustom.push({ crianca_id: criancaId, campo_id: campo.id, valor: dt });
                  continue;
                }

                if (campo.tipo === "select") {
                  const opt = getOpcaoSelectValue(campo, raw);
                  valoresCustom.push({ crianca_id: criancaId, campo_id: campo.id, valor: opt ?? "" });
                  continue;
                }

                valoresCustom.push({ crianca_id: criancaId, campo_id: campo.id, valor: raw.trim() });
              }

              if (valoresCustom.length) {
                const { error: customError } = await supabase
                  .from("valores_campos_custom")
                  .upsert(valoresCustom as any, { onConflict: "crianca_id,campo_id" });
                if (customError) throw customError;
              }
            }

            result.sucesso++;
          }
        } catch (error: any) {
          if (error?.message === "Linha inválida") continue;
          result.erros++;
          result.detalhes.push(`Linha ${linha}: ${error.message}`);
        }
      }

      if (result.sucesso > 0) {
        const { error: recalculoError } = await supabase.rpc("recalcular_posicoes_fila");
        if (recalculoError) {
          result.detalhes.push(`Aviso: não foi possível recalcular posições da fila (${recalculoError.message})`);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-criancas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fila"] });
      queryClient.invalidateQueries({ queryKey: ["fila-publica"] });
      
      if (result.sucesso > 0) {
        toast.success(`Importação concluída: ${result.sucesso} de ${result.total} registros importados`);
      }
      if (result.erros > 0) {
        toast.warning(`${result.erros} registros com erro`);
      }
    },
    onError: (error: any) => {
      toast.error("Erro na importação: " + error.message);
    },
  });
};

const parseResponsaveisTurma = (value: string) => {
  const v = (value || "").trim();
  if (!v) return [];
  if (v.startsWith("[") || v.startsWith("{")) {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  }

  return v
    .split(/[;\n]/g)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [nome, turno] = p.split("|").map((x) => x.trim());
      return { nome, turno: turno || "Integral" };
    })
    .filter((p) => p.nome);
};

// Importar turmas do Excel
export const useImportarTurmas = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sheet: ImportSheet): Promise<ImportResult> => {
      const result: ImportResult = {
        total: sheet.rows.length,
        sucesso: 0,
        erros: 0,
        detalhes: [],
      };

      if (!sheet.headers?.length) {
        return {
          total: 0,
          sucesso: 0,
          erros: 1,
          detalhes: ["Arquivo sem cabeçalho válido"],
        };
      }

      const headerIndexMap = getHeaderIndexMap(sheet.headers);

      // Buscar CMEIs para mapeamento
      const { data: cmeis } = await supabase
        .from('cmeis')
        .select('id, nome')
        .eq('ativo', true);

      const cmeiMap = new Map(cmeis?.map(c => [c.nome.toLowerCase(), c.id]) || []);

      for (let i = 0; i < sheet.rows.length; i++) {
        const row = sheet.rows[i];
        const linha = i + 2;

        try {
          const nome = getCellValue(row, headerIndexMap, ["nome"]);
          const turma_base = getCellValue(row, headerIndexMap, ["turma_base"]);
          const cmei_nome = getCellValue(row, headerIndexMap, ["cmei_nome"]);
          const capacidade = getCellValue(row, headerIndexMap, ["capacidade"]);
          const turno = getCellValue(row, headerIndexMap, ["turno"]);
          const idade_minima = getCellValue(row, headerIndexMap, ["idade_minima_meses", "idade_minima"]);
          const idade_maxima = getCellValue(row, headerIndexMap, ["idade_maxima_meses", "idade_maxima"]);
          const professores = getCellValue(row, headerIndexMap, ["professores"]);
          const auxiliares = getCellValue(row, headerIndexMap, ["auxiliares"]);

          if (!nome?.trim()) {
            result.erros++;
            result.detalhes.push(`Linha ${linha}: Nome da turma é obrigatório`);
            continue;
          }

          if (!turma_base?.trim()) {
            result.erros++;
            result.detalhes.push(`Linha ${linha}: Turma base é obrigatória`);
            continue;
          }

          const cmeiId = cmei_nome ? cmeiMap.get(cmei_nome.toLowerCase()) : null;
          if (!cmeiId) {
            result.erros++;
            result.detalhes.push(`Linha ${linha}: Unidade "${cmei_nome}" não encontrada`);
            continue;
          }

          const { error } = await supabase
            .from('turmas')
            .insert({
              nome: nome.trim(),
              turma_base: turma_base.trim(),
              cmei_id: cmeiId,
              capacidade: parseInt(capacidade) || 20,
              turno: turno?.trim() || 'Integral',
              idade_minima: parseInt(idade_minima) || null,
              idade_maxima: parseInt(idade_maxima) || null,
              professores: parseResponsaveisTurma(professores),
              auxiliares: parseResponsaveisTurma(auxiliares),
              ativo: true,
            });

          if (error) {
            result.erros++;
            result.detalhes.push(`Linha ${linha}: ${error.message}`);
          } else {
            result.sucesso++;
          }
        } catch (error: any) {
          result.erros++;
          result.detalhes.push(`Linha ${linha}: ${error.message}`);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      
      if (result.sucesso > 0) {
        toast.success(`${result.sucesso} turmas importadas`);
      }
    },
    onError: (error: any) => {
      toast.error("Erro na importação: " + error.message);
    },
  });
};

// Gerar modelo CSV para turmas
export const gerarModeloTurmasCSV = () => {
  const headers = [
    "nome",
    "turma_base (Infantil 0, Infantil 1, ..., Infantil 5)",
    "cmei_nome",
    "capacidade",
    "turno (Integral/Manhã/Tarde)",
    "idade_minima_meses",
    "idade_maxima_meses"
  ];

  const exemplo = [
    "Berçário I - A",
    "Berçário I",
    "Unidade Exemplo",
    "15",
    "Integral",
    "0",
    "12"
  ];

  const csvContent = [headers.join(","), exemplo.join(",")].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `modelo_turmas.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
