import { calcularIdadeNaDataCorte, calcularIdadeEmMeses } from "@/utils/turma-utils";

interface ConfiguracaoIdade {
  idade_maxima_anos?: number | null;
  idade_minima_meses?: number | null;
  data_corte_mes?: number | null;
  data_corte_dia?: number | null;
}

interface ValidacaoIdadeMaximaResult {
  valido: boolean;
  idadeNaCorte: number;
  idadeMaxima: number;
}

interface ValidacaoIdadeMinimaResult {
  abaixoMinimo: boolean;
  idadeMeses: number;
  idadeMinimaMeses: number;
  mesesFaltando: number;
}

interface ValidacaoIdadeCompletaResult {
  idadeMaxima: ValidacaoIdadeMaximaResult;
  idadeMinima: ValidacaoIdadeMinimaResult;
}

/**
 * Valida se a criança está dentro da faixa etária permitida para inscrição
 * Retorna false se a idade na data de corte excede a idade máxima configurada
 */
export function validarIdadeMaximaInscricao(
  dataNascimento: string | Date,
  config: ConfiguracaoIdade
): ValidacaoIdadeMaximaResult {
  const idadeMaxima = config.idade_maxima_anos ?? 3;
  const data_corte_mes = config.data_corte_mes ?? 3;
  const data_corte_dia = config.data_corte_dia ?? 31;
  
  // Calcula a idade na data de corte do ano corrente
  const anoAtual = new Date().getFullYear();
  const idadeNaCorte = calcularIdadeNaDataCorte(dataNascimento, anoAtual, {
    data_corte_mes,
    data_corte_dia,
  });
  
  // Se a idade na data de corte for maior que a idade máxima, não pode ser inscrito
  const valido = idadeNaCorte <= idadeMaxima;
  
  return {
    valido,
    idadeNaCorte,
    idadeMaxima,
  };
}

/**
 * Valida se a criança atinge a idade mínima para convocação
 * Retorna quantos meses faltam se estiver abaixo do mínimo
 */
export function validarIdadeMinimaInscricao(
  dataNascimento: string | Date,
  config: ConfiguracaoIdade
): ValidacaoIdadeMinimaResult {
  const idadeMinimaMeses = config.idade_minima_meses ?? 6;
  const idadeMeses = calcularIdadeEmMeses(dataNascimento);
  const mesesFaltando = Math.max(0, idadeMinimaMeses - idadeMeses);
  
  return {
    abaixoMinimo: idadeMeses < idadeMinimaMeses,
    idadeMeses,
    idadeMinimaMeses,
    mesesFaltando,
  };
}

/**
 * Valida idade mínima e máxima de uma vez
 */
export function validarIdadeCompleta(
  dataNascimento: string | Date,
  config: ConfiguracaoIdade
): ValidacaoIdadeCompletaResult {
  return {
    idadeMaxima: validarIdadeMaximaInscricao(dataNascimento, config),
    idadeMinima: validarIdadeMinimaInscricao(dataNascimento, config),
  };
}
