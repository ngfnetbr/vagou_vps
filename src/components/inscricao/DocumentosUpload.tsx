import { useMemo, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, X, CheckCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface DocumentoTipo {
  id: string;
  nome: string;
  descricao: string | null;
  obrigatorio: boolean;
  ordem: number;
}

interface DocumentoUpload {
  tipoId: string;
  tipoNome: string;
  arquivo: File | null;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
}

interface DocumentosUploadProps {
  criancaId?: string;
  requiredTipoIds?: string[];
  onDocumentosChange?: (documentos: DocumentoUpload[]) => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const DocumentosUpload = ({ criancaId, requiredTipoIds, onDocumentosChange }: DocumentosUploadProps) => {
  const [documentos, setDocumentos] = useState<DocumentoUpload[]>([]);
  const requiredSet = useMemo(() => new Set<string>(requiredTipoIds || []), [requiredTipoIds]);

  const { data: tiposDocumentos, isLoading } = useQuery({
    queryKey: ["documentos-tipos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_tipos")
        .select("*")
        .eq("ativo", true)
        .order("ordem");

      if (error) throw error;
      return data as DocumentoTipo[];
    },
  });

  const handleFileSelect = (tipoId: string, tipoNome: string, file: File | null) => {
    if (!file) return;

    // Validar tipo de arquivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WEBP.");
      return;
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    const newDocumentos = [...documentos];
    const existingIndex = newDocumentos.findIndex((d) => d.tipoId === tipoId);

    if (existingIndex >= 0) {
      newDocumentos[existingIndex] = {
        ...newDocumentos[existingIndex],
        arquivo: file,
        uploaded: false,
      };
    } else {
      newDocumentos.push({
        tipoId,
        tipoNome,
        arquivo: file,
        uploading: false,
        uploaded: false,
      });
    }

    setDocumentos(newDocumentos);
    onDocumentosChange?.(newDocumentos);
  };

  const handleRemoveFile = (tipoId: string) => {
    const newDocumentos = documentos.filter((d) => d.tipoId !== tipoId);
    setDocumentos(newDocumentos);
    onDocumentosChange?.(newDocumentos);
  };

  const uploadDocumento = async (doc: DocumentoUpload, criancaIdParam: string) => {
    if (!doc.arquivo || doc.uploaded) return;

    const fileExt = doc.arquivo.name.split(".").pop();
    const fileName = `${criancaIdParam}/${doc.tipoId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(fileName, doc.arquivo, { upsert: true });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("documentos")
      .getPublicUrl(fileName);

    // Salvar referência no banco
    const { error: dbError } = await supabase
      .from("documentos_crianca")
      .insert({
        crianca_id: criancaIdParam,
        tipo_documento_id: doc.tipoId,
        arquivo_url: urlData.publicUrl,
        arquivo_nome: doc.arquivo.name,
        status: "pendente",
      });

    if (dbError) {
      throw new Error(`Erro ao salvar referência: ${dbError.message}`);
    }

    return urlData.publicUrl;
  };

  // Função para fazer upload de todos os documentos após criar a inscrição
  const uploadAllDocumentos = async (criancaIdParam: string) => {
    const results = [];
    
    for (const doc of documentos) {
      if (doc.arquivo && !doc.uploaded) {
        try {
          const url = await uploadDocumento(doc, criancaIdParam);
          results.push({ tipoId: doc.tipoId, success: true, url });
        } catch (error: any) {
          results.push({ tipoId: doc.tipoId, success: false, error: error.message });
        }
      }
    }
    
    return results;
  };

  const getDocumentoByTipo = (tipoId: string) => {
    return documentos.find((d) => d.tipoId === tipoId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!tiposDocumentos || tiposDocumentos.length === 0) {
    return null;
  }

  const totalObrigatorios = (tiposDocumentos || []).filter(
    (t) => t.obrigatorio || requiredSet.has(t.id),
  ).length;

  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription>
          <strong>Documentos para matrícula:</strong>{" "}
          {totalObrigatorios > 0 ? `${totalObrigatorios} obrigatório(s). ` : ""}
          Você pode enviar agora (opcional para a inscrição), mas será necessário para efetivar a matrícula quando convocado.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {tiposDocumentos.map((tipo) => {
          const doc = getDocumentoByTipo(tipo.id);
          const obrigatorioPorPrioridade = requiredSet.has(tipo.id) && !tipo.obrigatorio;
          const obrigatorio = tipo.obrigatorio || obrigatorioPorPrioridade;
          
          return (
            <Card key={tipo.id} className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">{tipo.nome}</CardTitle>
                    {obrigatorio && (
                      <Badge variant="secondary" className="text-xs">
                        {obrigatorioPorPrioridade ? "Obrigatório (prioridade)" : "Obrigatório para matrícula"}
                      </Badge>
                    )}
                  </div>
                </div>
                {tipo.descricao && (
                  <CardDescription className="text-xs">{tipo.descricao}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-4">
                {doc?.arquivo ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm truncate flex-1">{doc.arquivo.name}</span>
                    <span className="text-xs text-muted-foreground mr-2">
                      {(doc.arquivo.size / 1024).toFixed(0)} KB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(tipo.id)}
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground italic">
                      Nenhum arquivo selecionado.
                    </p>
                    <Label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors text-sm font-medium">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        Selecionar Arquivo
                      </div>
                      <Input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) =>
                          handleFileSelect(tipo.id, tipo.nome, e.target.files?.[0] || null)
                        }
                      />
                    </Label>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Formatos aceitos: PDF, JPG, PNG, WEBP. Tamanho máximo: 5MB por arquivo.
      </p>
    </div>
  );
};

export { type DocumentoUpload };
