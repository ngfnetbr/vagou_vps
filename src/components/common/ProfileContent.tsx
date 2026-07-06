import { useState, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Mail, Phone, CreditCard, Shield, Camera, Lock, Bell, Volume2, Calendar, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordStrength } from "@/components/ui/password-strength";
import { PasswordInput } from "@/components/ui/password-input";
import { forcePlayNotificationSound } from "@/hooks/use-realtime-updates";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { maskCPF, maskPhone } from "@/utils/masks";
import { consultarCpf } from "@/utils/consultar-cpf";

// Componente de configurações de notificação
function NotificationSettingsCard() {
  const { soundEnabled, toastEnabled, setSoundEnabled, setToastEnabled } = useNotificationPreferences();

  const handleTestSound = () => {
    forcePlayNotificationSound();
    toast.success("Som de teste reproduzido!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferências de Notificação
        </CardTitle>
        <CardDescription>
          Configure como você deseja receber alertas em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Som de Notificação
            </Label>
            <p className="text-sm text-muted-foreground">
              Reproduzir som quando houver novas atividades
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            <Button variant="outline" size="sm" onClick={handleTestSound} disabled={!soundEnabled}>
              Testar
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações Toast
            </Label>
            <p className="text-sm text-muted-foreground">
              Exibir alertas visuais quando houver novas atividades
            </p>
          </div>
          <Switch checked={toastEnabled} onCheckedChange={setToastEnabled} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Conteúdo do perfil do usuário, sem layout. Usado pela página de perfil do
 * sistema principal (VAGOU) e pelos módulos SAM e Sondar.
 */
export function ProfileContent() {
  const { user, userProfile, getPrimaryRole, userRoles } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isConsultandoCpf, setIsConsultandoCpf] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: "",
    cpf: "",
    telefone: "",
    sexo: "",
    data_nascimento: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        nome_completo: userProfile.nome_completo || "",
        cpf: maskCPF((userProfile as any).cpf || ""),
        telefone: maskPhone((userProfile as any).telefone || ""),
        sexo: (userProfile as any).sexo || "",
        data_nascimento: (userProfile as any).data_nascimento || "",
        avatar_url: (userProfile as any).avatar_url || "",
      });
    }
  }, [userProfile]);

  const handleConsultarCpf = async (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return;
    setIsConsultandoCpf(true);
    try {
      const res = await consultarCpf(cpf, "responsavel");
      if (res.found) {
        setFormData((prev) => ({
          ...prev,
          nome_completo: res.nome && !prev.nome_completo ? res.nome : prev.nome_completo,
          data_nascimento:
            res.data_nascimento && !prev.data_nascimento ? res.data_nascimento : prev.data_nascimento,
        }));
        toast.success("Dados encontrados e preenchidos automaticamente!");
      }
    } finally {
      setIsConsultandoCpf(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || "U";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as any)
        .eq("id", user.id);

      if (updateError) throw updateError;

      setFormData((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Avatar atualizado com sucesso!");

      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao atualizar avatar: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nome_completo: formData.nome_completo,
          cpf: formData.cpf || null,
          telefone: formData.telefone || null,
          sexo: formData.sexo || null,
          data_nascimento: formData.data_nascimento || null,
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");

      window.location.reload();
    } catch (error: any) {
      toast.error("Erro ao atualizar perfil: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error("Erro ao alterar senha: " + error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      {/* Avatar e Info Básica */}
      <Card>
        <CardHeader>
          <CardTitle>Foto de Perfil</CardTitle>
          <CardDescription>
            Sua foto será exibida no cabeçalho e em outras áreas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={formData.avatar_url} alt={formData.nome_completo} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {getInitials(formData.nome_completo)}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
            >
              {isUploading ? (
                <Spinner className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
          </div>
          <div>
            <p className="font-medium text-lg">{formData.nome_completo || "Usuário"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{getPrimaryRole()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Edição */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Atualize suas informações de contato</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_completo">
                <User className="inline h-4 w-4 mr-2" />
                Nome Completo
              </Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nome_completo: e.target.value }))
                }
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="inline h-4 w-4 mr-2" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">
                <CreditCard className="inline h-4 w-4 mr-2" />
                CPF
              </Label>
              <div className="relative">
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cpf: maskCPF(e.target.value) }))}
                  onBlur={(e) => handleConsultarCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {isConsultandoCpf && (
                  <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Ao informar o CPF, tentamos preencher nome e data de nascimento automaticamente.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Data de Nascimento
                </Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, data_nascimento: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sexo">
                  <Users className="inline h-4 w-4 mr-2" />
                  Sexo
                </Label>
                <Select
                  value={formData.sexo}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, sexo: value }))}
                >
                  <SelectTrigger id="sexo">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">
                <Phone className="inline h-4 w-4 mr-2" />
                Telefone
              </Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData((prev) => ({ ...prev, telefone: maskPhone(e.target.value) }))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <Separator className="my-4" />

            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>Atualize sua senha de acesso ao sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                <Lock className="inline h-4 w-4 mr-2" />
                Nova Senha
              </Label>
              <PasswordInput
                id="newPassword"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                placeholder="Digite a nova senha"
              />
              <PasswordStrength password={passwordData.newPassword} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                <Lock className="inline h-4 w-4 mr-2" />
                Confirmar Nova Senha
              </Label>
              <PasswordInput
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                placeholder="Confirme a nova senha"
              />
            </div>

            <Alert>
              <AlertDescription>A senha deve ter no mínimo 6 caracteres</AlertDescription>
            </Alert>

            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              Alterar Senha
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferências de Notificação */}
      <NotificationSettingsCard />

      {/* Roles do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões</CardTitle>
          <CardDescription>Suas funções e níveis de acesso no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((role) => (
              <span
                key={role}
                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
              >
                {role === "superadmin" && "Super Admin"}
                {role === "admin" && "Administrador"}
                {role === "gestor" && "Gestor"}
                {role === "diretor_cmei" && "Diretor (VAGOU)"}
                {role === "school_coord" && "Portal da Escola"}
                {role === "responsavel" && "Responsável"}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfileContent;
