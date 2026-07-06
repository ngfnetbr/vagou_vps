
import { cn } from "@/utils/utils";
import { Spinner } from "@/components/common/Spinner";

type ModuleAuthLoadingProps = {
  /** Mensagem principal exibida ao usuário */
  message?: string;
  /** Mensagem secundária (ex.: "Redirecionando para o login...") */
  hint?: string;
  className?: string;
};

/**
 * Tela de carregamento/autenticação padronizada para TODOS os módulos.
 * Mesmos tokens e espaçamentos do VAGOU: spinner primário centralizado,
 * mensagem clara e dica secundária.
 */
export function ModuleAuthLoading({
  message = "Carregando...",
  hint,
  className,
}: ModuleAuthLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        "min-h-screen flex items-center justify-center bg-background p-6",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center animate-fade-in">
        <Spinner className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">{message}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export default ModuleAuthLoading;
