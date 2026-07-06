import { useState } from "react";
import { FileText, Download, ExternalLink, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/utils";

interface ChatMediaPreviewProps {
  tipo: 'imagem' | 'documento' | 'audio' | 'texto';
  url: string | null;
  isOutgoing?: boolean;
}

export function ChatMediaPreview({ tipo, url, isOutgoing }: ChatMediaPreviewProps) {
  const [imageOpen, setImageOpen] = useState(false);

  if (!url) return null;

  // Extrair nome do arquivo da URL
  const nomeArquivo = url.split('/').pop()?.split('?')[0] || 'arquivo';

  if (tipo === 'imagem') {
    return (
      <>
        <div 
          className="relative cursor-pointer group"
          onClick={() => setImageOpen(true)}
        >
          <img
            src={url}
            alt="Imagem"
            className="max-w-[250px] max-h-[200px] rounded-lg object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white" />
          </div>
        </div>

        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <DialogTitle className="sr-only">Visualizar imagem</DialogTitle>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white z-10"
                onClick={() => setImageOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <img
                src={url}
                alt="Imagem ampliada"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir original
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                  >
                    <a href={url} download={nomeArquivo}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (tipo === 'documento') {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg",
          isOutgoing ? "bg-white/10" : "bg-muted"
        )}
      >
        <div className={cn(
          "p-2 rounded-lg",
          isOutgoing ? "bg-white/20" : "bg-primary/10"
        )}>
          <FileText className={cn(
            "h-6 w-6",
            isOutgoing ? "text-white" : "text-primary"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isOutgoing ? "text-white" : "text-foreground"
          )}>
            {nomeArquivo}
          </p>
          <p className={cn(
            "text-xs",
            isOutgoing ? "text-white/70" : "text-muted-foreground"
          )}>
            Documento
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              isOutgoing && "text-white hover:bg-white/20"
            )}
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              isOutgoing && "text-white hover:bg-white/20"
            )}
            asChild
          >
            <a href={url} download={nomeArquivo}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

