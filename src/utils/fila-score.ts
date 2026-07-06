import { PRIORIDADES_FEDERAIS_PADRAO } from "@/constants/prioridades-federais";

type ScoreFields = {
  score_cmei1?: number | null;
  score_cmei2?: number | null;
  score_cmei3?: number | null;
  pontos_base_fila?: number | null;
  pontos_prioridades?: number | null;
  pontos_programas_sociais?: number | null;
  pontos_remanejamento?: number | null;
  pontos_data_cadastro?: number | null;
  bonus_zona_cmei1?: number | null;
  bonus_zona_cmei2?: number | null;
  bonus_zona_cmei3?: number | null;
  cmei1_preferencia?: string | null;
  cmei2_preferencia?: string | null;
  cmei3_preferencia?: string | null;
  cmei_remanejamento_id?: string | null;
  prioridade?: string | null;
  created_at?: string | null;
  data_retorno_fila?: string | null;
  data_nascimento?: string | null;
  status?: string | null;
  programas_sociais?: boolean | null;
  data_penalidade?: string | null;
  crianca_prioridades?: Array<{
    status?: "pendente" | "aprovado" | "recusado" | string | null;
    prioridade?: { id?: string; nome?: string; codigo?: string; peso?: number | null } | null;
  }> | null;
};

export function getScoreForCmei(row: ScoreFields, cmeiId?: string) {
  if (cmeiId && row.cmei1_preferencia === cmeiId) return row.score_cmei1 ?? null;
  if (cmeiId && row.cmei2_preferencia === cmeiId) return row.score_cmei2 ?? null;
  if (cmeiId && row.cmei3_preferencia === cmeiId) return row.score_cmei3 ?? null;
  return row.score_cmei1 ?? row.score_cmei2 ?? row.score_cmei3 ?? null;
}

export function getBonusZonaForCmei(row: ScoreFields, cmeiId?: string) {
  if (cmeiId && row.cmei1_preferencia === cmeiId) return row.bonus_zona_cmei1 ?? null;
  if (cmeiId && row.cmei2_preferencia === cmeiId) return row.bonus_zona_cmei2 ?? null;
  if (cmeiId && row.cmei3_preferencia === cmeiId) return row.bonus_zona_cmei3 ?? null;
  return row.bonus_zona_cmei1 ?? row.bonus_zona_cmei2 ?? row.bonus_zona_cmei3 ?? null;
}

export function getScoreGlobal(row: ScoreFields) {
  const values = [row.score_cmei1, row.score_cmei2, row.score_cmei3].filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return Math.max(...values);
}

export function buildScoreTooltip(
  row: ScoreFields,
  cmeiId?: string,
  options?: { comprovacaoNaInscricao?: boolean },
) {
  const normalizedCmeiId = cmeiId?.trim() ? cmeiId : undefined;
  const score = normalizedCmeiId ? getScoreForCmei(row, normalizedCmeiId) : getScoreGlobal(row);
  if (score == null) return "Pontuação não calculada";

  const total = Math.max(0, score);

  const pontosBaseFila = Math.max(0, row.pontos_base_fila ?? 0);
  const pontosDataCadastro = Math.max(0, row.pontos_data_cadastro ?? 0);
  const pontosProgramasSociais = Math.max(0, row.pontos_programas_sociais ?? 0);
  const pontosRemanejamento = Math.max(0, row.pontos_remanejamento ?? 0);
  const pontosPrioridades = Math.max(0, row.pontos_prioridades ?? 0);
  const bonusZonaRaw = normalizedCmeiId
    ? getBonusZonaForCmei(row, normalizedCmeiId)
    : Math.max(
        0,
        ...( [row.bonus_zona_cmei1, row.bonus_zona_cmei2, row.bonus_zona_cmei3].filter(
          (v): v is number => typeof v === "number"
        ) || [0] )
      );
  const bonusZona = Math.max(0, bonusZonaRaw ?? 0);

  const pontosInscricaoFila = Math.max(0, pontosBaseFila + pontosDataCadastro);
  const dataInscricaoRaw = row.data_retorno_fila || row.created_at;
  const dataInscricao = dataInscricaoRaw ? new Date(dataInscricaoRaw).toLocaleDateString("pt-BR") : null;
  const horaInscricao = row.created_at
    ? new Date(row.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  const comprovacaoNaInscricao = options?.comprovacaoNaInscricao ?? true;
  const contaPendente = comprovacaoNaInscricao === false;

  const grupoPorCodigo = new Map(PRIORIDADES_FEDERAIS_PADRAO.map((p) => [p.codigo, p.grupo] as const));
  const tituloGrupo = (grupo: (typeof PRIORIDADES_FEDERAIS_PADRAO)[number]["grupo"]) => {
    if (grupo === "economica") return "Situação Econômica";
    if (grupo === "vulnerabilidade") return "Situações de Vulnerabilidade";
    return "Organização Familiar e Territorial";
  };

  const prioridadesComPontos = (row.crianca_prioridades || [])
    .map((cp) => {
      const nome = cp.prioridade?.nome || "Prioridade";
      const codigo = cp.prioridade?.codigo || null;
      const peso = Math.max(0, Number(cp.prioridade?.peso ?? 0));
      const status = cp.status || "pendente";
      const pontos = status === "aprovado" || (contaPendente && status === "pendente") ? peso : 0;
      return { nome, codigo, pontos };
    })
    .filter((p) => p.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, "pt-BR"));

  const linhas: string[] = [];
  linhas.push(`Total: ${total}/100`);

  if (pontosInscricaoFila > 0) {
    linhas.push(`Inscrição na fila: +${pontosInscricaoFila}`);
  }

  if (pontosProgramasSociais > 0) linhas.push(`Programas sociais: +${pontosProgramasSociais}`);
  if (pontosRemanejamento > 0) linhas.push(`Remanejamento: +${pontosRemanejamento}`);
  if (bonusZona > 0) linhas.push(`Bônus de zona: +${bonusZona}`);

  if (pontosPrioridades > 0 && prioridadesComPontos.length === 0) {
    linhas.push(`Prioridades: +${pontosPrioridades}`);
  }

  if (prioridadesComPontos.length > 0) {
    linhas.push("Prioridades:");
    const grupos = {
      economica: [] as typeof prioridadesComPontos,
      vulnerabilidade: [] as typeof prioridadesComPontos,
      familiar_territorial: [] as typeof prioridadesComPontos,
      outras: [] as typeof prioridadesComPontos,
    };

    prioridadesComPontos.forEach((p) => {
      const grupo = p.codigo ? grupoPorCodigo.get(p.codigo) : undefined;
      if (grupo === "economica") grupos.economica.push(p);
      else if (grupo === "vulnerabilidade") grupos.vulnerabilidade.push(p);
      else if (grupo === "familiar_territorial") grupos.familiar_territorial.push(p);
      else grupos.outras.push(p);
    });

    (["economica", "vulnerabilidade", "familiar_territorial"] as const).forEach((g) => {
      if (grupos[g].length === 0) return;
      linhas.push(`${tituloGrupo(g)}:`);
      linhas.push(...grupos[g].map((p) => `- ${p.nome}: +${p.pontos}`));
    });

    if (grupos.outras.length > 0) {
      linhas.push("Outras:");
      linhas.push(...grupos.outras.map((p) => `- ${p.nome}: +${p.pontos}`));
    }
  }

  return linhas.join("\n");
}

export function isConvocadoStatus(status?: string | null) {
  return status === "Convocado" || status === "Aguardando Documentação" || status === "Aguardando Assinatura";
}

export function hasPrioridadeEfetiva(row: ScoreFields) {
  return (row.pontos_prioridades ?? 0) > 0;
}

export function compareFilaItems(a: ScoreFields, b: ScoreFields, cmeiId?: string) {
  const aConv = isConvocadoStatus(a.status) ? 1 : 0;
  const bConv = isConvocadoStatus(b.status) ? 1 : 0;
  if (aConv !== bConv) return bConv - aConv;

  const aRem = (a.pontos_remanejamento ?? 0) > 0 || a.cmei_remanejamento_id || a.prioridade === "Remanejamento" ? 1 : 0;
  const bRem = (b.pontos_remanejamento ?? 0) > 0 || b.cmei_remanejamento_id || b.prioridade === "Remanejamento" ? 1 : 0;
  if (aRem !== bRem) return bRem - aRem;

  const aPri = hasPrioridadeEfetiva(a) ? 1 : 0;
  const bPri = hasPrioridadeEfetiva(b) ? 1 : 0;
  if (aPri !== bPri) return bPri - aPri;

  const aScore = (cmeiId ? getScoreForCmei(a, cmeiId) : getScoreGlobal(a)) ?? -1;
  const bScore = (cmeiId ? getScoreForCmei(b, cmeiId) : getScoreGlobal(b)) ?? -1;
  if (aScore !== bScore) return bScore - aScore;

  const posA =
    cmeiId && a.cmei1_preferencia === cmeiId ? (a as any).posicao_fila :
    cmeiId && a.cmei2_preferencia === cmeiId ? (a as any).posicao_fila_cmei2 :
    cmeiId && a.cmei3_preferencia === cmeiId ? (a as any).posicao_fila_cmei3 :
    (a as any).posicao_fila;
  const posB =
    cmeiId && b.cmei1_preferencia === cmeiId ? (b as any).posicao_fila :
    cmeiId && b.cmei2_preferencia === cmeiId ? (b as any).posicao_fila_cmei2 :
    cmeiId && b.cmei3_preferencia === cmeiId ? (b as any).posicao_fila_cmei3 :
    (b as any).posicao_fila;

  const pA = typeof posA === "number" ? posA : 999999;
  const pB = typeof posB === "number" ? posB : 999999;
  if (pA !== pB) return pA - pB;

  const tA = new Date((a.data_penalidade || a.data_retorno_fila || a.created_at || 0) as any).getTime();
  const tB = new Date((b.data_penalidade || b.data_retorno_fila || b.created_at || 0) as any).getTime();
  if (tA !== tB) return tA - tB;

  const cA = new Date((a.created_at || 0) as any).getTime();
  const cB = new Date((b.created_at || 0) as any).getTime();
  if (cA !== cB) return cA - cB;

  const nA = new Date((a.data_nascimento || 0) as any).getTime();
  const nB = new Date((b.data_nascimento || 0) as any).getTime();
  return nA - nB;
}

export function buildVisibleFilaPositionMap<T extends ScoreFields & { id: string }>(
  items: T[],
  cmeiId?: string,
  options?: { excludeRemanejamento?: boolean },
) {
  const orderedItems = [...items].sort((a, b) => compareFilaItems(a, b, cmeiId));
  const excludeRemanejamento = options?.excludeRemanejamento ?? true;
  const positionMap = new Map<string, number>();
  let position = 0;

  orderedItems.forEach((item) => {
    const isWaiting = item.status === "Fila de Espera";
    const isRemanejamento = !!item.cmei_remanejamento_id;

    if (!isWaiting) return;
    if (excludeRemanejamento && isRemanejamento) return;

    position += 1;
    positionMap.set(item.id, position);
  });

  return positionMap;
}
