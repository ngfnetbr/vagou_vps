// @ts-nocheck
export const SONDAGEM_BASE = "/modulo/sondar";

export type SondagemRole =
  | "admin"
  | "equipe_pedagogica"
  | "coordenador"
  | "responsavel";

export interface SondagemMenuAccessItem {
  title: string;
  url: string;
  roles: SondagemRole[];
  permissionGate?: "aplicar" | "solicitar";
}

export const mainMenuAccessItems: SondagemMenuAccessItem[] = [
  {
    title: "Dashboard",
    url: `${SONDAGEM_BASE}/dashboard`,
    roles: ["admin", "equipe_pedagogica", "coordenador", "responsavel"],
  },
  {
    title: "Alunos",
    url: `${SONDAGEM_BASE}/cadastros/alunos`,
    roles: ["admin", "equipe_pedagogica", "coordenador"],
  },
  {
    title: "Solicitar Sondagem",
    url: `${SONDAGEM_BASE}/solicitar`,
    roles: ["admin", "equipe_pedagogica"],
    permissionGate: "solicitar",
  },
  {
    title: "Lançamento",
    url: `${SONDAGEM_BASE}/aplicar`,
    roles: ["responsavel", "coordenador"],
    permissionGate: "aplicar",
  },
  {
    title: "Relatórios",
    url: `${SONDAGEM_BASE}/relatorios`,
    roles: ["admin", "equipe_pedagogica", "coordenador"],
  },
];

interface MenuVisibilityOptions {
  role: string | null;
  canViewAplicar: boolean;
  canViewSolicitar: boolean;
}

export function getVisibleMainMenuItems({
  role,
  canViewAplicar,
  canViewSolicitar,
}: MenuVisibilityOptions): SondagemMenuAccessItem[] {
  return mainMenuAccessItems.filter((item) => {
    if (item.permissionGate === "aplicar" && !canViewAplicar) {
      return false;
    }

    if (item.permissionGate === "solicitar" && !canViewSolicitar) {
      return false;
    }

    return !role || item.roles.includes(role as SondagemRole);
  });
}
