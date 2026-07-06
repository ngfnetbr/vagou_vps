import { SVGProps } from "react";

/**
 * Ícone de bebê no estilo Bootstrap Icons (viewBox 16x16, currentColor).
 * O conjunto Bootstrap Icons não possui um bebê nativo, então este SVG
 * dedicado mantém a mesma linguagem visual (formas geométricas limpas).
 */
export function BabyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {/* cachinho */}
      <circle cx="8.7" cy="2.3" r="0.75" />
      {/* cabeça (anel) */}
      <path
        fillRule="evenodd"
        d="M8 2.6a5.7 5.7 0 1 0 0 11.4A5.7 5.7 0 0 0 8 2.6Zm0 1.3a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8Z"
      />
      {/* olhos */}
      <circle cx="6.3" cy="7.6" r="0.85" />
      <circle cx="9.7" cy="7.6" r="0.85" />
      {/* sorriso */}
      <path d="M6.1 9.7a.55.55 0 0 1 .76.16 1.4 1.4 0 0 0 2.28 0 .55.55 0 1 1 .92.6 2.5 2.5 0 0 1-4.12 0 .55.55 0 0 1 .16-.76Z" />
    </svg>
  );
}

export default BabyIcon;
