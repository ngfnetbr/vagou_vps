import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Spinner padrão do sistema.
 * Círculo com borda animada (estilo usado na tela de carregamento principal).
 * A cor segue `border-current` por padrão — passe `border-primary`,
 * `text-muted-foreground`, etc. via className para customizar.
 * Tamanho padrao h-5 w-5; sobrescreva com classes de tamanho na className.
 */
export const Spinner = ({ className, ...props }: SpinnerProps) => (
  <div
    role="status"
    aria-label="Carregando"
    className={cn(
      "inline-block animate-spin rounded-full border-b-2 border-current h-5 w-5",
      className,
    )}
    {...props}
  />
);

export default Spinner;
