import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { BrandLogo } from "@/components/common/BrandLogo";
import heroChildrenImg from "@/assets/hero-children.png";

const RETURN_TO_STORAGE_KEY = "vagou_return_to";

function sanitizeReturnTo(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.includes("://")) return null;
  if (!v.startsWith("/modulo/") && !v.startsWith("/modulo/vagou/responsavel")) return null;
  if (/^\/modulo\/[^/]+\/login(\/|$)/.test(v)) return null;
  return v;
}

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  // Contexto responsável (VAGOU) mostra cabeçalho/rodapé público.
  // Contexto admin/interno fica isolado, sem direcionar para o VAGOU.
  const isResponsavelContext = useMemo(() => {
    if (searchParams.get("contexto") === "responsavel") return true;
    if (returnTo?.startsWith("/modulo/vagou/responsavel")) return true;
    return false;
  }, [searchParams, returnTo]);

  const loginHref = (() => {
    const params = [
      isResponsavelContext ? "contexto=responsavel" : "",
      returnTo ? `returnTo=${encodeURIComponent(returnTo)}` : "",
    ].filter(Boolean);
    return params.length ? `/auth/login?${params.join("&")}` : "/auth/login";
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }

    setIsLoading(true);

    if (returnTo) sessionStorage.setItem(RETURN_TO_STORAGE_KEY, returnTo);
    const stored = sanitizeReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY));
    const qs = stored ? `?returnTo=${encodeURIComponent(stored)}` : "";

    const emailSanitizado = email.trim().toLowerCase();
    setDevResetLink(null);
    const { data, error } = await supabase.functions.invoke("recuperar-senha", {
      body: {
        email: emailSanitizado,
        redirectTo: `${window.location.origin}/auth/redefinir-senha${qs}`,
      },
    });

    setIsLoading(false);

    if (error) {
      let errorMessage = error.message;
      try {
        if (error instanceof Error && "context" in error) {
          // @ts-expect-error Supabase error pode expor response em `context`
          const context = await error.context.json();
          if (context.error) errorMessage = context.error;
        }
      } catch {
        // Ignora erro de parse
      }
      toast.error("Erro ao enviar e-mail: " + errorMessage);
    } else {
      if (typeof data?.devResetLink === "string" && data.devResetLink.startsWith("http")) {
        setDevResetLink(data.devResetLink);
        setEmailEnviado(true);
        toast.success("Link de redefinição gerado para teste local.");
      } else {
        setEmailEnviado(true);
        toast.success("E-mail de recuperação enviado!");
      }
    }
  };

  const cardInner = (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        {!isResponsavelContext && (
          <div className="flex justify-center pb-2">
            <BrandLogo name="same" className="h-12 text-primary cursor-pointer transition-transform duration-200 ease-out hover:scale-110" title="e-SAM" />
          </div>
        )}
        <CardTitle className="text-2xl font-bold text-center">Recuperar Senha</CardTitle>
        <CardDescription className="text-center">
          {emailEnviado
            ? "Verifique sua caixa de entrada"
            : "Informe seu e-mail para receber o link de recuperação"}
        </CardDescription>
      </CardHeader>

      {emailEnviado ? (
        <CardContent className="space-y-4">
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              {devResetLink ? (
                <>
                  Em ambiente local, o sistema gerou um link de redefinição para teste
                  em vez de abrir automaticamente. Use o botão abaixo para simular o
                  acesso ao e-mail.
                </>
              ) : (
                <>
                  Um e-mail com instruções para redefinir sua senha foi enviado para{" "}
                  <strong>{email}</strong>. Verifique também a pasta de spam.
                </>
              )}
            </AlertDescription>
          </Alert>

          {devResetLink && (
            <Button className="w-full" asChild>
              <a href={devResetLink}>Abrir link de teste</a>
            </Button>
          )}

          <Button variant="outline" className="w-full" onClick={() => setEmailEnviado(false)}>
            Enviar para outro e-mail
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail cadastrado</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              <Mail className="mr-2 h-4 w-4" />
              {isLoading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </CardFooter>
        </form>
      )}

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
