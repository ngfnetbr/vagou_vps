// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  SONDAGEM_BASE,
  getVisibleMainMenuItems,
} from "./sidebarAccess";

describe("getVisibleMainMenuItems", () => {
  it("mostra Solicitar Sondagem para admin quando a permissão existe", () => {
    const items = getVisibleMainMenuItems({
      role: "admin",
      canViewAplicar: true,
      canViewSolicitar: true,
    });

    expect(items.map((item) => item.url)).toContain(
      `${SONDAGEM_BASE}/solicitar`,
    );
  });

  it("esconde Solicitar Sondagem sem a permissão necessária", () => {
    const items = getVisibleMainMenuItems({
      role: "admin",
      canViewAplicar: true,
      canViewSolicitar: false,
    });

    expect(items.map((item) => item.url)).not.toContain(
      `${SONDAGEM_BASE}/solicitar`,
    );
  });

  it("mostra a aba de alunos para coordenador", () => {
    const items = getVisibleMainMenuItems({
      role: "coordenador",
      canViewAplicar: true,
      canViewSolicitar: false,
    });

    expect(items.map((item) => item.url)).toContain(
      `${SONDAGEM_BASE}/cadastros/alunos`,
    );
  });
});
