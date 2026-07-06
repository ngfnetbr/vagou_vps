import { useEffect, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import SuperAdminLayout from "@/components/superadmin/SuperAdminLayout";
import { AppIconUpload } from "@/components/admin/AppIconUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import {
  useConfiguracoesSistema,
  useUpdateConfiguracoes,
} from "@/hooks/api/configuracoes-hooks";

export default function SuperAdminMunicipio() {
  const { data: config, isLoading } = useConfiguracoesSistema();
  const update = useUpdateConfiguracoes();

  const [form, setForm] = useState({
    nome_municipio: "",
    nome_secretaria: "",
    sistema_nome: "",
    email_contato: "",
    telefone_contato: "",
    logo_empresa_url: "",
    logo_empresa_link: "",
  });

  useEffect(() => {
    if (!config) return;
    setForm({
      nome_municipio: config.nome_municipio || "",
      nome_secretaria: config.nome_secretaria || "",
      sistema_nome: config.sistema_nome || "",
      email_contato: config.email_contato || "",
      telefone_contato: config.telefone_contato || "",
      logo_empresa_url: config.logo_empresa_url || "",
      logo_empresa_link: config.logo_empresa_link || "",
    });
  }, [config]);

  const handleSave = () => update.mutate(form);

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-3xl space-y-6 stagger-in">
        <div>
          <h1 className="text-2xl font-bold">Município</h1>
          <p className="text-muted-foreground">
            Identidade do município e habilitação dos módulos da plataforma.
          </p>
        </div>

        <Card className="card-interactive">

          <CardHeader>
            <CardTitle>Identidade</CardTitle>
            <CardDescription>Dados exibidos em todo o ecossistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Spinner className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="municipio">Município</Label>
                    <Input
                      id="municipio"
                      value={form.nome_municipio}
                      onChange={(e) => setForm((f) => ({ ...f, nome_municipio: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secretaria">Secretaria</Label>
                    <Input
                      id="secretaria"
                      value={form.nome_secretaria}
                      onChange={(e) => setForm((f) => ({ ...f, nome_secretaria: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sistema">Nome do sistema</Label>
                    <Input
                      id="sistema"
                      value={form.sistema_nome}
                      onChange={(e) => setForm((f) => ({ ...f, sistema_nome: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail de contato</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email_contato}
                      onChange={(e) => setForm((f) => ({ ...f, email_contato: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone de contato</Label>
                    <Input
                      id="telefone"
                      value={form.telefone_contato}
                      onChange={(e) => setForm((f) => ({ ...f, telefone_contato: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={update.isPending}>
                    {update.isPending ? (
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo do desenvolvedor</CardTitle>
            <CardDescription>
              Exibido como "Desenvolvido por" na tela de login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Spinner className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <>
                <AppIconUpload
                  label="Logo do desenvolvedor"
                  hint="PNG com fundo transparente recomendado. Máximo 2MB."
                  currentUrl={form.logo_empresa_url}
                  bucket="assets"
                  folder="dev-logo"
                  onUploadSuccess={(url) => setForm((f) => ({ ...f, logo_empresa_url: url }))}
                />
                <div className="space-y-2">
                  <Label htmlFor="logo_link">Link ao clicar no logo</Label>
                  <Input
                    id="logo_link"
                    placeholder="https://..."
                    value={form.logo_empresa_link}
                    onChange={(e) => setForm((f) => ({ ...f, logo_empresa_link: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={update.isPending}>
                    {update.isPending ? (
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>Módulos habilitados</CardTitle>
            <CardDescription>
              Liga/desliga os módulos no município. Quando desabilitado, o acesso fica bloqueado mesmo
              para usuários com permissão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">SAM</p>
                <p className="text-sm text-muted-foreground">Atendimento multidisciplinar.</p>
              </div>
              <Switch
                checked={config?.habilitar_sam ?? true}
                disabled={update.isPending}
                onCheckedChange={(checked) => update.mutate({ habilitar_sam: checked })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">SONDAR</p>
                <p className="text-sm text-muted-foreground">Sondagem da aprendizagem.</p>
              </div>
              <Switch
                checked={config?.habilitar_sondagem ?? true}
                disabled={update.isPending}
                onCheckedChange={(checked) => update.mutate({ habilitar_sondagem: checked })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              VAGOU é o módulo base da plataforma e permanece sempre disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
