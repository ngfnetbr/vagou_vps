import { useState, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useConfiguracoesSistema, useUpdateConfiguracoes } from "@/hooks/api/configuracoes-hooks";
import { Mail, User } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { maskPhone } from "@/utils/masks";

interface SuporteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuporteConfigDialog({ open, onOpenChange }: SuporteConfigDialogProps) {
  const { data: config } = useConfiguracoesSistema();
  const updateConfig = useUpdateConfiguracoes();

  const [form, setForm] = useState({
    suporte_email: "",
    suporte_telefone: "",
    suporte_dev_nome: "",
    suporte_dev_email: "",
    suporte_dev_telefone: "",
  });

  useEffect(() => {
    if (config && open) {
      setForm({
        suporte_email: config.suporte_email || "",
        suporte_telefone: config.suporte_telefone ? maskPhone(config.suporte_telefone) : "",
        suporte_dev_nome: config.suporte_dev_nome || "Suporte Técnico",
        suporte_dev_email: config.suporte_dev_email || "",
        suporte_dev_telefone: config.suporte_dev_telefone ? maskPhone(config.suporte_dev_telefone) : "",
      });
    }
  }, [config, open]);

  const handlePhoneChange = (field: "suporte_telefone" | "suporte_dev_telefone", value: string) => {
    setForm({ ...form, [field]: maskPhone(value) });
  };

  const handleSave = () => {
    // Remove máscara antes de salvar
    const dataToSave = {
      ...form,
      suporte_telefone: form.suporte_telefone.replace(/\D/g, "") || null,
      suporte_dev_telefone: form.suporte_dev_telefone.replace(/\D/g, "") || null,
    };
    updateConfig.mutate(dataToSave, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar Contatos de Suporte</DialogTitle>
          <DialogDescription>
            Configure os contatos exibidos na Central de Ajuda para usuários e para o desenvolvedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Suporte Interno (para usuários) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <WhatsAppIcon className="h-5 w-5 fill-primary" />
              <h3 className="font-semibold">Suporte para Usuários</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Contatos exibidos para Gestores, Admins e Diretores entrarem em contato com você (Super Admin).
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suporte_email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  E-mail de Suporte
                </Label>
                <Input
                  id="suporte_email"
                  type="email"
                  placeholder="suporte@municipio.gov.br"
                  value={form.suporte_email}
                  onChange={(e) => setForm({ ...form, suporte_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suporte_telefone">
                  <WhatsAppIcon className="h-4 w-4 inline mr-2 fill-primary" />
                  WhatsApp de Suporte
                </Label>
                <Input
                  id="suporte_telefone"
                  placeholder="(00) 00000-0000"
                  value={form.suporte_telefone}
                  onChange={(e) => handlePhoneChange("suporte_telefone", e.target.value)}
                  maxLength={15}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Suporte do Desenvolvedor (para Super Admin) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold">Suporte do Desenvolvedor</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Contatos que serão exibidos para você (Super Admin) na Central de Ajuda.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="suporte_dev_nome">Nome do Suporte</Label>
                <Input
                  id="suporte_dev_nome"
                  placeholder="Ex: Lovable Suporte"
                  value={form.suporte_dev_nome}
                  onChange={(e) => setForm({ ...form, suporte_dev_nome: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suporte_dev_email">
                    <Mail className="h-4 w-4 inline mr-2" />
                    E-mail do Dev
                  </Label>
                  <Input
                    id="suporte_dev_email"
                    type="email"
                    placeholder="dev@empresa.com"
                    value={form.suporte_dev_email}
                    onChange={(e) => setForm({ ...form, suporte_dev_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suporte_dev_telefone">
                    <WhatsAppIcon className="h-4 w-4 inline mr-2 fill-primary" />
                    WhatsApp do Dev
                  </Label>
                  <Input
                    id="suporte_dev_telefone"
                    placeholder="(00) 00000-0000"
                    value={form.suporte_dev_telefone}
                    onChange={(e) => handlePhoneChange("suporte_dev_telefone", e.target.value)}
                    maxLength={15}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending && <Spinner className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




