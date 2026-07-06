// Color map for assessment levels - progression from red (lowest) to green (highest)
// Escrita levels
export const ESCRITA_COLORS: Record<string, string> = {
  PIC: "hsl(0, 72%, 51%)",       // Pictórico - vermelho
  N1:  "hsl(15, 80%, 50%)",      // Nível 1 - vermelho-laranja
  N2:  "hsl(30, 85%, 50%)",      // Nível 2 - laranja
  INT1: "hsl(45, 90%, 48%)",     // Inter I - amarelo-laranja
  SIL: "hsl(55, 85%, 45%)",      // Silábico - amarelo
  INT2: "hsl(90, 60%, 45%)",     // Inter II - amarelo-verde
  ALF: "hsl(142, 71%, 40%)",     // Alfabético - verde
};

// Produção de texto levels
export const PRODUCAO_COLORS: Record<string, string> = {
  TMD: "hsl(0, 72%, 51%)",       // Texto com muita dificuldade - vermelho
  TPD: "hsl(38, 92%, 50%)",      // Texto com pouca dificuldade - amarelo
  TDP: "hsl(90, 60%, 45%)",      // Texto com dificuldade parcial - amarelo-verde
  TAL: "hsl(142, 71%, 40%)",     // Texto alfabético - verde
};

export function getEscritaColor(codigo: string): string {
  return ESCRITA_COLORS[codigo] || "hsl(215, 15%, 47%)";
}

export function getProducaoColor(codigo: string): string {
  return PRODUCAO_COLORS[codigo] || "hsl(215, 15%, 47%)";
}
