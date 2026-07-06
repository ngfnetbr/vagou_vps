import { describe, it, expect } from "vitest";
import { getAccessibleModules } from "./ecosystem-modules";

const SAM_PERM = "modulos.sam.acessar";
const SONDAGEM_PERM = "modulos.sondagem.acessar";
const VAGOU_PERM = "modulos.vagou.acessar";

describe("getAccessibleModules", () => {
  it("superadmin acessa todos os módulos mesmo sem permissões", () => {
    const mods = getAccessibleModules({
      roles: ["superadmin"],
      permissions: [],
      samEnabled: false,
      sondagemEnabled: false,
    });
    expect(mods.map((m) => m.id).sort()).toEqual(["sam", "sondar", "vagou"]);
  });

  it("admin sem permissões de módulo não acessa nenhum módulo", () => {
    const mods = getAccessibleModules({
      roles: ["admin"],
      permissions: [],
      samEnabled: true,
      sondagemEnabled: true,
    });
    expect(mods).toHaveLength(0);
  });

  it("admin com permissão de VAGOU acessa o VAGOU", () => {
    const mods = getAccessibleModules({
      roles: ["admin"],
      permissions: [VAGOU_PERM],
      samEnabled: true,
      sondagemEnabled: true,
    });
    expect(mods.map((m) => m.id)).toEqual(["vagou"]);
    expect(mods[0].homePath).toBe("/modulo/vagou/admin");
  });

  it("admin com permissões e flags habilitadas acessa os três", () => {
    const mods = getAccessibleModules({
      roles: ["admin"],
      permissions: [VAGOU_PERM, SAM_PERM, SONDAGEM_PERM],
      samEnabled: true,
      sondagemEnabled: true,
    });
    expect(mods.map((m) => m.id).sort()).toEqual(["sam", "sondar", "vagou"]);
  });

  it("config explícita sem permissão de VAGOU oculta o VAGOU", () => {
    const mods = getAccessibleModules({
      roles: ["admin", "responsavel"],
      permissions: [SAM_PERM, SONDAGEM_PERM],
      samEnabled: true,
      sondagemEnabled: true,
    });
    expect(mods.map((m) => m.id).sort()).toEqual(["sam", "sondar"]);
  });

  it("config explícita só com SONDAR mostra apenas um módulo (sem seletor)", () => {
    const mods = getAccessibleModules({
      roles: ["responsavel"],
      permissions: [SONDAGEM_PERM],
      samEnabled: true,
      sondagemEnabled: true,
    });
    expect(mods.map((m) => m.id)).toEqual(["sondar"]);
  });

  it("flag desabilitada bloqueia o módulo mesmo com permissão", () => {
    const mods = getAccessibleModules({
      roles: ["admin"],
      permissions: [VAGOU_PERM, SAM_PERM, SONDAGEM_PERM],
      samEnabled: false,
      sondagemEnabled: true,
    });
    expect(mods.map((m) => m.id).sort()).toEqual(["sondar", "vagou"]);
  });

  it("diretor_cmei com permissão de VAGOU acessa pela área do diretor", () => {
    const mods = getAccessibleModules({
      roles: ["diretor_cmei"],
      permissions: [VAGOU_PERM],
      samEnabled: true,
      sondagemEnabled: true,
    });
    expect(mods.map((m) => m.id)).toEqual(["vagou"]);
    expect(mods[0].homePath).toBe("/modulo/vagou/admin/diretor");
  });

  it("responsável com permissão de VAGOU entra pela área do responsável", () => {
    const mods = getAccessibleModules({
      roles: ["responsavel"],
      permissions: [VAGOU_PERM],
      samEnabled: true,
      sondagemEnabled: true,
    });
    expect(mods.map((m) => m.id)).toEqual(["vagou"]);
    expect(mods[0].homePath).toBe("/modulo/vagou/responsavel");
  });

  it("school_coord com SAM habilitado vai para o portal da escola", () => {
    const mods = getAccessibleModules({
      roles: ["school_coord"],
      permissions: [SAM_PERM],
      samEnabled: true,
      sondagemEnabled: true,
    });
    const sam = mods.find((m) => m.id === "sam");
    expect(sam?.homePath).toBe("/modulo/sam/escola/dashboard");
  });

  it("usuário sem roles/permissões não acessa nenhum módulo", () => {
    const mods = getAccessibleModules({
      roles: [],
      permissions: [],
      samEnabled: true,
      sondagemEnabled: true,
    });
    expect(mods).toHaveLength(0);
  });
});
