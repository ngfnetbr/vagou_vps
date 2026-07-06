import { useState, useEffect } from "react";
import { useUpdateTemplate, useCreateTemplate, TIPOS_TEMPLATE, VARIAVEIS_GLOBAIS, TemplateMensagem } from "@/hooks/api/templates-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Mail, Smartphone, Variable } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { toast } from "sonner";
import DOMPurify from "dompurify";

interface TemplateEditorProps {
  template?: TemplateMensagem | null;
  onClose: () => void;
  isOpen: boolean;
  defaultTab?: string;
}

export const TemplateEditorDialog = ({ template, onClose, isOpen, defaultTab = "email", initialType }: TemplateEditorProps & { initialType?: string }) => {
  const updateMutation = useUpdateTemplate();
  const createMutation = useCreateTemplate();
  
  const [formData, setFormData] = useState({
    tipo: "",
    titulo: "",
    descricao: "",
    assunto_email: "",
    corpo_email: "",
    corpo_sms: "",
    corpo_whatsapp: "",
    ativo: true,
  });

  // Sincronizar formData quando o template mudar ou dialog abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        tipo: template?.tipo || initialType || "",
        titulo: template?.titulo || "",
        descricao: template?.descricao || "",
        assunto_email: template?.assunto_email || "",
        corpo_email: template?.corpo_email || "",
        corpo_sms: template?.corpo_sms || "",
        corpo_whatsapp: template?.corpo_whatsapp || "",
        ativo: template?.ativo ?? true,
      });
    }
  }, [template, isOpen]);

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [previewData, setPreviewData] = useState({
    crianca_nome: "Maria Silva",
    responsavel_nome: "João Silva",
    cmei_nome: "Unidade Exemplo",
    turma_nome: "Infantil 2",
    posicao_fila: "15",
    data_limite: "15/01/2025",
    prazo_dias: "7",
    dias_restantes: "3",
  });

  const insertVariable = (variavel: string, field: "corpo_email" | "corpo_sms" | "corpo_whatsapp" | "assunto_email") => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] + `{{${variavel}}}`,
    }));
  };

  const processPreview = (text: string) => {
    let result = text;
    Object.entries(previewData).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    });
    return result;
  };

  const handleSave = async () => {
    if (!formData.tipo || !formData.titulo) {
      toast.error("Preencha o tipo e título do template");
      return;
    }

    try {
      if (template?.id) {
        await updateMutation.mutateAsync({ id: template.id, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = updateMutation.isPending || createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{template ? "Editar Template" : "Novo Template"}</DialogTitle>
          <DialogDescription>
            Configure o conteúdo das mensagens para cada canal de notificação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 p-1">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_TEMPLATE).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={formData.titulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Título do template"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Breve descrição de quando este template é usado"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, ativo: v }))}
                />
                <Label>Template ativo</Label>
              </div>

              {/* Variáveis disponíveis */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Variable className="h-4 w-4" />
                    Variáveis Disponíveis
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {VARIAVEIS_GLOBAIS.map((v) => (
                      <Badge
                        key={v.chave}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => {
                          const field = activeTab === "email" ? "corpo_email" : activeTab === "sms" ? "corpo_sms" : "corpo_whatsapp";
                          insertVariable(v.chave, field);
                        }}
                        title={v.descricao}
                      >
                        {`{{${v.chave}}}`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tabs de canais */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> E-mail
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                    <WhatsAppIcon className="h-4 w-4 fill-current" /> WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" /> SMS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assunto do E-mail</Label>
                    <Input
                      value={formData.assunto_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, assunto_email: e.target.value }))}
                      placeholder="Assunto do e-mail"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Corpo do E-mail (HTML)</Label>
                      <Textarea
                        value={formData.corpo_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, corpo_email: e.target.value }))}
                        placeholder="<h2>Olá, {{responsavel_nome}}!</h2>..."
                        className="h-48 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Preview
                      </Label>
                      <div 
                        className="h-48 p-3 border rounded-md overflow-auto bg-white text-sm"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processPreview(formData.corpo_email)) }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="whatsapp" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mensagem (WhatsApp)</Label>
                      <Textarea
                        value={formData.corpo_whatsapp}
                        onChange={(e) => setFormData(prev => ({ ...prev, corpo_whatsapp: e.target.value }))}
                        placeholder="✅ *Olá, {{responsavel_nome}}!*..."
                        className="h-48"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Preview
                      </Label>
                      <div className="h-48 p-3 border rounded-md overflow-auto bg-whatsapp-bg text-sm whitespace-pre-wrap">
                        <div className="bg-whatsapp-bubble p-2 rounded-lg max-w-[80%] ml-auto">
                          {processPreview(formData.corpo_whatsapp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sms" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mensagem SMS (máx. 160 caracteres)</Label>
                      <Textarea
                        value={formData.corpo_sms}
                        onChange={(e) => setFormData(prev => ({ ...prev, corpo_sms: e.target.value }))}
                        placeholder="Olá {{responsavel_nome}}, {{crianca_nome}} foi convocada..."
                        className="h-32"
                        maxLength={160}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.corpo_sms.length}/160 caracteres
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Preview
                      </Label>
                      <div className="h-32 p-3 border rounded-md overflow-auto bg-muted text-sm">
                        {processPreview(formData.corpo_sms)}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


