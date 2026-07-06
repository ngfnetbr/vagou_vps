import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGate, useCanAccess, PERMISSIONS } from "@/components/admin/PermissionGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Search, CheckCircle2, XCircle, MoreVertical, Clock, AlertCircle, Users, FileCheck, ExternalLink, Filter, Calendar, Image, FileIcon, X, ZoomIn, ZoomOut, RotateCw, Download, ChevronLeft, ChevronRight, GalleryHorizontal } from "lucide-react";
import { PDFPreview } from "@/components/admin/PDFPreview";
import { DocumentThumbnail } from "@/components/admin/DocumentThumbnail";
import { 
  useCriancasComDocumentosPendentes, 
  useDocumentosCrianca, 
  useDocumentosTiposAtivos,
  useAprovarDocumento, 
  useRecusarDocumento,
  getSignedDocumentUrl 
} from "@/hooks/api/documentos-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInMonths, isAfter, isBefore, startOfDay, endOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/page-header";

const ValidacaoDocumentos = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Permission checks
  const canApprove = useCanAccess(PERMISSIONS.DOCUMENTOS_APROVAR);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCrianca, setSelectedCrianca] = useState<any | null>(null);
  const [tipoDocumentoFilter, setTipoDocumentoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodoFilter, setPeriodoFilter] = useState<string>("all");
  const [recusaDialog, setRecusaDialog] = useState<{
    open: boolean;
    documentoId?: string;
    documentoNome?: string;
  }>({ open: false });
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    url?: string;
    nome?: string;
    tipo?: string;
    documentoId?: string;
    documentoNome?: string;
    status?: string;
    isLoading?: boolean;
    currentIndex?: number;
  }>({ open: false });
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: criancas, isLoading } = useCriancasComDocumentosPendentes();
  const { data: documentos, isLoading: isLoadingDocs } = useDocumentosCrianca(selectedCrianca?.id);
  const { data: tiposDocumentos } = useDocumentosTiposAtivos();
  const aprovarMutation = useAprovarDocumento();
  const recusarMutation = useRecusarDocumento();

  const criancasFiltradas = criancas?.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.responsavel_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar documentos
  const documentosFiltrados = documentos?.filter((doc) => {
    // Filtro por tipo de documento
    if (tipoDocumentoFilter !== "all" && doc.tipo_documento_id !== tipoDocumentoFilter) {
      return false;
    }

    // Filtro por status
    if (statusFilter !== "all" && doc.status !== statusFilter) {
      return false;
    }

    // Filtro por período
    if (periodoFilter !== "all" && doc.created_at) {
      const docDate = new Date(doc.created_at);
      const now = new Date();
      
      switch (periodoFilter) {
        case "hoje":
          if (!isAfter(docDate, startOfDay(now)) || !isBefore(docDate, endOfDay(now))) {
            return false;
          }
          break;
        case "7dias":
          if (!isAfter(docDate, subDays(now, 7))) {
            return false;
          }
          break;
        case "30dias":
          if (!isAfter(docDate, subDays(now, 30))) {
            return false;
          }
          break;
      }
    }

    return true;
  });

  const calcularIdade = (dataNascimento: string) => {
    const meses = differenceInMonths(new Date(), new Date(dataNascimento));
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    if (anos === 0) return `${meses} meses`;
    return `${anos}a ${mesesRestantes}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="mr-1 h-3 w-3" />Aprovado</Badge>;
      case "recusado":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Recusado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pendente de aprovação</Badge>;
    }
  };

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

  const handlePreview = async (doc: any, index?: number) => {
    setZoom(100);
    setRotation(0);
    const docIndex = index ?? documentosFiltrados?.findIndex(d => d.id === doc.id) ?? 0;
    setPreviewDialog({
      open: true,
      url: undefined,
      nome: doc.arquivo_nome || doc.tipo_documento?.nome,
      tipo: isImageFile(doc.arquivo_url, doc.arquivo_nome) ? 'image' : 
            isPdfFile(doc.arquivo_url, doc.arquivo_nome) ? 'pdf' : 'other',
      documentoId: doc.id,
      documentoNome: doc.tipo_documento?.nome,
      status: doc.status,
      isLoading: true,
      currentIndex: docIndex,
    });

    // Gerar URL assinada
    const signedUrl = await getSignedDocumentUrl(doc.arquivo_url);
    if (signedUrl) {
      setPreviewDialog(prev => ({ ...prev, url: signedUrl, isLoading: false }));
    } else {
      toast.error("Não foi possível carregar o documento");
      setPreviewDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handlePrevDoc = () => {
    if (!documentosFiltrados || previewDialog.currentIndex === undefined) return;
    const prevIndex = previewDialog.currentIndex > 0 ? previewDialog.currentIndex - 1 : documentosFiltrados.length - 1;
    handlePreview(documentosFiltrados[prevIndex], prevIndex);
  };

  const handleNextDoc = () => {
    if (!documentosFiltrados || previewDialog.currentIndex === undefined) return;
    const nextIndex = previewDialog.currentIndex < documentosFiltrados.length - 1 ? previewDialog.currentIndex + 1 : 0;
    handlePreview(documentosFiltrados[nextIndex], nextIndex);
  };

  const handleDownload = async () => {
    if (!previewDialog.url) return;
    setIsDownloading(true);
    try {
      const response = await fetch(previewDialog.url);
      if (!response.ok) throw new Error('Falha ao baixar');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = previewDialog.nome || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download iniciado");
    } catch (error) {
      toast.error("Erro ao baixar documento");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAprovarFromPreview = async () => {
    if (!previewDialog.documentoId || !selectedCrianca || !user) return;
    try {
      await aprovarMutation.mutateAsync({
        id: previewDialog.documentoId,
        criancaId: selectedCrianca.id,
        userId: user.id,
        documentoNome: previewDialog.documentoNome,
      });
      setPreviewDialog({ open: false });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRecusarFromPreview = () => {
    if (!previewDialog.documentoId) return;
    setRecusaDialog({
      open: true,
      documentoId: previewDialog.documentoId,
      documentoNome: previewDialog.documentoNome,
    });
    setPreviewDialog({ open: false });
  };

  const handleAprovar = async (documentoId: string, documentoNome?: string) => {
    if (!selectedCrianca || !user) return;
    try {
      await aprovarMutation.mutateAsync({
        id: documentoId,
        criancaId: selectedCrianca.id,
        userId: user.id,
        documentoNome,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRecusar = async () => {
    if (!recusaDialog.documentoId || !motivoRecusa.trim() || !selectedCrianca) {
      toast.error("Informe o motivo da recusa");
      return;
    }

    try {
      await recusarMutation.mutateAsync({
        id: recusaDialog.documentoId,
        criancaId: selectedCrianca.id,
        motivo: motivoRecusa,
      });
      setRecusaDialog({ open: false });
      setMotivoRecusa("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Stats
  const totalAguardando = criancas?.length || 0;
  const docsPendentes = documentos?.filter(d => d.status === "pendente").length || 0;

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="rounded-xl border border-border/80 bg-gradient-to-b from-muted/60 to-transparent p-6">
          <PageHeader
            leading={
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileCheck className="h-7 w-7" />
              </div>
            }
            title="Validação de Documentos"
            description="Analise e valide documentos enviados pelos responsáveis"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Crianças com Docs Pendentes</p>
                <p className="text-2xl font-bold">{totalAguardando}</p>
                <p className="text-xs text-muted-foreground">aguardando validação</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Docs para Análise</p>
                <p className="text-2xl font-bold text-amber-600">{docsPendentes}</p>
                <p className="text-xs text-muted-foreground">aguardando validação</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                <FileText className="h-4 w-4 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 bg-purple-50/40 dark:bg-purple-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-purple-700 dark:text-purple-300">Criança Selecionada</p>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300 truncate">
                  {selectedCrianca?.nome || "Nenhuma"}
                </p>
                {selectedCrianca && (
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {documentos?.filter(d => d.status === "aprovado").length || 0} de {documentos?.length || 0} aprovados
                  </p>
                )}
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
                <FileCheck className="h-4 w-4 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Crianças */}
          <Card>
            <CardHeader>
              <CardTitle>Crianças com Documentos Pendentes</CardTitle>
              <CardDescription>
                Selecione uma criança para validar seus documentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : criancasFiltradas?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum documento pendente de validação</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {criancasFiltradas?.map((crianca: any) => (
                    <div
                      key={crianca.id}
                      onClick={() => setSelectedCrianca(crianca)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedCrianca?.id === crianca.id
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{crianca.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {calcularIdade(crianca.data_nascimento)} • {crianca.responsavel_nome}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {crianca.status}
                          </Badge>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          <FileText className="mr-1 h-3 w-3" />
                          {crianca.docs_pendentes} pendente{crianca.docs_pendentes !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documentos da Criança */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedCrianca ? `Documentos de ${selectedCrianca.nome}` : "Documentos"}
              </CardTitle>
              <CardDescription>
                {selectedCrianca 
                  ? "Analise cada documento e aprove ou recuse"
                  : "Selecione uma criança para ver os documentos"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              {selectedCrianca && documentos && documentos.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Filtros:
                  </div>
                  <Select value={tipoDocumentoFilter} onValueChange={setTipoDocumentoFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Tipo de doc" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {tiposDocumentos?.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      <SelectItem value="pendente">Pendente de aprovação</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="recusado">Recusado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo período</SelectItem>
                      <SelectItem value="hoje">Hoje</SelectItem>
                      <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                      <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!selectedCrianca ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Selecione uma criança na lista ao lado</p>
                </div>
              ) : isLoadingDocs ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : documentosFiltrados?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{documentos?.length === 0 ? "Nenhum documento enviado ainda" : "Nenhum documento encontrado com os filtros aplicados"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentosFiltrados?.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-start gap-3">
                        {/* Miniatura do documento */}
                        <DocumentThumbnail
                          arquivoUrl={doc.arquivo_url}
                          arquivoNome={doc.arquivo_nome}
                          onClick={() => handlePreview(doc)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">
                              {doc.tipo_documento?.nome || "Documento"}
                            </p>
                            {doc.tipo_documento?.obrigatorio && (
                              <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {doc.arquivo_nome || "Arquivo"}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(doc.status || "pendente")}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(doc.created_at || new Date()), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {doc.status === "recusado" && doc.motivo_recusa && (
                            <p className="text-sm text-destructive mt-2">
                              Motivo: {doc.motivo_recusa}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(doc)}
                            title="Visualizar documento"
                          >
                            {isImageFile(doc.arquivo_url, doc.arquivo_nome) ? (
                              <Image className="h-4 w-4 mr-1" />
                            ) : isPdfFile(doc.arquivo_url, doc.arquivo_nome) ? (
                              <FileIcon className="h-4 w-4 mr-1" />
                            ) : (
                              <ExternalLink className="h-4 w-4 mr-1" />
                            )}
                            Ver
                          </Button>
                          {doc.status === "pendente" && canApprove && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleAprovar(doc.id, doc.tipo_documento?.nome)}
                                  className="text-green-600"
                                  disabled={aprovarMutation.isPending}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Aprovar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setRecusaDialog({
                                    open: true,
                                    documentoId: doc.id,
                                    documentoNome: doc.tipo_documento?.nome,
                                  })}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Recusar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Preview com Galeria */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ ...previewDialog, open })}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <GalleryHorizontal className="h-5 w-5" />
              {previewDialog.nome}
              {documentosFiltrados && documentosFiltrados.length > 1 && (
                <Badge variant="outline" className="ml-2">
                  {(previewDialog.currentIndex ?? 0) + 1} / {documentosFiltrados.length}
                </Badge>
              )}
              {previewDialog.status === 'pendente' && (
                <Badge variant="secondary" className="ml-2">
                  <Clock className="mr-1 h-3 w-3" />
                  Pendente de aprovação
                </Badge>
              )}
              {previewDialog.status === 'aprovado' && (
                <Badge className="bg-green-100 text-green-800 ml-2">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Aprovado
                </Badge>
              )}
              {previewDialog.status === 'recusado' && (
                <Badge variant="destructive" className="ml-2">
                  <XCircle className="mr-1 h-3 w-3" />
                  Recusado
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Use as setas para navegar entre os documentos
            </DialogDescription>
          </DialogHeader>
          
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 py-2 px-4 border-b">
            {/* Controles de zoom/rotação para imagens e PDFs */}
            <div className="flex items-center gap-2">
              {(previewDialog.tipo === 'image' || previewDialog.tipo === 'pdf') && (
                <>
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
                  <div className="w-px h-6 bg-border mx-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((rotation + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-border mx-1" />
                </>
              )}
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

            {/* Botões de Aprovar/Recusar */}
            {previewDialog.status === 'pendente' && canApprove && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                  onClick={handleAprovarFromPreview}
                  disabled={aprovarMutation.isPending}
                >
                  {aprovarMutation.isPending ? (
                    <Spinner className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                  )}
                  Aprovar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleRecusarFromPreview}
                  disabled={recusarMutation.isPending}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Recusar
                </Button>
              </div>
            )}
          </div>
          
          {/* Área de visualização com navegação por setas */}
          <div className="flex-1 overflow-hidden bg-muted/30 min-h-[400px] relative flex items-center">
            {/* Botão anterior */}
            {documentosFiltrados && documentosFiltrados.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background shadow-lg"
                onClick={handlePrevDoc}
                disabled={previewDialog.isLoading}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {/* Conteúdo do preview */}
            <div className="flex-1 h-full overflow-auto p-4">
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
                    <Download className="h-4 w-4 mr-2" />
                    Baixar documento
                  </Button>
                </div>
              )}
              {!previewDialog.isLoading && !previewDialog.url && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <AlertCircle className="h-16 w-16 opacity-50 text-destructive" />
                  <p>Não foi possível carregar o documento</p>
                  <p className="text-sm">Verifique se o arquivo existe no storage</p>
                </div>
              )}
            </div>

            {/* Botão próximo */}
            {documentosFiltrados && documentosFiltrados.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background shadow-lg"
                onClick={handleNextDoc}
                disabled={previewDialog.isLoading}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Miniaturas na parte inferior */}
          {documentosFiltrados && documentosFiltrados.length > 1 && (
            <div className="border-t p-3 bg-muted/20">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {documentosFiltrados.map((doc, index) => (
                  <button
                    key={doc.id}
                    onClick={() => handlePreview(doc, index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-all ${
                      previewDialog.currentIndex === index 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <DocumentThumbnail
                      arquivoUrl={doc.arquivo_url}
                      arquivoNome={doc.arquivo_nome}
                      size="sm"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Recusa */}
      <Dialog open={recusaDialog.open} onOpenChange={(open) => setRecusaDialog({ ...recusaDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Documento</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa do documento "{recusaDialog.documentoNome}".
              O responsável será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Recusa *</Label>
              <Textarea
                id="motivo"
                placeholder="Ex: Documento ilegível, data vencida, etc."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecusaDialog({ open: false })}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRecusar}
              disabled={recusarMutation.isPending || !motivoRecusa.trim()}
            >
              {recusarMutation.isPending && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
              Recusar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ValidacaoDocumentos;

