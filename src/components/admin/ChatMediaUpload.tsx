import { useState, useRef } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Paperclip, Image, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMediaUploadProps {
  onUpload: (url: string, tipo: 'imagem' | 'documento', nomeArquivo: string) => void;
  disabled?: boolean;
}

export function ChatMediaUpload({ onUpload, disabled }: ChatMediaUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    file: File,
    tipo: 'imagem' | 'documento'
  ) => {
    try {
      setUploading(true);
      setOpen(false);

      // Validar tamanho (máx 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo: 10MB");
        return;
      }

      // Gerar nome único
      const ext = file.name.split('.').pop();
      const nomeArquivo = `chat/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      // Upload para o bucket 'documentos'
      const { data, error } = await supabase.storage
        .from('documentos')
        .upload(nomeArquivo, file, {
          contentType: file.type,
        });

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(data.path);

      onUpload(urlData.publicUrl, tipo, file.name);
      toast.success("Arquivo enviado!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'imagem');
    }
    e.target.value = '';
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'documento');
    }
    e.target.value = '';
  };

  return (
    <>
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={docInputRef}
        onChange={handleDocChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={disabled || uploading}
            title="Anexar arquivo"
          >
            {uploading ? (
              <Spinner className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start" side="top">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => {
                imageInputRef.current?.click();
              }}
            >
              <Image className="h-4 w-4" />
              Imagem
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => {
                docInputRef.current?.click();
              }}
            >
              <FileText className="h-4 w-4" />
              Documento
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
