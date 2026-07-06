import { useState, useEffect } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Youtube, ExternalLink } from "lucide-react";
import { 
  TutorialVideo, 
  TutorialVideoInput, 
  useCreateTutorialVideo, 
  useUpdateTutorialVideo,
  extractYoutubeId,
  getYoutubeThumbnail
} from "@/hooks/api/tutoriais-hooks";

interface TutorialVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video?: TutorialVideo | null;
}

export function TutorialVideoDialog({ open, onOpenChange, video }: TutorialVideoDialogProps) {
  const [form, setForm] = useState<TutorialVideoInput>({
    titulo: "",
    descricao: "",
    youtube_id: "",
    duracao: "",
    ordem: 0,
    ativo: true,
  });
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const createVideo = useCreateTutorialVideo();
  const updateVideo = useUpdateTutorialVideo();
  const isLoading = createVideo.isPending || updateVideo.isPending;
  const isEditing = !!video;

  useEffect(() => {
    if (video) {
      setForm({
        titulo: video.titulo,
        descricao: video.descricao || "",
        youtube_id: video.youtube_id,
        duracao: video.duracao || "",
        ordem: video.ordem,
        ativo: video.ativo,
      });
      setYoutubeUrl(`https://youtube.com/watch?v=${video.youtube_id}`);
      setPreviewId(video.youtube_id);
    } else {
      setForm({
        titulo: "",
        descricao: "",
        youtube_id: "",
        duracao: "",
        ordem: 0,
        ativo: true,
      });
      setYoutubeUrl("");
      setPreviewId(null);
    }
  }, [video, open]);

  const handleYoutubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    const id = extractYoutubeId(url);
    if (id) {
      setForm(prev => ({ ...prev, youtube_id: id }));
      setPreviewId(id);
    } else {
      setPreviewId(null);
    }
  };

  const handleSubmit = () => {
    if (!form.titulo.trim()) {
      return;
    }
    if (!form.youtube_id) {
      return;
    }

    // Auto-generate thumbnail if not provided
    const videoData = {
      ...form,
      thumbnail_url: getYoutubeThumbnail(form.youtube_id),
    };

    if (isEditing && video) {
      updateVideo.mutate({ id: video.id, ...videoData }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createVideo.mutate(videoData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            {isEditing ? "Editar Vídeo Tutorial" : "Adicionar Vídeo Tutorial"}
          </DialogTitle>
          <DialogDescription>
            Adicione vídeos do YouTube para ajudar os usuários a entender o sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="youtube-url">Link do YouTube *</Label>
            <div className="flex gap-2">
              <Input
                id="youtube-url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => handleYoutubeUrlChange(e.target.value)}
              />
              {previewId && (
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a
                    href={`https://youtube.com/watch?v=${previewId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
            {previewId && (
              <div className="mt-2 rounded-lg overflow-hidden border">
                <img
                  src={getYoutubeThumbnail(previewId)}
                  alt="Preview"
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              placeholder="Ex: Como fazer uma inscrição"
              value={form.titulo}
              onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Breve descrição do conteúdo do vídeo..."
              value={form.descricao}
              onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="duracao">Duração</Label>
              <Input
                id="duracao"
                placeholder="Ex: 5:30"
                value={form.duracao}
                onChange={(e) => setForm(prev => ({ ...prev, duracao: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ordem">Ordem</Label>
              <Input
                id="ordem"
                type="number"
                min={0}
                value={form.ordem}
                onChange={(e) => setForm(prev => ({ ...prev, ordem: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="ativo"
              checked={form.ativo}
              onCheckedChange={(checked) => setForm(prev => ({ ...prev, ativo: checked }))}
            />
            <Label htmlFor="ativo">Vídeo ativo (visível para usuários)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !form.titulo || !form.youtube_id}>
            {isLoading && <Spinner className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

