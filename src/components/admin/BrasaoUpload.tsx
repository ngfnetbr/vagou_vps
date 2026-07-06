import { useState, useRef } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BrasaoUploadProps {
  currentUrl?: string | null;
  onUploadSuccess: (url: string) => void;
}

export function BrasaoUpload({ currentUrl, onUploadSuccess }: BrasaoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validações
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou SVG");
      return;
    }

    if (file.size > 524288) { // 512KB
      toast.error("Arquivo muito grande. Máximo: 512KB");
      return;
    }

    setUploading(true);

    try {
      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload para Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `brasao_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brasoes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data } = supabase.storage
        .from('brasoes')
        .getPublicUrl(filePath);

      if (!data.publicUrl) throw new Error("Erro ao obter URL pública");

      onUploadSuccess(data.publicUrl);
      toast.success("Brasão enviado com sucesso!");
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar brasão: " + error.message);
      setPreviewUrl(currentUrl || null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadSuccess("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="brasao-upload">Upload do Brasão</Label>
      
      <div className="flex items-start gap-4">
        {previewUrl && (
          <div className="relative">
            <div className="h-24 w-24 rounded-lg overflow-hidden bg-white border-2 border-border flex items-center justify-center">
              <img 
                src={previewUrl} 
                alt="Preview Brasão" 
                className="h-full w-full object-contain p-2"
                onError={(e) => {
                  e.currentTarget.src = '';
                  e.currentTarget.alt = 'Erro ao carregar';
                }}
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex-1">
          <input
            ref={fileInputRef}
            id="brasao-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Selecionar Arquivo
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPG ou SVG. Máximo 512KB.
          </p>
        </div>
      </div>
    </div>
  );
}
