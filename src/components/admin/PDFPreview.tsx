import { useState, useEffect, useRef, useMemo } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as pdfjs from "pdfjs-dist";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  url: string;
  zoom?: number;
  rotation?: number;
  className?: string;
}

export const PDFPreview = ({ url, zoom = 100, rotation = 0, className = "" }: PDFPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, startScrollLeft: 0, startScrollTop: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);

  const canDragToPan = useMemo(() => zoom > 100, [zoom]);

  useEffect(() => {
    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Não foi possível carregar o PDF");
      } finally {
        setIsLoading(false);
      }
    };

    if (url) {
      loadPdf();
    }

    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [url]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Calculate scale based on zoom
        const baseScale = 1.5;
        const scale = baseScale * (zoom / 100);
        
        // Handle rotation
        const rotationRadians = (rotation * Math.PI) / 180;
        const viewport = page.getViewport({ scale, rotation });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering page:", err);
        setError("Erro ao renderizar página");
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, zoom, rotation]);

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <Spinner className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        ref={scrollRef}
        className="overflow-auto max-w-full max-h-full flex items-center justify-center select-none"
        onPointerDown={(e) => {
          if (!canDragToPan || !scrollRef.current) return;
          setIsDragging(true);
          dragStateRef.current.active = true;
          dragStateRef.current.pointerId = e.pointerId;
          dragStateRef.current.startX = e.clientX;
          dragStateRef.current.startY = e.clientY;
          dragStateRef.current.startScrollLeft = scrollRef.current.scrollLeft;
          dragStateRef.current.startScrollTop = scrollRef.current.scrollTop;
          scrollRef.current.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!canDragToPan || !scrollRef.current) return;
          const st = dragStateRef.current;
          if (!st.active || st.pointerId !== e.pointerId) return;
          const dx = e.clientX - st.startX;
          const dy = e.clientY - st.startY;
          scrollRef.current.scrollLeft = st.startScrollLeft - dx;
          scrollRef.current.scrollTop = st.startScrollTop - dy;
        }}
        onPointerUp={(e) => {
          if (!scrollRef.current) return;
          const st = dragStateRef.current;
          if (st.pointerId === e.pointerId) {
            st.active = false;
            st.pointerId = null;
            setIsDragging(false);
          }
        }}
        onPointerCancel={(e) => {
          if (!scrollRef.current) return;
          const st = dragStateRef.current;
          if (st.pointerId === e.pointerId) {
            st.active = false;
            st.pointerId = null;
            setIsDragging(false);
          }
        }}
        style={{ cursor: canDragToPan ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        <canvas 
          ref={canvasRef} 
          className="max-w-full"
          style={{ 
            transition: 'transform 0.2s ease',
          }}
        />
      </div>
      
      {numPages > 1 && (
        <div className="flex items-center gap-2 mt-4 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            {currentPage} de {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// Componente para gerar miniatura de PDF
interface PDFThumbnailProps {
  url: string;
  className?: string;
  onClick?: () => void;
}

export const PDFThumbnail = ({ url, className = "", onClick }: PDFThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const generateThumbnail = async () => {
      if (!url || !canvasRef.current) return;
      
      setIsLoading(true);
      setError(false);

      try {
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Small scale for thumbnail
        const viewport = page.getViewport({ scale: 0.3 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        pdf.destroy();
      } catch (err) {
        console.error("Error generating thumbnail:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    generateThumbnail();
  }, [url]);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded ${className}`}
        onClick={onClick}
      >
        <span className="text-xs text-muted-foreground">PDF</span>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded cursor-pointer hover:ring-2 hover:ring-primary transition-all ${className}`}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className={`w-full h-full object-cover ${isLoading ? 'invisible' : ''}`}
      />
    </div>
  );
};

export default PDFPreview;
