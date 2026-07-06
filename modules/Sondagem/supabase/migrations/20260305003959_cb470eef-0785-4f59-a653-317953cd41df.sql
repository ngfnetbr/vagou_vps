
-- 2. Update existing 'gestor' rows to 'equipe_pedagogica'
UPDATE public.user_roles SET role = 'equipe_pedagogica' WHERE role = 'gestor';

-- 3. Deactivate old niveis and insert new ones for Escrita
UPDATE public.niveis_aprendizagem SET ativo = false WHERE tipo = 'escrita';
UPDATE public.niveis_aprendizagem SET ativo = false WHERE tipo = 'producao_texto';

INSERT INTO public.niveis_aprendizagem (codigo, descricao, tipo, ordem, ativo) VALUES
  ('PIC', 'Pictórico', 'escrita', 1, true),
  ('N1', 'Nível 1', 'escrita', 2, true),
  ('N2', 'Nível 2', 'escrita', 3, true),
  ('INT1', 'Inter I', 'escrita', 4, true),
  ('SIL', 'Silábico', 'escrita', 5, true),
  ('INT2', 'Inter II', 'escrita', 6, true),
  ('ALF', 'Alfabético', 'escrita', 7, true);

INSERT INTO public.niveis_aprendizagem (codigo, descricao, tipo, ordem, ativo) VALUES
  ('TMD', 'Texto com muita dificuldade', 'producao_texto', 1, true),
  ('TPD', 'Texto com pouca dificuldade', 'producao_texto', 2, true),
  ('TDP', 'Texto com dificuldade parcial', 'producao_texto', 3, true),
  ('TAL', 'Texto alfabético', 'producao_texto', 4, true);

-- 4. Create solicitacoes_sondagem table
CREATE TABLE public.solicitacoes_sondagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id uuid REFERENCES auth.users(id) NOT NULL,
  cmei_id text NOT NULL,
  cmei_nome text,
  turma_id text,
  turma_nome text,
  mes text NOT NULL,
  palavras text,
  frases text,
  tipo text NOT NULL DEFAULT 'escrita',
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.solicitacoes_sondagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pedagogica can manage own solicitacoes"
  ON public.solicitacoes_sondagem FOR ALL TO authenticated
  USING (solicitante_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (solicitante_id = auth.uid());

CREATE POLICY "Coordenadores can read solicitacoes for their school"
  ON public.solicitacoes_sondagem FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'coordenador'::app_role));

-- 5. Create notificacoes table
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  cmei_id text,
  tipo text NOT NULL DEFAULT 'solicitacao_sondagem',
  titulo text NOT NULL,
  mensagem text,
  referencia_id uuid,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notificacoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (cmei_id IS NOT NULL AND has_role(auth.uid(), 'coordenador'::app_role)));

CREATE POLICY "Users can update own notifications"
  ON public.notificacoes FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (cmei_id IS NOT NULL AND has_role(auth.uid(), 'coordenador'::app_role)));

CREATE POLICY "Authenticated can insert notifications"
  ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (true);

-- 6. Update RLS policies that reference 'gestor' to 'equipe_pedagogica'
DROP POLICY IF EXISTS "Admins and gestores can manage modelos" ON public.modelos_sondagem;
CREATE POLICY "Admins and equipe can manage modelos"
  ON public.modelos_sondagem FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role));

DROP POLICY IF EXISTS "Admins and gestores can manage perguntas" ON public.perguntas_modelo;
CREATE POLICY "Admins and equipe can manage perguntas"
  ON public.perguntas_modelo FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role));

DROP POLICY IF EXISTS "Admins and gestores can manage sondagem_niveis" ON public.sondagem_niveis;
CREATE POLICY "Admins and equipe can manage sondagem_niveis"
  ON public.sondagem_niveis FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role));

DROP POLICY IF EXISTS "Gestores can read logs" ON public.logs_sincronizacao;
CREATE POLICY "Equipe can read logs"
  ON public.logs_sincronizacao FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'equipe_pedagogica'::app_role));

DROP POLICY IF EXISTS "Gestores can read sync_controle" ON public.sync_controle;
CREATE POLICY "Equipe can read sync_controle"
  ON public.sync_controle FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'equipe_pedagogica'::app_role));

DROP POLICY IF EXISTS "Users can read own sondagens" ON public.sondagens;
CREATE POLICY "Users can read own sondagens"
  ON public.sondagens FOR SELECT TO authenticated
  USING (aplicador_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'equipe_pedagogica'::app_role) OR has_role(auth.uid(), 'coordenador'::app_role));

DROP POLICY IF EXISTS "Users can update own sondagens" ON public.sondagens;
CREATE POLICY "Users can update own sondagens"
  ON public.sondagens FOR UPDATE TO authenticated
  USING (aplicador_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
