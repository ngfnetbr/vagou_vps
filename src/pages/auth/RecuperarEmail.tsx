import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Mail, ArrowLeft, Search, AlertCircle } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { BrandLogo } from "@/components/common/BrandLogo";
import heroChildrenImg from "@/assets/hero-children.png";

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function RecuperarEmail() {
  const [cpf, setCpf] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<{ found: boolean; emailMascarado?: string } | null>(null);
  const [searchParams] = useSearchParams();
  const returnToParam = searchParams.get("returnTo");

  // Contexto responsável (VAGOU) mostra cabeçalho/rodapé público.
  // Contexto admin/interno (SAM, Sondar, etc.) fica isolado, sem direcionar para o VAGOU.
  const isResponsavelContext = useMemo(() => {
    if (searchParams.get("contexto") === "responsavel") return true;
    if (returnToParam?.startsWith("/modulo/vagou/responsavel")) return true;
    return false;
  }, [searchParams, returnToParam]);

  const loginHref = (() => {
    const params = [
      isResponsavelContext ? "contexto=responsavel" : "",
      returnToParam ? `returnTo=${encodeURIComponent(returnToParam)}` : "",
    ].filter(Boolean);
    return params.length ? `/auth/login?${params.join("&")}` : "/auth/login";
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      toast.error("Informe um CPF válido");
      return;
    }

    setIsLoading(true);
    setResultado(null);

    const { data, error } = await supabase.functions.invoke("recuperar-email", {
      body: { cpf: cpfLimpo },
    });

    setIsLoading(false);

    if (error || (data && data.error)) {
      let errorMessage = data?.error || error?.message || "Erro ao consultar";
      try {
        if (error instanceof Error && "context" in error) {
          // @ts-expect-error Supabase error pode expor response em `context`
          const context = await error.context.json();
          if (context.error) errorMessage = context.error;
        }
      } catch {
        /* ignore */
      }
      toast.error(errorMessage);
      return;
    }

    setResultado(data);
  };

  const cardInner = (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        {!isResponsavelContext && (
          <div className="flex justify-center pb-2">
            <BrandLogo name="same" className="h-12 text-primary cursor-pointer transition-transform duration-200 ease-out hover:scale-110" title="e-SAM" />
          </div>
        )}
        <CardTitle className="text-2xl font-bold text-center">Esqueceu o e-mail?</CardTitle>
        <CardDescription className="text-center">
          Informe seu CPF para descobrir qual
          <br />
          e-mail você usou no cadastro
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              maxLength={14}
              required
            />
          </div>

          {resultado?.found && (
            <Alert className="border-primary/40 bg-primary/5">
              <Mail className="h-4 w-4 text-primary" />
              <AlertDescription>
                Seu e-mail de acesso é semelhante a{" "}
                <strong className="break-all">{resultado.emailMascarado}</strong>. Use esse e-mail para
                entrar ou para recuperar a senha.
              </AlertDescription>
            </Alert>
          )}

          {resultado && !resultado.found && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Não encontramos um cadastro com esse CPF. Verifique os dados ou entre em contato com a
                secretaria.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            <Search className="mr-2 h-4 w-4" />
            {isLoading ? "Consultando..." : "Descobrir meu e-mail"}
          </Button>
        </CardFooter>
      </form>

      <CardFooter className="flex flex-col pt-0">
        <div className="text-sm text-center">
          <Link
            to={loginHref}
            className="text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar para o login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );

  // Layout responsável (VAGOU): cabeçalho e rodapé públicos.
  if (isResponsavelContext) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-12">{cardInner}</main>
        <PublicFooter />
      </div>
    );
  }

  // Layout admin/interno isolado: sem direcionar para o VAGOU.
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <img src={heroChildrenImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 dark:opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-primary/70 dark:from-black/85 dark:via-black/80 dark:to-black/70" />
      </div>
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">{cardInner}</main>
    </div>
  );
}
