-- Tabela de marcadores disponíveis
CREATE TABLE public.chat_marcadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#3b82f6',
  descricao text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Tabela de vínculo marcador-conversa
CREATE TABLE public.chat_conversa_marcadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel_telefone text NOT NULL,
  marcador_id uuid NOT NULL REFERENCES public.chat_marcadores(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(responsavel_telefone, marcador_id)
);

-- Tabela de respostas rápidas configuráveis
CREATE TABLE public.chat_respostas_rapidas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  atalho text,
  categoria text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.chat_marcadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversa_marcadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_respostas_rapidas ENABLE ROW LEVEL SECURITY;

-- Políticas para marcadores
CREATE POLICY "Admin can manage chat labels"
  ON public.chat_marcadores FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active labels"
  ON public.chat_marcadores FOR SELECT
  USING (ativo = true);

-- Políticas para vínculo conversa-marcador
CREATE POLICY "Admin can manage conversation labels"
  ON public.chat_conversa_marcadores FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Políticas para respostas rápidas
CREATE POLICY "Admin can manage quick replies"
  ON public.chat_respostas_rapidas FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active quick replies"
  ON public.chat_respostas_rapidas FOR SELECT
  USING (ativo = true);

-- Inserir alguns marcadores padrão
INSERT INTO public.chat_marcadores (nome, cor, descricao, ordem) VALUES
  ('Urgente', '#ef4444', 'Conversas que precisam de atenção imediata', 1),
  ('Aguardando', '#f59e0b', 'Aguardando resposta do responsável', 2),
  ('Resolvido', '#22c55e', 'Conversa resolvida/concluída', 3),
  ('Documentação', '#3b82f6', 'Relacionado a documentos', 4),
  ('Dúvida', '#8b5cf6', 'Dúvidas gerais', 5);

-- Inserir algumas respostas rápidas padrão
INSERT INTO public.chat_respostas_rapidas (titulo, mensagem, atalho, categoria, ordem) VALUES
  ('Boas-vindas', 'Olá! Seja bem-vindo(a) ao atendimento do CMEI. Como posso ajudar?', '/ola', 'Saudações', 1),
  ('Agradecimento', 'Agradecemos seu contato! Qualquer dúvida, estamos à disposição.', '/obrigado', 'Saudações', 2),
  ('Documentos pendentes', 'Identificamos que há documentos pendentes para a matrícula. Por favor, envie os documentos solicitados o mais breve possível.', '/docs', 'Documentação', 3),
  ('Convocação', 'Parabéns! Seu filho(a) foi convocado(a) para matrícula. Entre em contato conosco para agendar o atendimento.', '/convocado', 'Matrícula', 4),
  ('Prazo', 'Lembramos que o prazo para resposta à convocação é de {prazo} dias. Não deixe de comparecer!', '/prazo', 'Matrícula', 5);