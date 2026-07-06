import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { getErrorMessage } from "@/utils/error-utils";
import { ECOSYSTEM_MODULES } from "@/config/ecosystem-modules";
import { BrandLogo } from "@/components/common/BrandLogo";
import sameLogoUrl from "@/assets/logos/same.svg";
import heroChildrenImg from "@/assets/hero-children.png";
import hfLogo from "@/assets/hf-logo.png";
import { useConfiguracoesPublicas } from "@/hooks/api/configuracoes-hooks";

const APP_VERSION = "v1.0.0";

// SVG do Google
const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const RETURN_TO_STORAGE_KEY = "vagou_return_to";

function sanitizeReturnTo(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.includes("://")) return null;
  if (!v.startsWith("/modulo/")) return null;
  if (/^\/modulo\/[^/]+\/login(\/|$)/.test(v)) return null;
  return v;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { data: publicConfig } = useConfiguracoesPublicas();
  const devLogoUrl = publicConfig?.logo_empresa_url || hfLogo;
  const devLogoLink = (publicConfig as any)?.logo_empresa_link || "https://hfgestaopublica.com.br/";



  const returnTo = useMemo(() => sanitizeReturnTo(searchParams.get("returnTo")), [searchParams]);

  // Saudação dinâmica conforme o horário + "bem-vindo de volta" para quem já acessou
  const [isReturningUser, setIsReturningUser] = useState(false);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Bom dia";
    if (h >= 12 && h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem("same_visited_before") === "1") {
        setIsReturningUser(true);
      }
      localStorage.setItem("same_visited_before", "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Contexto "responsável" (VAGOU): mostra cadastro e voltar para área pública.
  // Login admin/interno (módulos, área restrita) não exibe essas opções.
  const isResponsavelContext = useMemo(() => {
    if (searchParams.get("contexto") === "responsavel") return true;
    const stateRedirect = (location.state as { redirectTo?: string } | null)?.redirectTo;
    if (stateRedirect?.startsWith("/modulo/vagou/responsavel")) return true;
    if (returnTo?.startsWith("/modulo/vagou/responsavel")) return true;
    return false;
  }, [searchParams, location.state, returnTo]);

  // Mensagem dinâmica com efeito de digitação (digita e apaga sempre um novo texto)
  // No login público (responsável) os dizeres remetem ao VAGOU.
  const typingPhrases = useMemo(
    () =>
      isResponsavelContext
        ? [
            "Acesse sua conta para continuar no VAGOU.",
            "Faça sua inscrição com poucos cliques.",
            "Acompanhe sua posição na fila de espera.",
            "Bom te ver por aqui. Vamos começar?",
          ]
        : [
            "Acesse sua conta para continuar no e-SAM.",
            "Sistema de Apoio Multidisciplinar Educacional.",
            "VAGOU, SONDAR e SAM em um só lugar.",
            "Bom te ver por aqui. Vamos começar?",
          ],
    [isResponsavelContext]
  );
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = typingPhrases[phraseIndex];
      if (!deleting) {
        charIndex++;
        setTypedText(current.slice(0, charIndex));
        if (charIndex === current.length) {
          deleting = true;
          timeout = setTimeout(tick, 1800);
          return;
        }
        timeout = setTimeout(tick, 55);
      } else {
        charIndex--;
        setTypedText(current.slice(0, charIndex));
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % typingPhrases.length;
          timeout = setTimeout(tick, 350);
          return;
        }
        timeout = setTimeout(tick, 30);
      }
    };

    timeout = setTimeout(tick, 600);
    return () => clearTimeout(timeout);
  }, [typingPhrases]);



  useEffect(() => {
    if (!returnTo) return;
    sessionStorage.setItem(RETURN_TO_STORAGE_KEY, returnTo);
  }, [returnTo]);

  // Usuário já autenticado não fica preso na tela de login
  useEffect(() => {
    if (isAuthLoading || !user) return;
    const stored = sanitizeReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY));
    const qs = stored ? `?returnTo=${encodeURIComponent(stored)}` : "";
    navigate(`/auth/redirect${qs}`, { replace: true });
  }, [user, isAuthLoading, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      void supabase.functions
        .invoke("registrar-tentativa-login", {
          body: {
            email,
            provider: "password",
            sucesso: false,
            motivo: getErrorMessage(error),
            path: "/auth/login",
          },
        })
        .catch(() => {});
      toast.error(getErrorMessage(error));
      setIsLoading(false);
    } else {
      // Gate por contexto: responsável não entra pelo login admin e vice-versa.
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      let roles: string[] = [];
      if (uid) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        roles = (rolesData ?? []).map((r) => r.role as string);
      }
      const isResponsavel = roles.length > 0 && roles.every((r) => r === "responsavel");
      const isStaff = roles.some((r) => r !== "responsavel");

      if (isResponsavelContext && isStaff) {
        await supabase.auth.signOut();
        toast.error("Esta conta é administrativa. Acesse pela área restrita do sistema.");
        setIsLoading(false);
        return;
      }
      if (!isResponsavelContext && isResponsavel) {
        await supabase.auth.signOut();
        toast.error("Esta conta é de responsável. Acesse pela Área do Responsável.");
        setIsLoading(false);
        return;
      }

      toast.success("Login realizado com sucesso!");
      // Pequeno delay para garantir que o AuthContext processe o login
      setTimeout(() => {
        const stored = sanitizeReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY));
        const qs = stored ? `?returnTo=${encodeURIComponent(stored)}` : "";
        navigate(`/auth/redirect${qs}`);
      }, 300);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const stored = sanitizeReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY));
    const qs = stored ? `?returnTo=${encodeURIComponent(stored)}` : "";
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/redirect${qs}`,
      },
    });

    if (error) {
      void supabase.functions
        .invoke("registrar-tentativa-login", {
          body: {
            email,
            provider: "google",
            sucesso: false,
            motivo: getErrorMessage(error),
            path: "/auth/login",
          },
        })
        .catch(() => {});
      toast.error(getErrorMessage(error));
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="group relative min-h-screen flex flex-col">
      {/* Fundo azul com a foto das crianças (igual área pública) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <img
          src={heroChildrenImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40 dark:opacity-15 transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-primary/70 dark:from-black/85 dark:via-black/80 dark:to-black/70" />
      </div>

      {isResponsavelContext && (
        <div className="relative z-10">
          <PublicHeader />
        </div>
      )}
      
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">

        <Card className="relative w-full max-w-md overflow-hidden bg-card shadow-2xl">
          <div className="relative z-10">
          <CardHeader className="space-y-3">
            <div className="flex justify-center">
              <span className="brand-shine rounded-md">
                <BrandLogo
                  name={isResponsavelContext ? "vagou" : "same"}
                  className="h-14 text-primary"
                  title={isResponsavelContext ? "VAGOU" : "e-SAM"}
                />
              </span>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-center">
                {greeting}
                {isReturningUser ? ", bem-vindo(a) de volta!" : ", seja bem-vindo(a)!"}
              </CardTitle>
              <CardDescription className="text-center min-h-[1.25rem]">
                <span className="typing-caret">{typedText}</span>
              </CardDescription>
            </div>
            {!isResponsavelContext && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {ECOSYSTEM_MODULES.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:scale-110 hover:bg-primary/10 hover:border-primary/30"
                  >
                    <BrandLogo name={m.logo} className="h-5 text-foreground/70" title={m.shortName} />
                    {m.beta && (
                      <span className="rounded bg-info/15 px-1 text-[9px] font-bold text-info">
                        BETA
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </CardHeader>


          
          <CardContent className="space-y-4">
            {/* Login com Google (apenas no contexto responsável/público) */}
            {isResponsavelContext && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span className="ml-2">Continuar com Google</span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      ou continue com e-mail
                    </span>
                  </div>
                </div>
              </>
            )}

            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link 
                    to={
                      isResponsavelContext
                        ? `/auth/recuperar-senha?contexto=responsavel${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`
                        : returnTo
                          ? `/auth/recuperar-senha?returnTo=${encodeURIComponent(returnTo)}`
                          : "/auth/recuperar-senha"
                    }
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>

              <div className="text-center text-sm">
                <Link
                  to={
                    isResponsavelContext
                      ? `/auth/recuperar-email?contexto=responsavel${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`
                      : returnTo
                        ? `/auth/recuperar-email?returnTo=${encodeURIComponent(returnTo)}`
                        : "/auth/recuperar-email"
                  }
                  className="text-muted-foreground hover:text-primary hover:underline"
                >
                  Esqueceu o e-mail de acesso?
                </Link>
              </div>

              {isResponsavelContext && (
                <div className="text-sm text-center text-muted-foreground">
                  Não tem uma conta?{" "}
                  <Link
                    to="/auth/cadastro"
                    className="text-primary hover:underline font-medium"
                  >
                    Cadastre-se
                  </Link>
                </div>
              )}
            </form>

            {/* Versão do sistema e desenvolvedor */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <span className="text-[11px] text-muted-foreground">
                {isResponsavelContext ? "VAGOU" : "e-SAM"} {APP_VERSION}
              </span>
              <a
                href={devLogoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 opacity-80 transition-opacity hover:opacity-100"
              >
                <span className="text-[11px] text-muted-foreground">Desenvolvido por</span>
                <span
                  className="h-10 w-auto bg-primary"
                  style={{
                    display: "inline-block",
                    width: "auto",
                    minWidth: "4rem",
                    WebkitMaskImage: `url(${devLogoUrl})`,
                    maskImage: `url(${devLogoUrl})`,
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                  aria-label="Logo do desenvolvedor"
                  role="img"
                />
              </a>
            </div>
          </CardContent>
          
          {isResponsavelContext && (
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-center">
                <Link 
                  to="/modulo/vagou/publico" 
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  ← Voltar para área pública
                </Link>
              </div>
            </CardFooter>
          )}
          </div>
        </Card>
      </main>
      
      {isResponsavelContext && (
        <div className="relative z-10">
          <PublicFooter />
        </div>
      )}

    </div>
  );
}
