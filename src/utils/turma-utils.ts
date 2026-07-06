import { differenceInMonths, differenceInYears, differenceInDays, addYears, addMonths } from "date-fns";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";

export interface ConfiguracaoCorte {
  data_corte_mes: number;
  data_corte_dia: number;
  idade_minima_meses: number;
  idade_maxima_anos: number;
}

export interface TurmaOptionLike {
  id: string;
  nome: string | null;
}

export const CONFIG_PADRAO: ConfiguracaoCorte = {
  data_corte_mes: 3, // Março
  data_corte_dia: 31,
  idade_minima_meses: 6,
  idade_maxima_anos: 3,
};

/**
 * Hook para facilitar cálculos de turma usando a configuração do sistema
 */
export const useTurmaCalculator = () => {
  const { data: config } = useConfiguracoesSistema();
  
  const currentConfig: ConfiguracaoCorte = {
    data_corte_mes: config?.data_corte_mes ?? CONFIG_PADRAO.data_corte_mes,
    data_corte_dia: config?.data_corte_dia ?? CONFIG_PADRAO.data_corte_dia,
    idade_minima_meses: config?.idade_minima_meses ?? CONFIG_PADRAO.idade_minima_meses,
    idade_maxima_anos: config?.idade_maxima_anos ?? CONFIG_PADRAO.idade_maxima_anos,
  };

  return {
    determinarTurma: (dataNascimento: Date | string, anoRef?: number) => 
      determinarTurmaBaseComCorte(dataNascimento, currentConfig, anoRef),
    
    calcularIdadeCorte: (dataNascimento: Date | string, anoRef: number) =>
      calcularIdadeNaDataCorte(dataNascimento, anoRef, currentConfig),
      
    config: currentConfig
  };
};

/**
 * Calcula a idade completa em anos, meses e dias
 * Exemplo de retorno: "2a 5m 12d"
 */
export const calcularIdadeCompleta = (dataNascimento: Date | string): string => {
  const nasc = typeof dataNascimento === 'string' ? new Date(dataNascimento) : dataNascimento;
  const hoje = new Date();
  
  const anos = differenceInYears(hoje, nasc);
  const dataAposAnos = addYears(nasc, anos);
  const meses = differenceInMonths(hoje, dataAposAnos);
  const dataAposMeses = addMonths(dataAposAnos, meses);
  const dias = differenceInDays(hoje, dataAposMeses);
  
  const partes = [];
  if (anos > 0) partes.push(`${anos}a`);
  if (meses > 0) partes.push(`${meses}m`);
  if (dias > 0 || partes.length === 0) partes.push(`${dias}d`);
  
  return partes.join(" ");
};

/**
 * Calcula a idade em meses
 */
export const calcularIdadeEmMeses = (dataNascimento: Date | string): number => {
  const nasc = typeof dataNascimento === 'string' ? new Date(dataNascimento) : dataNascimento;
  return differenceInMonths(new Date(), nasc);
};

/**
 * Calcula a idade em anos completos na data de corte
 */
export const calcularIdadeNaDataCorte = (
  dataNascimento: Date | string, 
  anoAlvo: number,
  config: Partial<ConfiguracaoCorte> = {}
): number => {
  const { data_corte_mes, data_corte_dia } = { ...CONFIG_PADRAO, ...config };
  const nasc = typeof dataNascimento === 'string' ? new Date(dataNascimento) : dataNascimento;
  const dataCorte = new Date(anoAlvo, data_corte_mes - 1, data_corte_dia); // -1 pq mês é 0-indexed
  
  return differenceInYears(dataCorte, nasc);
};

/**
 * Determina a turma base sugerida com base na idade e data de corte
 * Lógica:
 * - < 6 meses: Aguardando completar 6 meses
 * - Nascidos após a data de corte: Infantil 0
 * - 0 anos na data de corte: Infantil 0
 * - 1 ano na data de corte: Infantil 1
 * - 2 anos na data de corte: Infantil 2
 * - 3 anos na data de corte: Infantil 3
 * - > idade_maxima_anos configurada: Fora da faixa etária
 */
export const determinarTurmaBaseComCorte = (
  dataNascimento: Date | string,
  config: Partial<ConfiguracaoCorte> = {},
  anoReferencia?: number
): string => {
  const { data_corte_mes, data_corte_dia, idade_minima_meses, idade_maxima_anos } = { ...CONFIG_PADRAO, ...config };
  
  const nasc = typeof dataNascimento === 'string' ? new Date(dataNascimento) : dataNascimento;
  const hoje = new Date();
  
  const anoAlvo = anoReferencia || hoje.getFullYear();
  const dataCorte = new Date(anoAlvo, data_corte_mes - 1, data_corte_dia);
  
  // Idade em meses hoje
  const idadeMesesHoje = differenceInMonths(hoje, nasc);
  
  // Idade em anos completos na data de corte
  const idadeNaCorte = differenceInYears(dataCorte, nasc);
  
  // Regras
  if (idadeMesesHoje < idade_minima_meses) {
    return `Aguardando completar ${idade_minima_meses} meses`;
  }
  
  // Se nasceu após a data de corte do ano alvo
  if (nasc > dataCorte) {
    return "Infantil 0";
  }

  // Se a idade na data de corte for maior que a idade máxima configurada
  if (idadeNaCorte > idade_maxima_anos) {
    return "Fora da faixa etária";
  }

  // Mapeamento direto de idade para turma
  if (idadeNaCorte >= 0 && idadeNaCorte <= idade_maxima_anos) {
    return `Infantil ${idadeNaCorte}`;
  }
  
  return "Fora da faixa etária";
};

/**
 * Regra escolar para SAM/SONDAR:
 * - mantém o corte etário configurado
 * - estende a sugestão até infantil 5
 * - depois segue para 1° ao 5° ano
 */
export const determinarTurmaBaseEscolarComCorte = (
  dataNascimento: Date | string,
  config: Partial<ConfiguracaoCorte> = {},
  anoReferencia?: number
): string => {
  const { data_corte_mes, data_corte_dia, idade_minima_meses } = { ...CONFIG_PADRAO, ...config };

  const nasc = typeof dataNascimento === "string" ? new Date(dataNascimento) : dataNascimento;
  const hoje = new Date();

  const anoAlvo = anoReferencia || hoje.getFullYear();
  const dataCorte = new Date(anoAlvo, data_corte_mes - 1, data_corte_dia);
  const idadeMesesHoje = differenceInMonths(hoje, nasc);
  const idadeNaCorte = differenceInYears(dataCorte, nasc);

  if (idadeMesesHoje < idade_minima_meses) {
    return `Aguardando completar ${idade_minima_meses} meses`;
  }

  if (nasc > dataCorte) {
    return "infantil 0";
  }

  if (idadeNaCorte >= 0 && idadeNaCorte <= 5) {
    return `infantil ${idadeNaCorte}`;
  }

  const anoEscolar = idadeNaCorte - 5;
  if (anoEscolar >= 1 && anoEscolar <= 5) {
    return `${anoEscolar}° ano`;
  }

  return "Fora da faixa etária";
};

const ROMAN_TO_NUMBER: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
};

function normalizarTextoTurma(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const extrairIndiceTurma = (nomeTurma: string | null | undefined): number | null => {
  if (!nomeTurma) return null;

  const nome = normalizarTextoTurma(nomeTurma);

  if (/\bbercario\b/.test(nome)) return 0;

  const infantilMatch = nome.match(/\binfantil\s+(0|1|2|3|4|5|i|ii|iii|iv|v)\b/);
  if (infantilMatch) {
    const token = infantilMatch[1];
    return /^\d+$/.test(token) ? Number(token) : (ROMAN_TO_NUMBER[token] ?? null);
  }

  const maternalMatch = nome.match(/\bmaternal\s+(1|2|3|i|ii|iii)\b/);
  if (maternalMatch) {
    const token = maternalMatch[1];
    return /^\d+$/.test(token) ? Number(token) : (ROMAN_TO_NUMBER[token] ?? null);
  }

  const preMatch = nome.match(/\bpre\s+(1|2|i|ii)\b/);
  if (preMatch) {
    const token = preMatch[1];
    const preIndex = /^\d+$/.test(token) ? Number(token) : (ROMAN_TO_NUMBER[token] ?? null);
    if (preIndex === 1) return 4;
    if (preIndex === 2) return 5;
  }

  const anoPrefixadoMatch = nome.match(/\bano\s+(1|2|3|4|5|i|ii|iii|iv|v)\b/);
  if (anoPrefixadoMatch) {
    const token = anoPrefixadoMatch[1];
    const anoIndex = /^\d+$/.test(token) ? Number(token) : (ROMAN_TO_NUMBER[token] ?? null);
    return anoIndex ? anoIndex + 5 : null;
  }

  const anoSufixadoMatch = nome.match(/\b(1|2|3|4|5)\s*o?\s+ano\b/);
  if (anoSufixadoMatch) {
    return Number(anoSufixadoMatch[1]) + 5;
  }

  return null;
};

export const encontrarTurmaSugerida = <T extends TurmaOptionLike>(
  turmas: T[] | null | undefined,
  turmaBase: string | null | undefined
): T | null => {
  if (!turmas?.length || !turmaBase) return null;

  const indiceSugerido = extrairIndiceTurma(turmaBase);
  if (indiceSugerido === null) return null;

  const matchExato = turmas.find((turma) => extrairIndiceTurma(turma.nome) === indiceSugerido);
  return matchExato || null;
};

/**
 * Determina a turma base para transição anual
 * Recebe a idade em anos na data de corte do próximo ano e opcionalmente a idade máxima
 */
export const determinarTurmaBaseTransicao = (idadeNaCorte: number, idadeMaxima: number = 5): string => {
  if (idadeNaCorte > idadeMaxima) {
    return "Fora da faixa etária";
  }
  
  if (idadeNaCorte >= 0) {
    return `Infantil ${idadeNaCorte}`;
  }
  
  return "Fora da faixa etária";
};

/**
 * Verifica se a criança está abaixo da idade mínima para convocação
 */
export const verificarIdadeMinimaConvocacao = (
  dataNascimento: Date | string,
  idadeMinimaMeses: number = 6
): { abaixoIdadeMinima: boolean; mesesFaltando: number } => {
  const nasc = typeof dataNascimento === 'string' ? new Date(dataNascimento) : dataNascimento;
  const idadeMeses = differenceInMonths(new Date(), nasc);
  
  return {
    abaixoIdadeMinima: idadeMeses < idadeMinimaMeses,
    mesesFaltando: Math.max(0, idadeMinimaMeses - idadeMeses),
  };
};

/**
 * Formata a idade de forma legível (anos e meses simples)
 */
export const formatarIdadeSimples = (dataNascimento: string): string => {
  const meses = differenceInMonths(new Date(), new Date(dataNascimento));
  const anos = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;

  if (anos === 0 && meses === 0) {
    return "< 1 mês";
  } else if (anos === 0) {
    return `${mesesRestantes}m`;
  } else if (mesesRestantes === 0) {
    return `${anos}a`;
  } else {
    return `${anos}a ${mesesRestantes}m`;
  }
};
