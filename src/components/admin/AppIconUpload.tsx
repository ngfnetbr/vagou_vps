import { useEffect, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Smartphone, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AppIconUploadProps {
  currentUrl?: string;
  onUploadSuccess: (url: string) => void;
  label?: string;
  hint?: string;
  bucket?: string;
  folder?: string;
}

export const AppIconUpload = ({ 
  currentUrl, 
  onUploadSuccess,
  label = "Ícone do Aplicativo",
  hint = "PNG 512x512 recomendado",
  bucket = "assets",
  folder = "app-icons"
}: AppIconUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);

  // Sincroniza a pré-visualização quando a URL carregada do backend chega depois da montagem
  useEffect(() => {
    if (!uploading) {
      setPreviewUrl(currentUrl || null);
    }
  }, [currentUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validação de tipo
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou WebP.");
      return;
    }

    // Validação de tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }

    setUploading(true);

    try {
      // Preview local
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload para Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onUploadSuccess(publicUrl);
      toast.success("Upload realizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
      setPreviewUrl(currentUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadSuccess("");
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      <div className="flex items-start gap-4">
        {/* Preview */}
        {previewUrl && (
          <div className="relative">
            <div className="h-24 w-24 rounded-xl overflow-hidden bg-muted border-2 border-dashed flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-full w-full object-contain p-1"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Upload */}
        <div className="flex-1 space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            id={`app-icon-${label}`}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => document.getElementById(`app-icon-${label}`)?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {previewUrl ? "Alterar" : "Fazer Upload"}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>

      {/* Preview em diferentes tamanhos */}
      {previewUrl && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <div className="h-10 w-10 rounded-lg overflow-hidden bg-background border">
              <img src={previewUrl} alt="Mobile" className="h-full w-full object-contain" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-background border">
              <img src={previewUrl} alt="Desktop" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
