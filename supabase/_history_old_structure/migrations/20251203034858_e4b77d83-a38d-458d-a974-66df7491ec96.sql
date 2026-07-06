-- Criar tabela para vídeos tutoriais
CREATE TABLE public.tutoriais_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  youtube_id text NOT NULL,
  duracao text,
  thumbnail_url text,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Habilitar RLS
ALTER TABLE public.tutoriais_videos ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Anyone can view active tutorials" ON public.tutoriais_videos
  FOR SELECT USING (ativo = true);

CREATE POLICY "Superadmin can manage tutorials" ON public.tutoriais_videos
  FOR ALL USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Trigger para updated_at
CREATE TRIGGER update_tutoriais_videos_updated_at
  BEFORE UPDATE ON public.tutoriais_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();