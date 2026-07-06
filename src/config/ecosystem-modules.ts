import { GraduationCap, ClipboardCheck, HeartPulse, type LucideIcon } from "lucide-react";
import type { BrandLogoName } from "@/components/common/BrandLogo";

/**
 * Registro central dos módulos do ecossistema SAME.
 *
 * A plataforma-mãe (SAME) trata VAGOU, SONDAR e SAM (atendimento) como módulos
 * de mesmo nível. Cada módulo declara identidade visual, rota base e a forma de
 * calcular acesso/destino para o usuário atual.
 */

export type EcosystemModuleId = "vagou" | "sondar" | "sam";

export interface EcosystemModuleMeta {
  id: EcosystemModuleId;
  /** slug usado em rotas /modulo/<slug>/ quando aplicável */
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  /** logo SVG padronizado do módulo */
  logo: BrandLogoName;
  /** classes tailwind para o gradiente do card (tokens semânticos) */
  accentClass: string;
}

export const ECOSYSTEM_MODULES: EcosystemModuleMeta[] = [
  {
    id: "vagou",
    slug: "vagou",
    name: "VAGOU",
    shortName: "VAGOU",
    description: "Gestão Inteligente de Vagas da Educação Infantil.",
    icon: GraduationCap,
    logo: "vagou",
    accentClass: "from-primary/80 to-primary",
  },
  {
    id: "sondar",
    slug: "sondar",
    name: "SONDAR",
    shortName: "SONDAR",
    description: "Sistema de Sondagem da Aprendizagem.",
    icon: ClipboardCheck,
    logo: "sondar",
    accentClass: "from-secondary/70 to-secondary",
  },
  {
    id: "sam",
    slug: "sam",
    name: "SAM",
    shortName: "SAM",
    description: "Sistema de Atendimento Multidisciplinar.",
    icon: HeartPulse,
    logo: "sam",
    accentClass: "from-accent/70 to-accent",
  },
];

const STAFF_ADMIN_ROLES = ["admin", "superadmin", "gestor"];

export interface ModuleAccessInput {
  roles: string[];
  permissions: string[];
  samEnabled: boolean;
  sondagemEnabled: boolean;
  /** habilitação do módulo VAGOU no município (default: true) */
  vagouEnabled?: boolean;
}

export interface AccessibleModule extends EcosystemModuleMeta {
  homePath: string;
}

/**
 * Calcula quais módulos o usuário pode acessar e o destino (home) de cada um,
 * a partir de roles, permissões e flags de habilitação do município.
 */
export function getAccessibleModules({
  roles,
  permissions,
  samEnabled,
  sondagemEnabled,
  vagouEnabled = true,
}: ModuleAccessInput): AccessibleModule[] {
  const isSuperAdmin = roles.includes("superadmin");
  const hasStaffAdmin = roles.some((r) => STAFF_ADMIN_ROLES.includes(r));
  const hasDiretor = roles.includes("diretor_cmei");
  const hasResponsavel = roles.includes("responsavel");
  const hasPortalEscola = roles.includes("school_coord");

  const result: AccessibleModule[] = [];

  // VAGOU agora é tratado como um módulo do ecossistema: exige a permissão
  // explícita "modulos.vagou.acessar" (assim como SAM e SONDAR). O papel do
  // sistema principal define apenas o destino (home) dentro do VAGOU.
  const hasVagouRole = hasStaffAdmin || hasDiretor || hasResponsavel;
  const canVagou =
    isSuperAdmin ||
    (vagouEnabled && hasVagouRole && permissions.includes("modulos.vagou.acessar"));
  if (canVagou) {
    const homePath = hasStaffAdmin || isSuperAdmin
      ? "/modulo/vagou/admin"
      : hasDiretor
        ? "/modulo/vagou/admin/diretor"
        : "/modulo/vagou/responsavel";
    const meta = ECOSYSTEM_MODULES.find((m) => m.id === "vagou")!;
    result.push({ ...meta, homePath });
  }


  // SONDAR
  const canSondagem = isSuperAdmin || (sondagemEnabled && permissions.includes("modulos.sondagem.acessar"));
  if (canSondagem) {
    const meta = ECOSYSTEM_MODULES.find((m) => m.id === "sondar")!;
    result.push({ ...meta, homePath: "/modulo/sondar" });
  }

  // SAM
  const canSam = isSuperAdmin || (samEnabled && permissions.includes("modulos.sam.acessar"));
  if (canSam) {
    const meta = ECOSYSTEM_MODULES.find((m) => m.id === "sam")!;
    const homePath = hasPortalEscola && !hasStaffAdmin && !isSuperAdmin
      ? "/modulo/sam/escola/dashboard"
      : "/modulo/sam";
    result.push({ ...meta, homePath });
  }

  return result;
}
