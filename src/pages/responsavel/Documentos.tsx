import { useState, useRef } from "react";
import { Spinner } from "@/components/common/Spinner";
import { cn } from "@/utils/utils";
import ResponsavelLayout from "@/components/responsavel/ResponsavelLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink, Info, Image as ImageIcon, FileIcon, ZoomIn, ZoomOut, RotateCw, Download, Upload } from "lucide-react";
import { PDFPreview } from "@/components/admin/PDFPreview";
import { useMinhasCriancas } from "@/hooks/api/responsavel-hooks";
import { useConfiguracoes } from "@/hooks/api/supabase-hooks";
import {
  useDocumentosCrianca,
  useDocumentosTiposAtivos,
  useUploadDocumento,
  getSignedDocumentUrl,
} from "@/hooks/api/documentos-hooks";
import { PRIORIDADES_FEDERAIS_PADRAO } from "@/constants/prioridades-federais";
import { useCriancaPrioridades, useEnviarComprovantePrioridade } from "@/hooks/api/prioridades-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { downloadFromUrl } from "@/utils/download";

function DocumentosCriancaCard({ criancaId, criancaNome }: { criancaId: string; criancaNome: string }) {
  const { user } = useAuth();
  const { data: publicConfig } = useConfiguracoes();
  const comprovacaoNaInscricao = (publicConfig as any)?.prioridades_comprovacao_na_inscricao ?? true;
  const { data: documentos, isLoading: loadingDocs } = useDocumentosCrianca(criancaId);
  const { data: tiposDocumentos, isLoading: loadingTipos } = useDocumentosTiposAtivos();
  const { data: prioridades, isLoading: loadingPrioridades } = useCriancaPrioridades(criancaId);
  const enviarComprovantePrioridade = useEnviarComprovantePrioridade();
  const uploadMutation = useUploadDocumento();
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const [uploadingPrioridadeId, setUploadingPrioridadeId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const prioridadeInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    url?: string;
    nome?: string;
    tipo?: string;
    isLoading?: boolean;
  }>({ open: false });
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const isImageFile = (url: string, nome?: string | null) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const lowerUrl = url.toLowerCase();
    const lowerNome = (nome || '').toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext) || lowerNome.endsWith(ext));
  };

  const isPdfFile = (url: string, nome?: string | null) => {
    const lowerUrl = url.toLowerCase();
    const lowerNome = (nome || '').toLowerCase();
    return lowerUrl.includes('.pdf') || lowerNome.endsWith('.pdf');
  };

  const handlePreview = async (doc: any) => {
    setZoom(100);
    setRotation(0);
    setPreviewDialog({
      open: true,
      url: undefined,
      nome: doc.arquivo_nome,
      tipo: isImageFile(doc.arquivo_url, doc.arquivo_nome) ? 'image' : 
            isPdfFile(doc.arquivo_url, doc.arquivo_nome) ? 'pdf' : 'other',
      isLoading: true,
    });

    const signedUrl = await getSignedDocumentUrl(doc.arquivo_url);
    if (signedUrl) {
      setPreviewDialog(prev => ({ ...prev, url: signedUrl, isLoading: false }));
    } else {
      toast.error("Não foi possível carregar o documento");
      setPreviewDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDownload = async () => {
    if (!previewDialog.url) return;
    setIsDownloading(true);
    try {
      await downloadFromUrl(previewDialog.url, previewDialog.nome || "documento");
      toast.success("Download iniciado");
    } catch (error) {
      toast.error("Erro ao baixar documento");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = async (tipoId: string, file: File | null) => {
    if (!file || !user) return;

    // Validar tipo de arquivo
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WEBP.");
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploadingTipo(tipoId);

    try {
      await uploadMutation.mutateAsync({
        criancaId,
        tipoDocumentoId: tipoId,
        file,
        userId: user.id,
      });
      toast.success("Documento enviado! Aguarde a análise dos gestores.");
    } finally {
      setUploadingTipo(null);
    }
  };

  const handlePrioridadeFileChange = async (prioridadeId: string, file: File | null) => {
    if (!file || !user) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploadingPrioridadeId(prioridadeId);
    try {
      await enviarComprovantePrioridade.mutateAsync({ criancaId, prioridadeId, arquivo: file });
    } finally {
      setUploadingPrioridadeId(null);
    }
  };

  const getDocumentoByTipo = (tipoId: string) => {
    return documentos?.find((d) => d.tipo_documento_id === tipoId);
  };

  // Calcular progresso
  const tiposObrigatorios = tiposDocumentos?.filter((t) => t.obrigatorio) || [];
  const docsAprovados = tiposObrigatorios.filter((tipo) => {
    const doc = getDocumentoByTipo(tipo.id);
    return doc?.status === "aprovado";
  }).length;
  const progressPercent =
    tiposObrigatorios.length > 0
      ? Math.round((docsAprovados / tiposObrigatorios.length) * 100)
      : 0;

  const isLoading = loadingDocs || loadingTipos || loadingPrioridades;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!tiposDocumentos || tiposDocumentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum tipo de documento configurado no sistema.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {criancaNome}
            </CardTitle>
            <CardDescription>
              Gerencie os documentos necessários para matrícula
            </CardDescription>
          </div>
          <Badge variant={progressPercent === 100 ? "default" : "secondary"}>
            {docsAprovados}/{tiposObrigatorios.length} obrigatórios
          </Badge>
        </div>
        {tiposObrigatorios.length > 0 && (
          <div className="pt-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {progressPercent}% completo
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {tiposDocumentos.map((tipo) => {
          const documento = getDocumentoByTipo(tipo.id);
          const isUploading = uploadingTipo === tipo.id;

          return (
            <div
              key={tipo.id}
              className={cn(
                "p-5 border rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border-l-4",
                documento?.status === "aprovado"
                  ? "bg-green-50/30 dark:bg-green-950/10 border-green-500 border-y-border border-r-border"
                  : documento?.status === "recusado"
                  ? "bg-destructive/5 border-destructive border-y-border border-r-border"
                  : documento?.status === "pendente"
                  ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-500 border-y-border border-r-border"
                  : "bg-muted/20 border-muted-foreground/20 border-y-border border-r-border"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{tipo.nome}</span>
                    {tipo.obrigatorio && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-background/50">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  {tipo.descricao && (
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{tipo.descricao}</p>
                  )}
                </div>
                {documento ? (
                  documento.status === "aprovado" ? (
                    <Badge variant="default" className="gap-1.5 bg-green-600 hover:bg-green-600 shadow-sm px-2.5 py-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprovado
                    </Badge>
                  ) : documento.status === "recusado" ? (
                    <Badge variant="destructive" className="gap-1.5 shadow-sm px-2.5 py-0.5">
                      <XCircle className="h-3.5 w-3.5" />
                      Recusado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-sm px-2.5 py-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      Em análise
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="gap-1.5 text-muted-foreground border-muted-foreground/30 px-2.5 py-0.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Pendente
                  </Badge>
                )}
              </div>

              {documento?.status === "recusado" && documento.motivo_recusa && (
                <div className="mb-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive text-sm flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block mb-0.5">Motivo da recusa:</strong>
                    {documento.motivo_recusa}
                  </div>
                </div>
              )}

              {documento?.status === "aprovado" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/20 rounded-lg border border-green-200/50 dark:border-green-800/30 shadow-inner">
                    <div className="flex items-center gap-3 text-sm text-green-700 dark:text-green-400">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/40 rounded-md">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="truncate max-w-[250px] font-medium">{documento.arquivo_nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreview(documento)}
                        className="h-9 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Visualizar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[tipo.id]?.click()}
                        disabled={isUploading}
                        className="h-9 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        {isUploading ? (
                          <Spinner className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCw className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1.5">Atualizar</span>
                      </Button>
                    </div>
                  </div>
                  
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    ref={(el) => (fileInputRefs.current[tipo.id] = el)}
                    onChange={(e) =>
                      handleFileChange(tipo.id, e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </div>
              ) : documento?.status === "pendente" ? (
                <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30 shadow-inner">
                  <div className="flex items-center gap-3 text-sm text-amber-700 dark:text-amber-400">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-md">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="truncate max-w-[250px] font-medium">{documento.arquivo_nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePreview(documento)}
                      className="h-9 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.current[tipo.id]?.click()}
                      disabled={isUploading}
                      className="h-9 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                      {isUploading ? (
                        <Spinner className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Novo envio
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    ref={(el) => (fileInputRefs.current[tipo.id] = el)}
                    onChange={(e) =>
                      handleFileChange(tipo.id, e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-1">
                    <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 opacity-50" />
                      {documento?.status === "recusado" ? "Documento recusado. Por favor, envie um novo." : "Nenhum arquivo enviado"}
                    </p>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => fileInputRefs.current[tipo.id]?.click()}
                      disabled={isUploading}
                      className="gap-2 h-10 px-6 shadow-sm"
                    >
                      {isUploading ? (
                        <Spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Enviar Documento
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    ref={(el) => (fileInputRefs.current[tipo.id] = el)}
                    onChange={(e) =>
                      handleFileChange(tipo.id, e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </div>
              )}
            </div>
          );
        })}

        {!comprovacaoNaInscricao &&
          (prioridades || []).some((p: any) => p?.prioridade?.exige_documento) && (
            <div className="pt-4 mt-2 border-t space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Comprovação de prioridades</p>
                  <p className="text-xs text-muted-foreground">
                    Envie os comprovantes de prioridade para análise. Quando a comprovação é feita na convocação, ela pode ser necessária para efetivar a matrícula.
                  </p>
                </div>
                <Badge className="text-[10px] px-2 py-0.5 bg-amber-500 text-white hover:bg-amber-500">
                  Convocação
                </Badge>
              </div>

              <div className="space-y-3">
                {(prioridades || [])
                  .filter((p: any) => p?.prioridade?.exige_documento)
                  .map((p: any) => {
                    const lei =
                      PRIORIDADES_FEDERAIS_PADRAO.find((s) => s.codigo === p?.prioridade?.codigo)?.lei || "Lei federal";
                    const isUploading = uploadingPrioridadeId === p.prioridade_id;
                    const status = p.status as string;
                    const podeEnviar = status !== "aprovado";

                    return (
                      <div key={p.prioridade_id} className="p-4 border rounded-xl bg-muted/20">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm">{p?.prioridade?.nome}</span>
                              <Badge className="text-[10px] px-2 py-0.5 bg-blue-600 text-white hover:bg-blue-600">
                                {lei}
                              </Badge>
                            </div>
                            {status === "recusado" && p.motivo_recusa && (
                              <p className="text-xs text-destructive">
                                Motivo da recusa: <span className="font-medium">{p.motivo_recusa}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {status === "aprovado" ? (
                              <Badge className="gap-1.5 bg-green-600 text-white hover:bg-green-600 px-2.5 py-0.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Aprovado
                              </Badge>
                            ) : status === "recusado" ? (
                              <Badge variant="destructive" className="gap-1.5 px-2.5 py-0.5">
                                <XCircle className="h-3.5 w-3.5" />
                                Recusado
                              </Badge>
                            ) : (
                              <Badge className="gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 px-2.5 py-0.5">
                                <Clock className="h-3.5 w-3.5" />
                                Em análise
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-3">
                          <div className="text-xs text-muted-foreground truncate">
                            {p.documento_comprovante_url ? "Comprovante enviado" : "Nenhum comprovante enviado"}
                          </div>
                          <div className="flex items-center gap-2">
                            {p.documento_comprovante_url && (
                              <Button asChild size="sm" variant="secondary" className="h-9">
                                <a href={p.documento_comprovante_url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                  Visualizar
                                </a>
                              </Button>
                            )}

                            {podeEnviar && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => prioridadeInputRefs.current[p.prioridade_id]?.click()}
                                  disabled={isUploading}
                                  className="gap-2 h-9 px-5"
                                >
                                  {isUploading ? (
                                    <Spinner className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                  Enviar
                                </Button>
                                <Input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                                  ref={(el) => (prioridadeInputRefs.current[p.prioridade_id] = el)}
                                  onChange={(e) =>
                                    handlePrioridadeFileChange(p.prioridade_id, e.target.files?.[0] || null)
                                  }
                                  className="hidden"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Formatos aceitos: PDF, JPG, PNG, WEBP (máx. 10MB)
        </p>
      </CardContent>

      {/* Dialog de Preview */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ ...previewDialog, open })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDialog.tipo === 'image' ? (
                <ImageIcon className="h-5 w-5" />
              ) : previewDialog.tipo === 'pdf' ? (
                <FileIcon className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              {previewDialog.nome}
            </DialogTitle>
            <DialogDescription>
              Visualização do documento
            </DialogDescription>
          </DialogHeader>
          
          {/* Toolbar para imagens e PDFs */}
          {(previewDialog.tipo === 'image' || previewDialog.tipo === 'pdf') && !previewDialog.isLoading && previewDialog.url && (
            <div className="flex items-center justify-center gap-2 py-2 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                disabled={zoom <= 25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[60px] text-center">{zoom}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-2" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation((rotation + 90) % 360)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-2" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!previewDialog.url || isDownloading}
              >
                {isDownloading ? (
                  <Spinner className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Baixar
              </Button>
            </div>
          )}
          
          <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4 min-h-[400px]">
            {previewDialog.isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Spinner className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando documento...</p>
                </div>
              </div>
            )}
            {!previewDialog.isLoading && previewDialog.tipo === 'image' && previewDialog.url && (
              <div className="flex items-center justify-center h-full">
                <img
                  src={previewDialog.url}
                  alt={previewDialog.nome}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
            {!previewDialog.isLoading && previewDialog.tipo === 'pdf' && previewDialog.url && (
              <PDFPreview 
                url={previewDialog.url} 
                zoom={zoom}
                rotation={rotation}
                className="h-full w-full"
              />
            )}
            {!previewDialog.isLoading && previewDialog.tipo === 'other' && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <FileText className="h-16 w-16 opacity-50" />
                <p>Visualização não disponível para este tipo de arquivo</p>
                <Button onClick={handleDownload} disabled={!previewDialog.url || isDownloading}>
                  {isDownloading ? (
                    <Spinner className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Baixar
                </Button>
              </div>
            )}
            {!previewDialog.isLoading && !previewDialog.url && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <AlertCircle className="h-16 w-16 opacity-50 text-destructive" />
                <p>Não foi possível carregar o documento</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function ResponsavelDocumentos() {
  const { data: criancas, isLoading } = useMinhasCriancas();

  if (isLoading) {
    return (
      <ResponsavelLayout>
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ResponsavelLayout>
    );
  }

  if (!criancas || criancas.length === 0) {
    return (
      <ResponsavelLayout>
        <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Documentos</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Gerencie os documentos de seus filhos
            </p>
          </div>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Você ainda não possui crianças cadastradas.
            </CardContent>
          </Card>
        </div>
      </ResponsavelLayout>
    );
  }

  return (
    <ResponsavelLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Documentos</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Envie e acompanhe os documentos para matrícula
          </p>
        </div>

        {/* Informações */}
        <Card className="border-muted bg-muted/30">
          <CardContent className="py-3 md:py-4 px-4 md:px-6">
            <div className="flex items-start gap-2 md:gap-3">
              <Info className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-sm md:text-base">Validação manual</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Após enviar os documentos, eles serão analisados pela equipe gestora.
                  Você será notificado quando houver atualizações.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs por criança */}
        {criancas.length === 1 ? (
          <DocumentosCriancaCard
            criancaId={criancas[0].id}
            criancaNome={criancas[0].nome}
          />
        ) : (
          <Tabs defaultValue={criancas[0].id} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide h-auto flex-wrap md:flex-nowrap gap-1 p-1">
              {criancas.map((crianca) => (
                <TabsTrigger key={crianca.id} value={crianca.id} className="text-xs md:text-sm whitespace-nowrap">
                  {crianca.nome}
                </TabsTrigger>
              ))}
            </TabsList>
            {criancas.map((crianca) => (
              <TabsContent key={crianca.id} value={crianca.id}>
                <DocumentosCriancaCard
                  criancaId={crianca.id}
                  criancaNome={crianca.nome}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </ResponsavelLayout>
  );
}
