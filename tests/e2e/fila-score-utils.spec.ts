import { test, expect } from "@playwright/test";
import { buildScoreTooltip, compareFilaItems, getScoreForCmei } from "../../src/utils/fila-score";

test.describe("fila-score utils", () => {
  test("getScoreForCmei escolhe a pontuação correta por preferência", () => {
    const row = {
      cmei1_preferencia: "a",
      cmei2_preferencia: "b",
      cmei3_preferencia: "c",
      score_cmei1: 10,
      score_cmei2: 20,
      score_cmei3: 30,
    };

    expect(getScoreForCmei(row, "a")).toBe(10);
    expect(getScoreForCmei(row, "b")).toBe(20);
    expect(getScoreForCmei(row, "c")).toBe(30);
    expect(getScoreForCmei(row, "x")).toBe(10);
  });

  test("buildScoreTooltip não mascara falta de cálculo como zero", () => {
    const row = { score_cmei1: null };
    expect(buildScoreTooltip(row)).toBe("Pontuação não calculada");
  });

  test("buildScoreTooltip inclui pontuação base", () => {
    const row = { score_cmei1: 1, pontos_base_fila: 1 };
    expect(buildScoreTooltip(row)).toContain("Total: 1/100");
  });

  test("compareFilaItems ordena por convocado e depois por remanejamento", () => {
    const a = { status: "Fila de Espera", cmei_remanejamento_id: null, score_cmei1: 50, pontos_prioridades: 10 };
    const b = { status: "Convocado", cmei_remanejamento_id: null, score_cmei1: 0, pontos_prioridades: 0 };
    expect(compareFilaItems(a, b)).toBeGreaterThan(0);

    const c = { status: "Fila de Espera", cmei_remanejamento_id: "x", score_cmei1: 0, pontos_prioridades: 0 };
    const d = { status: "Fila de Espera", cmei_remanejamento_id: null, score_cmei1: 50, pontos_prioridades: 10 };
    expect(compareFilaItems(c, d)).toBeLessThan(0);
  });

  test("compareFilaItems ordena com prioridade acima de geral quando não há filtro de CMEI", () => {
    const comPrioridade = { status: "Fila de Espera", pontos_prioridades: 10, score_cmei1: 50, created_at: "2026-01-01T00:00:00Z" };
    const geral = { status: "Fila de Espera", pontos_prioridades: 0, score_cmei1: 0, created_at: "2026-01-01T00:00:00Z" };
    expect(compareFilaItems(comPrioridade, geral)).toBeLessThan(0);
  });

  test("compareFilaItems ordena por score global desc quando não há filtro de CMEI", () => {
    const high = { status: "Fila de Espera", pontos_prioridades: 0, score_cmei1: 50, score_cmei2: 0, score_cmei3: 0, created_at: "2026-01-01T00:00:00Z" };
    const low = { status: "Fila de Espera", pontos_prioridades: 0, score_cmei1: 0, score_cmei2: 0, score_cmei3: 0, created_at: "2026-01-01T00:00:00Z" };
    expect(compareFilaItems(high, low)).toBeLessThan(0);
  });

  test("compareFilaItems garante prioridade acima quando score empata (ex.: cap em 100)", () => {
    const prioridade = { status: "Fila de Espera", pontos_prioridades: 10, score_cmei1: 100, created_at: "2026-01-01T00:00:00Z" };
    const geral = { status: "Fila de Espera", pontos_prioridades: 0, score_cmei1: 100, created_at: "2026-01-01T00:00:00Z" };
    expect(compareFilaItems(prioridade, geral)).toBeLessThan(0);
  });

  test("buildScoreTooltip não mostra linhas com 0 e lista prioridades apenas quando geram pontos", () => {
    const row = {
      score_cmei1: 50,
      pontos_base_fila: 0,
      pontos_data_cadastro: 0,
      pontos_programas_sociais: 0,
      pontos_remanejamento: 0,
      bonus_zona_cmei1: 0,
      crianca_prioridades: [
        { status: "aprovado", prioridade: { nome: "PCD", peso: 10 } },
        { status: "pendente", prioridade: { nome: "Gêmeos", peso: 10 } },
      ],
    };

    const t = buildScoreTooltip(row);
    expect(t).toContain("Total: 50/100");
    expect(t).toContain("Prioridades:");
    expect(t).toContain("- PCD: +10");
    expect(t).not.toContain("Gêmeos");
    expect(t).not.toContain("+0");
  });

  test("buildScoreTooltip inclui prioridades pendentes quando comprovação não é na inscrição", () => {
    const row = {
      score_cmei1: 50,
      pontos_base_fila: 0,
      pontos_data_cadastro: 0,
      pontos_programas_sociais: 0,
      pontos_remanejamento: 0,
      bonus_zona_cmei1: 0,
      crianca_prioridades: [
        { status: "aprovado", prioridade: { nome: "Irmãos", peso: 10 } },
        { status: "pendente", prioridade: { nome: "PCD", peso: 10 } },
      ],
    };

    const t = buildScoreTooltip(row, undefined, { comprovacaoNaInscricao: false });
    expect(t).toContain("Total: 50/100");
    expect(t).toContain("Prioridades:");
    expect(t).toContain("- Irmãos: +10");
    expect(t).toContain("- PCD: +10");
  });
});
