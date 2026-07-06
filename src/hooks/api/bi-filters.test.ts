import { describe, expect, it } from "vitest";
import { buildBIRpcParams, resolveBIStatusList, type BIFiltros } from "./bi-filters";

describe("BI filtros", () => {
  it("resolveBIStatusList() mapeia 'demanda' para fila+convocado", () => {
    expect(resolveBIStatusList("demanda")).toEqual(["Fila de Espera", "Convocado"]);
  });

  it("buildBIRpcParams() traduz '__sem_zona__' em p_apenas_sem_zona=true e p_zona_id=null", () => {
    const filtros: BIFiltros = {
      periodo: "90d",
      cmeiId: "all",
      status: "demanda",
      zonaId: "__sem_zona__",
      bairro: "",
      turno: "all",
    };

    const params = buildBIRpcParams(filtros);
    expect(params.p_apenas_sem_zona).toBe(true);
    expect(params.p_zona_id).toBe(null);
  });

  it("buildBIRpcParams() traduz '__sem_periodo__' em p_apenas_sem_turno=true e p_turno=null", () => {
    const filtros: BIFiltros = {
      periodo: "90d",
      cmeiId: "all",
      status: "demanda",
      zonaId: "all",
      bairro: "",
      turno: "__sem_periodo__",
    };

    const params = buildBIRpcParams(filtros);
    expect(params.p_apenas_sem_turno).toBe(true);
    expect(params.p_turno).toBe(null);
  });
});
