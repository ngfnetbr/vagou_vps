import { subDays } from "date-fns";

export type BIPeriodo = "30d" | "90d" | "365d" | "all";

export type BIStatusFiltro =
  | "demanda"
  | "todos"
  | "fila"
  | "convocado"
  | "aguardando_documentacao"
  | "matriculado"
  | "desistente"
  | "recusada";

export type BIZonaFiltro = "all" | "__sem_zona__" | string;
export type BITurnoFiltro = "all" | "__sem_periodo__" | string;

export interface BIFiltros {
  periodo: BIPeriodo;
  cmeiId: string | "all";
  status: BIStatusFiltro;
  zonaId: BIZonaFiltro;
  bairro: string;
  turno: BITurnoFiltro;
}

const getPeriodoStart = (periodo: BIPeriodo) => {
  if (periodo === "30d") return subDays(new Date(), 30);
  if (periodo === "90d") return subDays(new Date(), 90);
  if (periodo === "365d") return subDays(new Date(), 365);
  return null;
};

export const resolveBIStatusList = (status: BIStatusFiltro): string[] | null => {
  if (status === "todos") return null;
  if (status === "demanda") return ["Fila de Espera", "Convocado"];
  if (status === "fila") return ["Fila de Espera"];
  if (status === "convocado") return ["Convocado"];
  if (status === "aguardando_documentacao") return ["Aguardando Documentação"];
  if (status === "matriculado") return ["Matriculado", "Matriculada"];
  if (status === "desistente") return ["Desistente"];
  if (status === "recusada") return ["Recusada"];
  return null;
};

export const buildBIRpcParams = (filtros: BIFiltros) => {
  const inicio = getPeriodoStart(filtros.periodo);
  const statuses = resolveBIStatusList(filtros.status);

  const bairro = filtros.bairro?.trim() ? filtros.bairro.trim() : null;

  const apenasSemZona = filtros.zonaId === "__sem_zona__";
  const zonaId =
    filtros.zonaId && filtros.zonaId !== "all" && filtros.zonaId !== "__sem_zona__"
      ? filtros.zonaId
      : null;

  const apenasSemTurno = filtros.turno === "__sem_periodo__";
  const turno = filtros.turno && filtros.turno !== "all" && filtros.turno !== "__sem_periodo__" ? filtros.turno : null;

  const cmeiId = filtros.cmeiId !== "all" ? filtros.cmeiId : null;

  return {
    p_inicio: inicio ? inicio.toISOString() : null,
    p_statuses: statuses,
    p_zona_id: zonaId,
    p_apenas_sem_zona: apenasSemZona,
    p_bairro: bairro,
    p_turno: turno,
    p_apenas_sem_turno: apenasSemTurno,
    p_cmei_id: cmeiId,
  };
};

