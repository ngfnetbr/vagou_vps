import { useState, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import { FileIcon, Image as ImageIcon } from "lucide-react";
import { PDFThumbnail } from "./PDFPreview";
import { getSignedDocumentUrl } from "@/hooks/api/documentos-hooks";

interface DocumentThumbnailProps {
  arquivoUrl: string;
  arquivoNome?: string | null;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

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

export const DocumentThumbnail = ({ arquivoUrl, arquivoNome, onClick, className = "", size = 'md' }: DocumentThumbnailProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  useEffect(() => {
    const loadUrl = async () => {
      setIsLoading(true);
      setError(false);
      setImageError(false);
      
      try {
        const url = await getSignedDocumentUrl(arquivoUrl);
        setSignedUrl(url);
      } catch (err) {
        console.error("Error loading thumbnail URL:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadUrl();
  }, [arquivoUrl]);

  const baseClass = `${sizeClasses[size]} flex-shrink-0 ${className}`;

  if (isLoading) {
    return (
      <div className={`${baseClass} flex items-center justify-center bg-muted rounded`}>
        <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div 
        className={`${baseClass} flex items-center justify-center bg-muted rounded cursor-pointer hover:bg-muted/80`}
        onClick={onClick}
      >
        <FileIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (isImageFile(arquivoUrl, arquivoNome)) {
    return (
      <div 
        className={`${baseClass} rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all`}
        onClick={onClick}
      >
        {imageError ? (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={signedUrl}
            alt={arquivoNome || "Documento"}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    );
  }

  if (isPdfFile(arquivoUrl, arquivoNome)) {
    return (
      <PDFThumbnail 
        url={signedUrl} 
        className={baseClass}
        onClick={onClick}
      />
    );
  }

  return (
    <div 
      className={`${baseClass} flex items-center justify-center bg-muted rounded cursor-pointer hover:bg-muted/80`}
      onClick={onClick}
    >
      <FileIcon className="h-6 w-6 text-muted-foreground" />
    </div>
  );
};

export default DocumentThumbnail;
