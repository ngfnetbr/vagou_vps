import { useState, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

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

export default function RedefinirSenha() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  useEffect(() => {
    if (returnTo) sessionStorage.setItem(RETURN_TO_STORAGE_KEY, returnTo);
    // Verifica se há token de recuperação no hash da URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isRecoveryToken = hashParams.get("type") === "recovery" || 
                           hashParams.get("type") === "magiclink";
    const hasAccessToken = hashParams.has("access_token");
    
    if (isRecoveryToken && hasAccessToken) {
      // Token de recuperação detectado na URL
      setIsValidSession(true);
      setIsCheckingSession(false);
      return;
    }

    // Escuta o evento de autenticação para capturar PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, "Session:", !!session);
      
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        setIsCheckingSession(false);
      } else if (event === "SIGNED_IN" && session) {
        // Verifica se veio de recuperação de senha pelo hash
        const currentHash = window.location.hash;
        if (currentHash.includes("type=recovery")) {
          setIsValidSession(true);
          setIsCheckingSession(false);
        }
      }
    });

    // Verifica se já existe uma sessão válida
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Verifica se é uma sessão de recuperação pelo hash atual
        const currentHash = window.location.hash;
        if (currentHash.includes("type=recovery") || currentHash.includes("access_token")) {
          setIsValidSession(true);
          setIsCheckingSession(false);
        } else {
          // Sessão normal existente, também permite (usuário pode querer trocar senha)
          setIsValidSession(true);
          setIsCheckingSession(false);
        }
      } else {
        // Sem sessão, aguarda um pouco para o Supabase processar o hash
        setTimeout(() => {
          setIsCheckingSession(false);
        }, 3000);
      }
    };

    checkExistingSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Redireciona se não houver sessão válida após o tempo de espera
  useEffect(() => {
    if (!isCheckingSession && !isValidSession) {
      toast.error("Link de recuperação inválido ou expirado");
      const stored = sanitizeReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY));
      const qs = stored ? `?returnTo=${encodeURIComponent(stored)}` : "";
      navigate(`/auth/recuperar-senha${qs}`);
    }
  }, [isCheckingSession, isValidSession, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setIsLoading(false);

    if (error) {
      toast.error("Erro ao redefinir senha: " + error.message);
    } else {
      toast.success("Senha redefinida com sucesso!");
      await supabase.auth.signOut();
      const stored = sanitizeReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY));
      const qs = stored ? `?returnTo=${encodeURIComponent(stored)}` : "";
      navigate(`/auth/login${qs}`);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Spinner className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Validando link de recuperação...</p>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!isValidSession) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Redefinir Senha
            </CardTitle>
            <CardDescription className="text-center">
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
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
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {isLoading ? "Redefinindo..." : "Redefinir Senha"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
      
      <PublicFooter />
    </div>
  );
}
