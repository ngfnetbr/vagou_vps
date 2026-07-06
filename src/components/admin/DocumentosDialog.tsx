import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import { cn } from "@/utils/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
import { FileText, Upload, CheckCircle2, XCircle, Clock, AlertCircle, RotateCw, Eye, ZoomIn, ZoomOut, RotateCcw, RefreshCw, Download } from "lucide-react";
import {
  useDocumentosCrianca,
  useDocumentosTiposAtivos,
  useUploadDocumentoWithProgress,
  useAprovarDocumento,
  useRecusarDocumento,
  getSignedDocumentUrl,
  type DocumentoCrianca,
  type DocumentoTipo,
} from "@/hooks/api/documentos-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useConfiguracoesSistema } from "@/hooks/api/configuracoes-hooks";
import { useCriancaPrioridades } from "@/hooks/api/prioridades-hooks";
import { PDFPreview } from "@/components/admin/PDFPreview";
import { downloadFromUrl } from "@/utils/download";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

interface DocumentosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId: string;
  criancaNome: string;
  readOnly?: boolean;
  modoFilaEspera?: boolean;
}

export function DocumentosDialog({
  open,
  onOpenChange,
  criancaId,
  criancaNome,
  readOnly = false,
  modoFilaEspera = false,
}: DocumentosDialogProps) {
  const { user, hasRole, isAdmin } = useAuth();
  const isDiretor = hasRole("diretor_cmei");
  const canModerate = isAdmin() || isDiretor;
  const { data: config } = useConfiguracoesSistema();
  const { data: documentos, isLoading: loadingDocs } = useDocumentosCrianca(criancaId);
  const { data: tiposDocumentos, isLoading: loadingTipos } = useDocumentosTiposAtivos();
  const { data: prioridades } = useCriancaPrioridades(criancaId);
  const { upload, uploadProgress } = useUploadDocumentoWithProgress();
  const aprovarMutation = useAprovarDocumento();
  const recusarMutation = useRecusarDocumento();

  const [recusarDialogOpen, setRecusarDialogOpen] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoCrianca | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [uploadingTipoId, setUploadingTipoId] = useState<string | null>(null);
  const [loadingUrlId, setLoadingUrlId] = useState<string | null>(null);
  const [dragActiveTipoId, setDragActiveTipoId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    url: string | null;
    title: string;
    isPdf: boolean;
    isImage: boolean;
  }>({ open: false, url: null, title: "", isPdf: false, isImage: false });
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDownloadingPreview, setIsDownloadingPreview] = useState(false);
  const panRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });

  useEffect(() => {
    if (!open) {
      setPreviewDialog({ open: false, url: null, title: "", isPdf: false, isImage: false });
    }
  }, [open]);

  const handleDownloadPreview = useCallback(async () => {
    if (!previewDialog.url) return;
    setIsDownloadingPreview(true);
    try {
      await downloadFromUrl(previewDialog.url, previewDialog.title || "documento");
      toast.success("Download iniciado");
    } catch (error) {
      toast.error("Erro ao baixar documento");
    } finally {
      setIsDownloadingPreview(false);
    }
  }, [previewDialog.url, previewDialog.title]);

  useEffect(() => {
    if (!previewDialog.open) return;
    setPreviewZoom(100);
    setPreviewRotation(0);
    setPreviewPan({ x: 0, y: 0 });
    setIsPanning(false);
    panRef.current = { active: false, pointerId: null, startX: 0, startY: 0, startPanX: 0, startPanY: 0 };
  }, [previewDialog.open, previewDialog.url]);

  const detectFileKind = (documento: DocumentoCrianca) => {
    const url = (documento.arquivo_url || "").toLowerCase();
    const nome = (documento.arquivo_nome || "").toLowerCase();
    const isPdf = url.includes(".pdf") || nome.endsWith(".pdf");
    const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].some(
      (ext) => url.includes(ext) || nome.endsWith(ext),
    );
    return { isPdf, isImage };
  };

  const clampZoom = (next: number) => Math.min(300, Math.max(50, next));

  const handleView = async (documento: DocumentoCrianca) => {
    setLoadingUrlId(documento.id);
    try {
      const url = await getSignedDocumentUrl(documento.arquivo_url);
      if (url) {
        const { isPdf, isImage } = detectFileKind(documento);
        setPreviewDialog({
          open: true,
          url,
          title: documento.arquivo_nome || "Documento",
          isPdf,
          isImage,
        });
      } else {
        toast.error("Não foi possível gerar o link de visualização.");
      }
    } catch (error) {
      console.error("Erro ao abrir documento:", error);
      toast.error("Erro ao abrir o documento.");
    } finally {
      setLoadingUrlId(null);
    }
  };

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, JPG ou PNG.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return false;
    }
    return true;
  };

  const handleFileChange = async (tipoId: string, file: File | null) => {
    if (!file || !user) return;
    if (!validateFile(file)) return;

    setUploadingTipoId(tipoId);
    try {
      await upload({
        criancaId,
        tipoDocumentoId: tipoId,
        file,
        userId: user.id,
      });
    } finally {
      setUploadingTipoId(null);
      if (fileInputRefs.current[tipoId]) {
        fileInputRefs.current[tipoId]!.value = '';
      }
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent, tipoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveTipoId(tipoId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveTipoId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, tipoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveTipoId(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(tipoId, files[0]);
    }
  }, [handleFileChange]);

  const handleAprovar = async (documento: DocumentoCrianca) => {
    if (!user) return;
    await aprovarMutation.mutateAsync({
      id: documento.id,
      criancaId,
      userId: user.id,
    });
  };

  const handleRecusar = (documento: DocumentoCrianca) => {
    setSelectedDocumento(documento);
    setMotivoRecusa("");
    setRecusarDialogOpen(true);
  };

  const handleConfirmRecusar = async () => {
    if (!selectedDocumento || !motivoRecusa.trim()) return;

    await recusarMutation.mutateAsync({
      id: selectedDocumento.id,
      criancaId,
      motivo: motivoRecusa,
    });
    setRecusarDialogOpen(false);
  };

  const getDocumentoByTipo = (tipoId: string) => {
    return documentos?.find((d) => d.tipo_documento_id === tipoId);
  };

  const getStatusBadge = (documento: DocumentoCrianca | undefined) => {
    if (!documento) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Não enviado
        </Badge>
      );
    }

    switch (documento.status) {
      case "aprovado":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Aprovado
          </Badge>
        );
      case "recusado":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Recusado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente de aprovação
          </Badge>
        );
    }
  };

  const isLoading = loadingDocs || loadingTipos;

  const documentosObrigatoriosBase = useMemo(() => {
    const obrigatorios = (tiposDocumentos || []).filter((t) => t.ativo && t.obrigatorio);
    const ids = new Set(obrigatorios.map((t) => t.id));

    const incluirPrioridadeNaInscricao = true;
    if (incluirPrioridadeNaInscricao) {
      (prioridades || [])
        .filter((p) => !!p.prioridade?.ativo && !!p.prioridade?.exige_documento && !!p.prioridade?.documento_tipo_id)
        .forEach((p) => ids.add(p.prioridade!.documento_tipo_id as string));
    }

    return (tiposDocumentos || []).filter((t) => ids.has(t.id));
  }, [prioridades, tiposDocumentos]);

  const documentosObrigatoriosParaFila = useMemo(() => {
    if (!modoFilaEspera) return [];
    return documentosObrigatoriosBase;
  }, [documentosObrigatoriosBase, modoFilaEspera]);

  const tiposDocumentosFiltrados = useMemo(() => {
    if (readOnly) return tiposDocumentos;
    if (modoFilaEspera) return documentosObrigatoriosParaFila;
    if (isDiretor && !isAdmin()) return documentosObrigatoriosBase;

    return tiposDocumentos;
  }, [documentosObrigatoriosBase, documentosObrigatoriosParaFila, isDiretor, isAdmin, modoFilaEspera, readOnly, tiposDocumentos]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos - {criancaNome}
            </DialogTitle>
            <DialogDescription>
              {readOnly
                ? "Visualize os documentos enviados"
                : "Gerencie os documentos necessários para matrícula"}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {modoFilaEspera && !readOnly && (
                  <div className="p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Documentos exigidos ({documentosObrigatoriosParaFila.length})</span>
                      <Badge variant="outline" className="text-[10px]">
                        Fila de Espera
                      </Badge>
                    </div>
                    <ol className="mt-2 space-y-1 list-decimal list-inside text-[11px] text-muted-foreground">
                      {documentosObrigatoriosParaFila.map((t) => (
                        <li key={t.id}>
                          <span className="text-foreground">{t.nome}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {tiposDocumentosFiltrados?.map((tipo) => {
                  const documento = getDocumentoByTipo(tipo.id);
                  const canUploadThis = !documento || documento.status !== "aprovado" || isAdmin();

                  return (
                    <div
                      key={tipo.id}
                      className={cn(
                        "p-4 border rounded-xl transition-all duration-200 shadow-sm border-l-4",
                        documento?.status === "aprovado"
                          ? "bg-green-50/30 dark:bg-green-950/10 border-green-500 border-y-border border-r-border"
                          : documento?.status === "recusado"
                          ? "bg-destructive/5 border-destructive border-y-border border-r-border"
                          : documento?.status === "pendente"
                          ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-500 border-y-border border-r-border"
                          : "bg-muted/20 border-muted-foreground/20 border-y-border border-r-border"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{tipo.nome}</span>
                            {tipo.obrigatorio && (
                              <Badge variant="outline" className="text-[9px] h-4 uppercase tracking-wider font-bold bg-background/50">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                          {tipo.descricao && (
                            <p className="text-[11px] text-muted-foreground leading-tight max-w-[250px]">{tipo.descricao}</p>
                          )}
                        </div>
                        {documento ? (
                          documento.status === "aprovado" ? (
                            <Badge variant="default" className="h-5 gap-1 bg-green-600 hover:bg-green-600 shadow-sm px-1.5 py-0">
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="text-[10px]">Aprovado</span>
                            </Badge>
                          ) : documento.status === "recusado" ? (
                            <Badge variant="destructive" className="h-5 gap-1 shadow-sm px-1.5 py-0">
                              <XCircle className="h-3 w-3" />
                              <span className="text-[10px]">Recusado</span>
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="h-5 gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-sm px-1.5 py-0">
                              <Clock className="h-3 w-3" />
                              <span className="text-[10px]">Pendente de aprovação</span>
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="h-5 gap-1 text-muted-foreground border-muted-foreground/30 px-1.5 py-0">
                            <AlertCircle className="h-3 w-3" />
                            <span className="text-[10px]">Ausente</span>
                          </Badge>
                        )}
                      </div>

                      {documento && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2.5 bg-background/50 dark:bg-background/20 rounded-lg border border-border/50 shadow-inner">
                            <div className="flex items-center gap-2.5 text-xs font-medium min-w-0">
                              <div className={cn(
                                "p-1.5 rounded-md",
                                documento.status === "aprovado" ? "bg-green-100 dark:bg-green-900/40 text-green-600" :
                                documento.status === "recusado" ? "bg-destructive/10 text-destructive" :
                                "bg-amber-100 dark:bg-amber-900/40 text-amber-600"
                              )}>
                                <FileText className="h-3.5 w-3.5" />
                              </div>
                              <span className="truncate">{documento.arquivo_nome || "documento"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleView(documento)}
                                disabled={loadingUrlId === documento.id}
                                className="h-7 px-2.5 text-[10px] font-bold"
                              >
                                {loadingUrlId === documento.id ? (
                                  <Spinner className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Eye className="mr-1 h-3 w-3" />
                                )}
                                Ver
                              </Button>
                              
                              {!readOnly && canModerate && documento.status === "pendente" && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleAprovar(documento)}
                                    disabled={aprovarMutation.isPending}
                                    className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-[10px] font-bold"
                                  >
                                    {aprovarMutation.isPending ? (
                                      <Spinner className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="mr-1 h-3 w-3" />
                                    )}
                                    Aprovar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRecusar(documento)}
                                    disabled={recusarMutation.isPending}
                                    className="h-7 px-2.5 text-[10px] font-bold"
                                  >
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Recusar
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {documento.status === "recusado" && documento.motivo_recusa && (
                            <div className="p-2 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive text-[11px] flex gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <div>
                                <strong className="font-bold uppercase text-[9px]">Motivo da recusa:</strong>
                                <p className="mt-0.5">{documento.motivo_recusa}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!readOnly && (
                        <div className={cn("mt-3 pt-3 border-t border-dashed", documento && "mt-2 pt-2")}>
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-[10px] text-muted-foreground italic">
                              {documento?.status === "aprovado" 
                                ? canModerate ? "Atualizar documento aprovado?" : "Documento aprovado."
                                : !documento 
                                ? "Nenhum arquivo enviado."
                                : "Substituir arquivo atual?"
                              }
                            </p>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRefs.current[tipo.id]?.click()}
                              disabled={uploadProgress.isUploading || !canUploadThis}
                              className="h-7 px-2.5 gap-1.5 shrink-0 text-[10px] font-bold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                            >
                              {uploadingTipoId === tipo.id && uploadProgress.isUploading ? (
                                <Spinner className="h-3 w-3 animate-spin" />
                              ) : documento?.status === "aprovado" ? (
                                <RotateCw className="h-3 w-3" />
                              ) : (
                                <Upload className="h-3 w-3" />
                              )}
                              {documento?.status === "aprovado" ? (canModerate ? "Atualizar" : "Aprovado") : "Enviar Arquivo"}
                            </Button>
                          </div>

                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            ref={(el) => {
                              fileInputRefs.current[tipo.id] = el;
                            }}
                            onChange={(e) =>
                              handleFileChange(tipo.id, e.target.files?.[0] || null)
                            }
                            className="hidden"
                          />
                          
                          {uploadingTipoId === tipo.id && uploadProgress.isUploading && (
                            <div className="mt-2 space-y-1 animate-in fade-in duration-200">
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                                <span className="truncate max-w-[180px]">
                                  {uploadProgress.fileName}
                                </span>
                                <span>{uploadProgress.progress}%</span>
                              </div>
                              <Progress value={uploadProgress.progress} className="h-1" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {(!tiposDocumentosFiltrados || tiposDocumentosFiltrados.length === 0) && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      Nenhum tipo de documento configurado
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewDialog.open}
        onOpenChange={(nextOpen) => setPreviewDialog((prev) => ({ ...prev, open: nextOpen }))}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{previewDialog.title}</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewZoom((z) => {
                      const next = clampZoom(z - 25);
                      if (next <= 100) setPreviewPan({ x: 0, y: 0 });
                      return next;
                    });
                  }}
                  disabled={!previewDialog.url || previewZoom <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-14 text-center tabular-nums">{previewZoom}%</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewZoom((z) => clampZoom(z + 25))}
                  disabled={!previewDialog.url || previewZoom >= 300}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewRotation((r) => (r - 90 + 360) % 360)}
                  disabled={!previewDialog.url}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewRotation((r) => (r + 90) % 360)}
                  disabled={!previewDialog.url}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewZoom(100);
                    setPreviewRotation(0);
                    setPreviewPan({ x: 0, y: 0 });
                  }}
                  disabled={!previewDialog.url}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPreview}
                  disabled={!previewDialog.url || isDownloadingPreview}
                  className="gap-2"
                >
                  {isDownloadingPreview ? (
                    <Spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Baixar
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>Visualização do documento</DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg bg-muted/20 overflow-hidden">
            {previewDialog.url ? (
              previewDialog.isPdf ? (
                <div className="h-[70vh] w-full">
                  <PDFPreview
                    url={previewDialog.url}
                    zoom={previewZoom}
                    rotation={previewRotation}
                    className="h-[70vh] w-full"
                  />
                </div>
              ) : previewDialog.isImage ? (
                <div
                  className="relative h-[70vh] w-full bg-background overflow-hidden select-none"
                  onPointerDown={(e) => {
                    if (previewZoom <= 100) return;
                    setIsPanning(true);
                    panRef.current.active = true;
                    panRef.current.pointerId = e.pointerId;
                    panRef.current.startX = e.clientX;
                    panRef.current.startY = e.clientY;
                    panRef.current.startPanX = previewPan.x;
                    panRef.current.startPanY = previewPan.y;
                    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const st = panRef.current;
                    if (!st.active || st.pointerId !== e.pointerId) return;
                    const dx = e.clientX - st.startX;
                    const dy = e.clientY - st.startY;
                    setPreviewPan({ x: st.startPanX + dx, y: st.startPanY + dy });
                  }}
                  onPointerUp={(e) => {
                    const st = panRef.current;
                    if (st.pointerId === e.pointerId) {
                      st.active = false;
                      st.pointerId = null;
                      setIsPanning(false);
                    }
                  }}
                  onPointerCancel={(e) => {
                    const st = panRef.current;
                    if (st.pointerId === e.pointerId) {
                      st.active = false;
                      st.pointerId = null;
                      setIsPanning(false);
                    }
                  }}
                  style={{
                    cursor: previewZoom > 100 ? (isPanning ? "grabbing" : "grab") : "default",
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={previewDialog.url}
                      alt={previewDialog.title}
                      draggable={false}
                      className="max-h-[70vh] max-w-full object-contain"
                      style={{
                        transform: `translate3d(${previewPan.x}px, ${previewPan.y}px, 0) scale(${previewZoom / 100}) rotate(${previewRotation}deg)`,
                        transformOrigin: "center",
                        willChange: "transform",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
                  Pré-visualização indisponível para este tipo de arquivo.
                </div>
              )
            ) : (
              <div className="h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
                Carregando...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Recusa */}
      <AlertDialog open={recusarDialogOpen} onOpenChange={setRecusarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da recusa. O responsável será notificado e poderá
              enviar um novo documento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motivo">Motivo da recusa *</Label>
            <Textarea
              id="motivo"
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              placeholder="Ex: Documento ilegível, data de validade expirada..."
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRecusar}
              disabled={!motivoRecusa.trim() || recusarMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {recusarMutation.isPending && (
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Recusar Documento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
