import { useState } from "react";
import { useTemplatesMensagens, useDeleteTemplate, TIPOS_TEMPLATE, TemplateMensagem } from "@/hooks/api/templates-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Plus, Trash2, Mail, Smartphone } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { TemplateEditorDialog } from "./TemplateEditorDialog";

export const TemplatesManager = () => {
  const { data: templates, isLoading } = useTemplatesMensagens();
  const deleteMutation = useDeleteTemplate();
  const [editingTemplate, setEditingTemplate] = useState<TemplateMensagem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateMensagem | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const handleEdit = (template: TemplateMensagem) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const handleRequestDelete = (template: TemplateMensagem) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    await deleteMutation.mutateAsync(templateToDelete.id);
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Templates de Mensagens</h3>
          <p className="text-sm text-muted-foreground">
            Configure os textos enviados em cada tipo de notificação
          </p>
        </div>
        <Button onClick={handleNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates?.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')).map((template) => (
          <Card key={template.id}>
            <CardHeader className="py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{template.titulo}</CardTitle>
                  <Badge variant={template.ativo ? "default" : "secondary"}>
                    {template.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline">
                    {TIPOS_TEMPLATE[template.tipo as keyof typeof TIPOS_TEMPLATE] || template.tipo}
                  </Badge>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleRequestDelete(template)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {template.descricao && (
                <CardDescription>{template.descricao}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="py-2">
              <div className="flex gap-4 text-sm text-muted-foreground">
                {template.corpo_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> E-mail
                  </span>
                )}
                {template.corpo_whatsapp && (
                  <span className="flex items-center gap-1">
                    <WhatsAppIcon className="h-3 w-3 fill-current" /> WhatsApp
                  </span>
                )}
                {template.corpo_sms && (
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-3 w-3" /> SMS
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{templateToDelete?.titulo}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TemplateEditorDialog
        template={editingTemplate}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingTemplate(null);
        }}
      />
    </div>
  );
};

export default TemplatesManager;


