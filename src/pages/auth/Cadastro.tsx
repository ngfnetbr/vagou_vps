import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { maskCPF, maskPhone } from "@/utils/masks";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { getErrorMessage } from "@/utils/error-utils";

export default function Cadastro() {
  const [formData, setFormData] = useState({
    nome_completo: "",
    cpf: "",
    telefone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    let maskedValue = value;
    
    if (field === "cpf") {
      maskedValue = maskCPF(value);
    } else if (field === "telefone") {
      maskedValue = maskPhone(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: maskedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.nome_completo || !formData.cpf || !formData.email || !formData.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(
      formData.email,
      formData.password,
      {
        nome_completo: formData.nome_completo,
        cpf: formData.cpf.replace(/\D/g, ""),
        telefone: formData.telefone,
      }
    );

    if (error) {
      toast.error(getErrorMessage(error));
      setIsLoading(false);
    } else {
      toast.success("Conta criada com sucesso! Verifique seu e-mail.");
      navigate("/auth/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Criar conta
            </CardTitle>
            <CardDescription className="text-center">
              Cadastre-se para acompanhar suas inscrições
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  placeholder="Seu nome completo"
                  value={formData.nome_completo}
                  onChange={(e) => handleChange("nome_completo", e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => handleChange("cpf", e.target.value)}
                  maxLength={14}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => handleChange("telefone", e.target.value)}
                  maxLength={15}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
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
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {isLoading ? "Criando conta..." : "Criar conta"}
              </Button>
              
              <div className="text-sm text-center text-muted-foreground">
                Já tem uma conta?{" "}
                <Link 
                  to="/auth/login" 
                  className="text-primary hover:underline font-medium"
                >
                  Entrar
                </Link>
              </div>
              
              <div className="text-sm text-center">
                <Link 
                  to="/modulo/vagou/publico" 
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  ← Voltar para área pública
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
      
      <PublicFooter />
    </div>
  );
}


