import { useMemo, useState, useRef } from "react";
import { Spinner } from "@/components/common/Spinner";
import { cn } from "@/utils/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, CheckCircle2, XCircle, Clock, AlertCircle, RotateCw } from "lucide-react";
import {
  useDocumentosCrianca,
  useDocumentosTiposAtivos,
  useUploadDocumento,
  getSignedDocumentUrl,
} from "@/hooks/api/documentos-hooks";
import { useCriancaPrioridades } from "@/hooks/api/prioridades-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { downloadFromUrl } from "@/utils/download";

interface DocumentosPendentesCardProps {
  criancaId: string;
  criancaNome: string;
}

export function DocumentosPendentesCard({
  criancaId,
  criancaNome,
}: DocumentosPendentesCardProps) {
  const { user } = useAuth();
  const { data: documentos, isLoading: loadingDocs } = useDocumentosCrianca(criancaId);
  const { data: tiposDocumentos, isLoading: loadingTipos } = useDocumentosTiposAtivos();
  const { data: prioridades, isLoading: loadingPrioridades } = useCriancaPrioridades(criancaId);
  const [loadingUrlId, setLoadingUrlId] = useState<string | null>(null);
  const uploadMutation = useUploadDocumento();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleViewDoc = async (arquivoUrl: string, docId: string, filename?: string | null) => {
    setLoadingUrlId(docId);
    try {
      const url = await getSignedDocumentUrl(arquivoUrl);
      if (url) {
        await downloadFromUrl(url, filename || "documento");
        toast.success("Download iniciado");
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

  const handleFileChange = async (tipoId: string, file: File | null) => {
    if (!file || !user) return;

    await uploadMutation.mutateAsync({
      criancaId,
      tipoDocumentoId: tipoId,
      file,
      userId: user.id,
    });
  };

  const getDocumentoByTipo = (tipoId: string) => {
    return documentos?.find((d) => d.tipo_documento_id === tipoId);
  };

  const prioridadeDocPorTipoId = useMemo(() => {
    const map = new Map<
      string,
      { status: "pendente" | "aprovado" | "recusado"; url: string | null; motivo_recusa: string | null }
    >();

    (prioridades || [])
      .filter((p: any) => !!p?.prioridade?.exige_documento && !!p?.prioridade?.ativo && !!p?.prioridade?.documento_tipo_id)
      .forEach((p: any) => {
        const tipoId = p.prioridade.documento_tipo_id as string;
        const current = map.get(tipoId);
        const url = (p.documento_comprovante_url as string | null) ?? null;
        const rawStatus = p.status as "pendente" | "aprovado" | "recusado";
        const status = rawStatus === "aprovado" && !url ? "pendente" : rawStatus;
        const motivo = (p.motivo_recusa as string | null) ?? null;

        if (!current) {
          map.set(tipoId, { status, url, motivo_recusa: motivo });
          return;
        }

        const currentRank = current.status === "aprovado" ? 3 : current.status === "recusado" ? 2 : 1;
        const newRank = status === "aprovado" ? 3 : status === "recusado" ? 2 : 1;
        if (newRank > currentRank) {
          map.set(tipoId, { status, url, motivo_recusa: motivo });
        } else if (newRank === currentRank && !current.url && url) {
          map.set(tipoId, { ...current, url });
        }
      });

    return map;
  }, [prioridades]);

  const obrigatoriosPorTipoId = useMemo(() => {
    const set = new Set<string>((tiposDocumentos || []).filter((t) => t.obrigatorio).map((t) => t.id));
    prioridadeDocPorTipoId.forEach((_v, tipoId) => set.add(tipoId));
    return set;
  }, [tiposDocumentos, prioridadeDocPorTipoId]);

  const tiposObrigatorios = useMemo(() => {
    const byId = new Map((tiposDocumentos || []).map((t) => [t.id, t] as const));
    return [...obrigatoriosPorTipoId].map((id) => byId.get(id)).filter(Boolean) as any[];
  }, [tiposDocumentos, obrigatoriosPorTipoId]);

  const getDocumentoOuPrioridade = (tipoId: string) => {
    const doc = getDocumentoByTipo(tipoId);
    if (doc) return doc;
    const prio = prioridadeDocPorTipoId.get(tipoId);
    if (!prio) return undefined;
    return {
      id: `prioridade:${tipoId}`,
      tipo_documento_id: tipoId,
      arquivo_url: prio.url,
      arquivo_nome: "Comprovante de prioridade",
      status: prio.status,
      motivo_recusa: prio.motivo_recusa,
    } as any;
  };

  const docsAprovados = tiposObrigatorios.filter((tipo: any) => {
    const doc = getDocumentoOuPrioridade(tipo.id);
    return doc?.status === "aprovado" && !!doc?.arquivo_url;
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
    return null;
  }

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documentos Pendentes
            </CardTitle>
            <CardDescription>
              Envie os documentos necessários para {criancaNome}
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
          const documento = getDocumentoOuPrioridade(tipo.id);
          const isObrigatorio = obrigatoriosPorTipoId.has(tipo.id);

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
                    {isObrigatorio && (
                      <Badge variant="outline" className="text-[9px] h-4 uppercase tracking-wider font-bold bg-background/50">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  {tipo.descricao && (
                    <p className="text-[11px] text-muted-foreground leading-tight max-w-[200px]">{tipo.descricao}</p>
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
                      <span className="text-[10px]">Em análise</span>
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="h-5 gap-1 text-muted-foreground border-muted-foreground/30 px-1.5 py-0">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-[10px]">Pendente</span>
                  </Badge>
                )}
              </div>

              {documento?.status === "recusado" && documento.motivo_recusa && (
                <div className="mb-3 p-2 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive text-[11px] flex gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Recusado:</strong> {documento.motivo_recusa}
                  </div>
                </div>
              )}

              {documento?.status === "aprovado" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-background/50 dark:bg-background/20 rounded-lg border border-green-200/50 dark:border-green-800/30 shadow-inner">
                    <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 min-w-0">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-medium">{documento.arquivo_nome}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDoc(documento.arquivo_url, documento.id, documento.arquivo_nome)}
                        className="h-7 px-2 text-green-700 hover:text-green-800 hover:bg-green-200/50 dark:text-green-400 dark:hover:bg-green-800/40 text-[10px]"
                      >
                        Baixar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRefs.current[tipo.id]?.click()}
                        disabled={uploadMutation.isPending}
                        className="h-7 px-2 text-green-700 hover:text-green-800 hover:bg-green-200/50 dark:text-green-400 dark:hover:bg-green-800/40 text-[10px]"
                      >
                        {uploadMutation.isPending ? (
                          <Spinner className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCw className="h-3 w-3" />
                        )}
                        <span className="ml-1">Trocar</span>
                      </Button>
                    </div>
                  </div>
                  
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    ref={(el) => (fileInputRefs.current[tipo.id] = el)}
                    onChange={(e) =>
                      handleFileChange(tipo.id, e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </div>
              ) : documento?.status === "pendente" ? (
                <div className="flex items-center justify-between p-2 bg-background/50 dark:bg-background/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30 shadow-inner">
                  <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 min-w-0">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-medium">{documento.arquivo_nome}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDoc(documento.arquivo_url, documento.id, documento.arquivo_nome)}
                      disabled={loadingUrlId === documento.id}
                      className="h-7 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-200/50 dark:text-amber-400 dark:hover:bg-amber-800/40 text-[10px]"
                    >
                      Baixar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRefs.current[tipo.id]?.click()}
                      disabled={uploadMutation.isPending}
                      className="h-7 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-200/50 dark:text-amber-400 dark:hover:bg-amber-800/40 text-[10px]"
                    >
                      {uploadMutation.isPending ? (
                        <Spinner className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3" />
                      )}
                      Novo
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    ref={(el) => (fileInputRefs.current[tipo.id] = el)}
                    onChange={(e) =>
                      handleFileChange(tipo.id, e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 opacity-50" />
                    Não enviado
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRefs.current[tipo.id]?.click()}
                    disabled={uploadMutation.isPending}
                    className="gap-1.5 h-8 text-[11px] px-3 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                  >
                    {uploadMutation.isPending ? (
                      <Spinner className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Enviar agora
                  </Button>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
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

        <p className="text-xs text-muted-foreground text-center pt-2">
          Formatos aceitos: PDF, JPG, PNG (máx. 10MB)
        </p>
      </CardContent>
    </Card>
  );
}
