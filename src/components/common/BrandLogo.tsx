import sameRaw from "@/assets/logos/same.svg?raw";
import samRaw from "@/assets/logos/sam.svg?raw";
import vagouRaw from "@/assets/logos/vagou.svg?raw";
import sondarRaw from "@/assets/logos/sondar.svg?raw";
import { cn } from "@/lib/utils";

export type BrandLogoName = "same" | "sam" | "vagou" | "sondar";

const RAW: Record<BrandLogoName, string> = {
  same: sameRaw,
  sam: samRaw,
  vagou: vagouRaw,
  sondar: sondarRaw,
};

interface BrandLogoProps {
  /** Qual logo exibir */
  name: BrandLogoName;
  /**
   * Classe da cor (text-*) e tamanho (h-*). A cor é aplicada via currentColor,
   * então em fundos brancos use ex.: "text-primary" e em fundos escuros "text-white".
   */
  className?: string;
  title?: string;
}

/**
 * Logo padronizado do SAME e seus módulos. Os SVGs usam currentColor,
 * permitindo ajustar a cor conforme o fundo (claro/escuro).
 */
export function BrandLogo({ name, className, title }: BrandLogoProps) {
  return (
    <span
      role="img"
      aria-label={title ?? `Logo ${name.toUpperCase()}`}
      className={cn("inline-flex items-center", className)}
      dangerouslySetInnerHTML={{ __html: RAW[name] }}
    />
  );
}
