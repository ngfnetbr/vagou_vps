import { useState, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfiguracoesSistema, useUpdateConfiguracoes } from "@/hooks/api/configuracoes-hooks";
import { Pencil, Upload, Palette, Type, Settings2, Image, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/contexts/AuthContext";

const FONTES_DISPONIVEIS = [
  { value: "Inter", label: "Inter (Padrão)" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Source Sans Pro", label: "Source Sans Pro" },
  { value: "Nunito", label: "Nunito" },
  { value: "Raleway", label: "Raleway" },
  { value: "Ubuntu", label: "Ubuntu" },
];

const CORES_PREDEFINIDAS = [
  { value: "#1351B4", label: "Azul Gov.br", group: "Institucional" },
  { value: "#1351B4", label: "Azul Escuro", group: "Institucional" },
  { value: "#2670E8", label: "Azul Claro", group: "Institucional" },
  { value: "#168821", label: "Verde", group: "Sucesso" },
  { value: "#E52207", label: "Vermelho", group: "Alerta" },
  { value: "#FFCD07", label: "Amarelo", group: "Atenção" },
  { value: "#9E1B73", label: "Magenta", group: "Destaque" },
  { value: "#1B9E77", label: "Teal", group: "Alternativo" },
  { value: "#6610F2", label: "Roxo", group: "Alternativo" },
  { value: "#0D6EFD", label: "Azul Bootstrap", group: "Alternativo" },
];

export function SistemaConfigDialog() {
  const [open, setOpen] = useState(false);
  const { data: config, refetch } = useConfiguracoesSistema();
  const updateConfig = useUpdateConfiguracoes();
  const { userRoles } = useAuth();
  const isSuperAdmin = userRoles.includes("superadmin");
  const [uploading, setUploading] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Estados locais
  const [sistemaNome, setSistemaNome] = useState("");
  const [logoEmpresaLink, setLogoEmpresaLink] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#1351B4");
  const [corSecundaria, setCorSecundaria] = useState("#1351B4");
  const [fonte, setFonte] = useState("Inter");
  
  // Estados de Email SMTP
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpSenderName, setSmtpSenderName] = useState("");
  const [smtpSenderEmail, setSmtpSenderEmail] = useState("");

  // Sincronizar com dados do servidor
  useEffect(() => {
    if (config) {
      setSistemaNome(config.sistema_nome || "VAGOU");
      setLogoEmpresaLink(config.logo_empresa_link || "");
      setCorPrimaria(config.tema_cor_primaria || "#1351B4");
      setCorSecundaria(config.tema_cor_secundaria || "#1351B4");
      setFonte(config.tema_fonte || "Inter");
      
      // Sync SMTP
      setSmtpHost(config.smtp_host || "");
      setSmtpPort(config.smtp_port || 587);
      setSmtpUser(config.smtp_user || "");
      setSmtpPassword(config.smtp_password || "");
      setSmtpSecure(config.smtp_secure || false);
      setSmtpSenderName(config.smtp_sender_name || "");
      setSmtpSenderEmail(config.smtp_sender_email || "");
    }
  }, [config]);

  const handleSave = async () => {
    await updateConfig.mutateAsync({
      sistema_nome: sistemaNome,
      logo_empresa_link: logoEmpresaLink,
      tema_cor_primaria: corPrimaria,
      tema_cor_secundaria: corSecundaria,
      tema_fonte: fonte,
      // Save SMTP
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_user: smtpUser,
      smtp_password: smtpPassword,
      smtp_secure: smtpSecure,
      smtp_sender_name: smtpSenderName,
      smtp_sender_email: smtpSenderEmail,
    });
    refetch();
    setOpen(false);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou SVG.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `sistema-icone-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("brasoes")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brasoes")
        .getPublicUrl(fileName);

      await updateConfig.mutateAsync({ sistema_icone_url: publicUrl });
      refetch();
      toast.success("Ícone atualizado!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/x-icon", "image/ico", "image/svg+xml", "image/jpeg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, ICO, SVG ou JPG.");
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 1MB.");
      return;
    }

    setUploadingFavicon(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `favicon-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("brasoes")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brasoes")
        .getPublicUrl(fileName);

      await updateConfig.mutateAsync({ favicon_url: publicUrl } as any);
      refetch();
      toast.success("Favicon atualizado!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `sistema-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("brasoes")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brasoes")
        .getPublicUrl(fileName);

      await updateConfig.mutateAsync({ logo_empresa_url: publicUrl });
      refetch();
      toast.success("Logo da empresa atualizado!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleResetToDefaults = async () => {
    setCorPrimaria("#1351B4");
    setCorSecundaria("#1351B4");
    setFonte("Inter");
    setSistemaNome("VAGOU");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Personalizar Sistema
          </DialogTitle>
          <DialogDescription>
            Personalize a aparência do sistema. Apenas super administradores têm acesso.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral" className="text-xs">
              <Settings2 className="h-3 w-3 mr-1" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs">
              <Mail className="h-3 w-3 mr-1" />
              E-mail
            </TabsTrigger>
            <TabsTrigger value="cores" className="text-xs">
              <Palette className="h-3 w-3 mr-1" />
              Cores
            </TabsTrigger>
            <TabsTrigger value="tipografia" className="text-xs">
              <Type className="h-3 w-3 mr-1" />
              Fonte
            </TabsTrigger>
          </TabsList>

          {/* Tab Geral */}
          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="sistema-nome">Nome do Sistema</Label>
              <Input
                id="sistema-nome"
                value={sistemaNome}
                onChange={(e) => setSistemaNome(e.target.value)}
                placeholder="VAGOU"
              />
            </div>
            <div className="grid gap-2">
              <Label>Ícone do Sistema</Label>
              <div className="flex items-center gap-3">
                {config?.sistema_icone_url && (
                  <img
                    src={config.sistema_icone_url}
                    alt="Ícone atual"
                    className="h-12 w-12 object-contain rounded border bg-muted p-1"
                  />
                )}
                <Label
                  htmlFor="icone-upload"
                  className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors"
                >
                  {uploading ? (
                    <Spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? "Enviando..." : "Escolher arquivo"}
                </Label>
                <Input
                  id="icone-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  className="hidden"
                  onChange={handleIconUpload}
                  disabled={uploading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG ou SVG. Máximo 2MB. Exibido no menu lateral.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Favicon (Ícone da Aba do Navegador)</Label>
              <div className="flex items-center gap-3">
                {(config as any)?.favicon_url && (
                  <img
                    src={(config as any).favicon_url}
                    alt="Favicon atual"
                    className="h-8 w-8 object-contain rounded border bg-muted p-0.5"
                  />
                )}
                <Label
                  htmlFor="favicon-upload"
                  className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors"
                >
                  {uploadingFavicon ? (
                    <Spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <Image className="h-4 w-4" />
                  )}
                  {uploadingFavicon ? "Enviando..." : "Escolher arquivo"}
                </Label>
                <Input
                  id="favicon-upload"
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml,image/jpeg,.ico"
                  className="hidden"
                  onChange={handleFaviconUpload}
                  disabled={uploadingFavicon}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, ICO ou SVG. Recomendado 32x32 ou 64x64 pixels. Máximo 1MB.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Logo da Empresa (Cabeçalho/Rodapé)</Label>
              <div className="flex items-center gap-3">
                {config?.logo_empresa_url && (
                  <img
                    src={config.logo_empresa_url}
                    alt="Logo atual"
                    className="h-12 object-contain rounded border bg-muted p-1"
                  />
                )}
                <Label
                  htmlFor="logo-upload"
                  className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors"
                >
                  {uploadingLogo ? (
                    <Spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <Image className="h-4 w-4" />
                  )}
                  {uploadingLogo ? "Enviando..." : "Escolher arquivo"}
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG ou SVG. Recomendado formato horizontal. Máximo 5MB.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logo_empresa_link">Link do Logo (Opcional)</Label>
              <Input
                id="logo_empresa_link"
                value={logoEmpresaLink}
                onChange={(e) => setLogoEmpresaLink(e.target.value)}
                placeholder="https://exemplo.com.br"
              />
              <p className="text-xs text-muted-foreground">
                Link para onde o usuário será redirecionado ao clicar no logo da empresa.
              </p>
            </div>
          </TabsContent>

          {/* Tab Email */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="smtp-host">Servidor SMTP (Host)</Label>
              <Input
                id="smtp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.exemplo.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="smtp-port">Porta</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  placeholder="587"
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="smtp-secure"
                  checked={smtpSecure}
                  onCheckedChange={setSmtpSecure}
                />
                <Label htmlFor="smtp-secure">Usar SSL/TLS</Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-user">Usuário SMTP</Label>
              <Input
                id="smtp-user"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="usuario@exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-password">Senha SMTP</Label>
              <PasswordInput
                id="smtp-password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-sender-name">Nome do Remetente</Label>
              <Input
                id="smtp-sender-name"
                value={smtpSenderName}
                onChange={(e) => setSmtpSenderName(e.target.value)}
                placeholder="Sistema VAGOU"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-sender-email">Email do Remetente</Label>
              <Input
                id="smtp-sender-email"
                type="email"
                value={smtpSenderEmail}
                onChange={(e) => setSmtpSenderEmail(e.target.value)}
                placeholder="nao-responda@vagou.com"
              />
            </div>
          </TabsContent>

          {/* Tab Cores */}
          <TabsContent value="cores" className="space-y-4 mt-4">
            {!isSuperAdmin && (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Somente SUPERADMIN pode alterar as cores do sistema.
              </div>
            )}
            <div className="grid gap-3">
              <Label>Cor Primária</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-md border shadow-sm cursor-pointer"
                  style={{ backgroundColor: corPrimaria }}
                />
                <Input
                  type="color"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                  disabled={!isSuperAdmin}
                />
                <Input
                  type="text"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#1351B4"
                  disabled={!isSuperAdmin}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {CORES_PREDEFINIDAS.slice(0, 5).map((cor) => (
                  <button
                    key={cor.value}
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => setCorPrimaria(cor.value)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                      corPrimaria === cor.value ? "border-foreground ring-2 ring-offset-2" : "border-transparent"
                    }`}
                    style={{ backgroundColor: cor.value }}
                    title={cor.label}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Cor Secundária (Menu/Header)</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-md border shadow-sm"
                  style={{ backgroundColor: corSecundaria }}
                />
                <Input
                  type="color"
                  value={corSecundaria}
                  onChange={(e) => setCorSecundaria(e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                  disabled={!isSuperAdmin}
                />
                <Input
                  type="text"
                  value={corSecundaria}
                  onChange={(e) => setCorSecundaria(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#1351B4"
                  disabled={!isSuperAdmin}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {CORES_PREDEFINIDAS.slice(5).map((cor) => (
                  <button
                    key={cor.value}
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => setCorSecundaria(cor.value)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                      corSecundaria === cor.value ? "border-foreground ring-2 ring-offset-2" : "border-transparent"
                    }`}
                    style={{ backgroundColor: cor.value }}
                    title={cor.label}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-2">Pré-visualização</p>
              <div className="flex items-center gap-2">
                <div 
                  className="h-8 w-8 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: corPrimaria }}
                >
                  A
                </div>
                <div 
                  className="h-8 px-3 rounded flex items-center text-white text-xs"
                  style={{ backgroundColor: corSecundaria }}
                >
                  Menu
                </div>
                <div 
                  className="h-8 px-3 rounded border text-xs flex items-center"
                  style={{ borderColor: corPrimaria, color: corPrimaria }}
                >
                  Botão
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab Tipografia */}
          <TabsContent value="tipografia" className="space-y-4 mt-4">
            <div className="grid gap-2">
              <Label>Fonte do Sistema</Label>
              <Select value={fonte} onValueChange={setFonte}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fonte" />
                </SelectTrigger>
                <SelectContent>
                  {FONTES_DISPONIVEIS.map((f) => (
                    <SelectItem 
                      key={f.value} 
                      value={f.value}
                      style={{ fontFamily: f.value }}
                    >
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A fonte será aplicada em todo o sistema administrativo.
              </p>
            </div>

            {/* Preview da fonte */}
            <div className="mt-4 p-4 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-3">Pré-visualização</p>
              <div style={{ fontFamily: fonte }} className="space-y-2">
                <h3 className="text-lg font-bold">Título de Exemplo</h3>
                <p className="text-sm">
                  Este é um parágrafo de exemplo usando a fonte {fonte}. 
                  Verifique como o texto aparece em diferentes tamanhos.
                </p>
                <p className="text-xs text-muted-foreground">
                  Texto pequeno para legendas e informações secundárias.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={handleResetToDefaults}
            className="sm:mr-auto"
          >
            Restaurar Padrões
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
              <>
                <Spinner className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

