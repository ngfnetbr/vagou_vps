CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'responsavel',
      'gestor',
      'admin',
      'superadmin',
      'diretor_cmei',
      'professional',
      'school_coord',
      'equipe_pedagogica',
      'coordenador'
    );
  ELSE
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'professional';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_coord';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'equipe_pedagogica';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
    CREATE TYPE public.student_status AS ENUM ('active', 'waiting', 'finished');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'missed', 'cancelled');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'superadmin', 'gestor')
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.specialties (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.institution_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name text NOT NULL DEFAULT 'Secretaria Municipal de Educacao',
  logo_url text,
  address text,
  phone text,
  email text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.school_classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS school_id uuid,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS specialty_id uuid,
  ADD COLUMN IF NOT EXISTS cmei_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_school_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_school_id_fkey
      FOREIGN KEY (school_id) REFERENCES public.schools(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_specialty_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_specialty_id_fkey
      FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  birth_date date,
  school_id uuid REFERENCES public.schools(id),
  class_name text,
  guardian_name text,
  status public.student_status DEFAULT 'waiting',
  observations text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.school_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  reporter_id uuid REFERENCES public.profiles(id),
  protocol text NOT NULL UNIQUE,
  primary_complaint text NOT NULL,
  symptoms text,
  impact_learning text,
  behavior_classroom text,
  diagnosis_tags text[],
  status text NOT NULL DEFAULT 'pending',
  document_url text,
  laudo_type text,
  referral_requested boolean DEFAULT false,
  referral_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id),
  complaint_id uuid REFERENCES public.school_complaints(id),
  date timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  type text NOT NULL,
  description text,
  evolution text,
  action_plan text,
  status public.appointment_status DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS complaint_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_complaint_id_fkey'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_complaint_id_fkey
      FOREIGN KEY (complaint_id) REFERENCES public.school_complaints(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.appointment_specialty_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  specialty_id uuid REFERENCES public.specialties(id),
  anamnese text,
  avaliacao_especifica text,
  observacoes_comportamentais text,
  historico_escolar text,
  desenvolvimento_neuropsicomotor text,
  aspectos_comunicativos text,
  aspectos_emocionais text,
  aspectos_sociais text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.appointment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id),
  specialty text,
  registration_number text,
  is_first_visit boolean NOT NULL DEFAULT false,
  anamnesis_data jsonb DEFAULT '{}'::jsonb,
  summary text,
  return_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_complaint_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.school_complaints(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  url text NOT NULL,
  metodo text NOT NULL DEFAULT 'POST' CHECK (metodo IN ('POST', 'GET')),
  evento text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  headers jsonb DEFAULT '{}'::jsonb,
  body_template jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhooks_exec_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  evento text NOT NULL,
  payload_enviado jsonb NOT NULL,
  resposta text,
  status_http integer,
  executado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cache_criancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL UNIQUE,
  nome text NOT NULL,
  data_nascimento date,
  cmei_id text,
  cmei_nome text,
  turma_id text,
  turma_nome text,
  ativo boolean DEFAULT true,
  dados_json jsonb,
  sincronizado_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  responsavel text,
  telefone text
);

CREATE TABLE IF NOT EXISTS public.cache_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL UNIQUE,
  nome text NOT NULL,
  email text,
  cargo text,
  cmei_id text,
  cmei_nome text,
  ativo boolean DEFAULT true,
  dados_json jsonb,
  sincronizado_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_cmeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.local_turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cmei_id text,
  cmei_nome text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.local_criancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data_nascimento date,
  turma_id text,
  turma_nome text,
  cmei_id text,
  cmei_nome text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  responsavel text,
  telefone text
);

CREATE TABLE IF NOT EXISTS public.modelos_sondagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.niveis_aprendizagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  descricao text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('escrita', 'producao_texto', 'corpo_humano')),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.perguntas_modelo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.modelos_sondagem(id) ON DELETE CASCADE,
  texto text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text NOT NULL UNIQUE,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  acao text NOT NULL,
  tabela text NOT NULL,
  registro_id text,
  dados_antes jsonb,
  dados_depois jsonb,
  detalhes text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logs_sincronizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  status text NOT NULL DEFAULT 'sucesso' CHECK (status IN ('sucesso', 'erro', 'parcial')),
  registros_processados integer DEFAULT 0,
  registros_erro integer DEFAULT 0,
  detalhes jsonb,
  executado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sync_controle (
  entidade text PRIMARY KEY,
  ultima_sincronizacao timestamptz NOT NULL DEFAULT '1970-01-01 00:00:00+00'::timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sondagem_niveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.modelos_sondagem(id) ON DELETE CASCADE,
  nivel_id uuid NOT NULL REFERENCES public.niveis_aprendizagem(id) ON DELETE CASCADE,
  UNIQUE (modelo_id, nivel_id)
);

CREATE TABLE IF NOT EXISTS public.sondagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.modelos_sondagem(id),
  crianca_id uuid NOT NULL REFERENCES public.cache_criancas(id),
  aplicador_id uuid NOT NULL REFERENCES auth.users(id),
  periodo text NOT NULL,
  observacoes text,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  genero_texto text,
  genero_outro text,
  arquivo_producao_url text,
  obs_segmentacao text,
  obs_pontuacao text,
  obs_ortografia text
);

CREATE TABLE IF NOT EXISTS public.respostas_sondagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sondagem_id uuid NOT NULL REFERENCES public.sondagens(id) ON DELETE CASCADE,
  nivel_id uuid NOT NULL REFERENCES public.niveis_aprendizagem(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.smtp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 587,
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT 'Sistema de Sondagem',
  enviar_senha_ao_cadastrar boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.solicitacoes_sondagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id uuid NOT NULL REFERENCES auth.users(id),
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
  updated_at timestamptz DEFAULT now(),
  arquivo_url text,
  genero_texto text,
  genero_outro text
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
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

CREATE TABLE IF NOT EXISTS public.metas_sondagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_codigo text NOT NULL,
  turma_tipo text,
  tipo text NOT NULL DEFAULT 'escrita',
  nivel_codigo text NOT NULL,
  descricao text,
  obrigatoria boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anotacoes_aluno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id uuid NOT NULL REFERENCES public.cache_criancas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_nome text,
  texto text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.responsavel_aluno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crianca_id uuid NOT NULL,
  parentesco text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_appointments_student_id ON public.appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_school_complaints_school_id ON public.school_complaints(school_id);
CREATE INDEX IF NOT EXISTS idx_school_complaints_student_id ON public.school_complaints(student_id);
CREATE INDEX IF NOT EXISTS idx_school_complaint_messages_complaint_id ON public.school_complaint_messages(complaint_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_exec_logs_webhook_id ON public.webhooks_exec_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_cache_criancas_external_id ON public.cache_criancas(external_id);
CREATE INDEX IF NOT EXISTS idx_cache_usuarios_external_id ON public.cache_usuarios(external_id);
CREATE INDEX IF NOT EXISTS idx_sondagens_crianca_id ON public.sondagens(crianca_id);
CREATE INDEX IF NOT EXISTS idx_sondagens_aplicador_id ON public.sondagens(aplicador_id);
CREATE INDEX IF NOT EXISTS idx_respostas_sondagem_sondagem_id ON public.respostas_sondagem(sondagem_id);
CREATE INDEX IF NOT EXISTS idx_anotacoes_aluno_crianca_id ON public.anotacoes_aluno(crianca_id);
CREATE INDEX IF NOT EXISTS idx_responsavel_aluno_user_id ON public.responsavel_aluno(user_id);
CREATE INDEX IF NOT EXISTS idx_responsavel_aluno_crianca_id ON public.responsavel_aluno(crianca_id);

ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_specialty_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_complaint_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks_exec_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_criancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_cmeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_criancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_sondagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niveis_aprendizagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perguntas_modelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_sincronizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_controle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sondagem_niveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sondagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_sondagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_sondagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_sondagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacoes_aluno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsavel_aluno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read specialties" ON public.specialties;
CREATE POLICY "Authenticated can read specialties"
  ON public.specialties FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage specialties" ON public.specialties;
CREATE POLICY "Admins can manage specialties"
  ON public.specialties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role));

DROP POLICY IF EXISTS "Schools are viewable by authenticated users" ON public.schools;
CREATE POLICY "Schools are viewable by authenticated users"
  ON public.schools FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage schools" ON public.schools;
CREATE POLICY "Admins can manage schools"
  ON public.schools FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  );

DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.institution_settings;
CREATE POLICY "Allow read for authenticated users"
  ON public.institution_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow manage for authenticated users" ON public.institution_settings;
CREATE POLICY "Allow manage for authenticated users"
  ON public.institution_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Classes viewable by authenticated users" ON public.school_classes;
CREATE POLICY "Classes viewable by authenticated users"
  ON public.school_classes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and School Coords can manage classes" ON public.school_classes;
CREATE POLICY "Admins and School Coords can manage classes"
  ON public.school_classes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'school_coord'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'school_coord'::text)
  );

DROP POLICY IF EXISTS "Students are viewable by authenticated users" ON public.students;
CREATE POLICY "Students are viewable by authenticated users"
  ON public.students FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and professionals can insert students" ON public.students;
CREATE POLICY "Admins and professionals can insert students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  );

DROP POLICY IF EXISTS "Admins and professionals can manage students" ON public.students;
CREATE POLICY "Admins and professionals can manage students"
  ON public.students FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  );

DROP POLICY IF EXISTS "Admins and professionals can delete students" ON public.students;
CREATE POLICY "Admins and professionals can delete students"
  ON public.students FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  );

DROP POLICY IF EXISTS "Users can read complaints" ON public.school_complaints;
CREATE POLICY "Users can read complaints"
  ON public.school_complaints FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert complaints" ON public.school_complaints;
CREATE POLICY "Authenticated can insert complaints"
  ON public.school_complaints FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() OR reporter_id IS NULL);

DROP POLICY IF EXISTS "Admins and school team can manage complaints" ON public.school_complaints;
CREATE POLICY "Admins and school team can manage complaints"
  ON public.school_complaints FOR ALL TO authenticated
  USING (
    reporter_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
    OR public.has_role(auth.uid(), 'school_coord'::text)
  )
  WITH CHECK (
    reporter_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
    OR public.has_role(auth.uid(), 'school_coord'::text)
  );

DROP POLICY IF EXISTS "Appointments viewable by authenticated users" ON public.appointments;
CREATE POLICY "Appointments viewable by authenticated users"
  ON public.appointments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and professionals can insert appointments" ON public.appointments;
CREATE POLICY "Admins and professionals can insert appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = professional_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins and professionals can manage appointments" ON public.appointments;
CREATE POLICY "Admins and professionals can manage appointments"
  ON public.appointments FOR ALL TO authenticated
  USING (
    auth.uid() = professional_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
  WITH CHECK (
    auth.uid() = professional_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  );

DROP POLICY IF EXISTS "Notes viewable by authenticated users" ON public.appointment_specialty_notes;
CREATE POLICY "Notes viewable by authenticated users"
  ON public.appointment_specialty_notes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Professionals can insert notes" ON public.appointment_specialty_notes;
CREATE POLICY "Professionals can insert notes"
  ON public.appointment_specialty_notes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  );

DROP POLICY IF EXISTS "Professionals can manage notes" ON public.appointment_specialty_notes;
CREATE POLICY "Professionals can manage notes"
  ON public.appointment_specialty_notes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'professional'::text)
  );

DROP POLICY IF EXISTS "Records viewable by authenticated users" ON public.appointment_records;
CREATE POLICY "Records viewable by authenticated users"
  ON public.appointment_records FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Professionals can insert records" ON public.appointment_records;
CREATE POLICY "Professionals can insert records"
  ON public.appointment_records FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = professional_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  );

DROP POLICY IF EXISTS "Professionals can manage own records" ON public.appointment_records;
CREATE POLICY "Professionals can manage own records"
  ON public.appointment_records FOR ALL TO authenticated
  USING (
    auth.uid() = professional_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
  WITH CHECK (
    auth.uid() = professional_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  );

DROP POLICY IF EXISTS "Users can read complaint messages" ON public.school_complaint_messages;
CREATE POLICY "Users can read complaint messages"
  ON public.school_complaint_messages FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert complaint messages" ON public.school_complaint_messages;
CREATE POLICY "Authenticated can insert complaint messages"
  ON public.school_complaint_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() OR sender_id IS NULL);

DROP POLICY IF EXISTS "Webhooks viewable by authenticated" ON public.webhooks;
CREATE POLICY "Webhooks viewable by authenticated"
  ON public.webhooks FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.webhooks;
CREATE POLICY "Admins can manage webhooks"
  ON public.webhooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role));

DROP POLICY IF EXISTS "Logs viewable by authenticated" ON public.webhooks_exec_logs;
CREATE POLICY "Logs viewable by authenticated"
  ON public.webhooks_exec_logs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "System can insert logs" ON public.webhooks_exec_logs;
CREATE POLICY "System can insert logs"
  ON public.webhooks_exec_logs FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read cache_criancas" ON public.cache_criancas;
CREATE POLICY "Authenticated users can read cache_criancas"
  ON public.cache_criancas FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage cache_criancas" ON public.cache_criancas;
CREATE POLICY "Admins can manage cache_criancas"
  ON public.cache_criancas FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated users can read cache_usuarios" ON public.cache_usuarios;
CREATE POLICY "Authenticated users can read cache_usuarios"
  ON public.cache_usuarios FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage cache_usuarios" ON public.cache_usuarios;
CREATE POLICY "Admins can manage cache_usuarios"
  ON public.cache_usuarios FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated can read local_cmeis" ON public.local_cmeis;
CREATE POLICY "Authenticated can read local_cmeis"
  ON public.local_cmeis FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin and equipe can manage local_cmeis" ON public.local_cmeis;
CREATE POLICY "Admin and equipe can manage local_cmeis"
  ON public.local_cmeis FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated can read local_turmas" ON public.local_turmas;
CREATE POLICY "Authenticated can read local_turmas"
  ON public.local_turmas FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin and equipe can manage local_turmas" ON public.local_turmas;
CREATE POLICY "Admin and equipe can manage local_turmas"
  ON public.local_turmas FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated can read local_criancas" ON public.local_criancas;
CREATE POLICY "Authenticated can read local_criancas"
  ON public.local_criancas FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin and equipe can manage local_criancas" ON public.local_criancas;
CREATE POLICY "Admin and equipe can manage local_criancas"
  ON public.local_criancas FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated users can read modelos" ON public.modelos_sondagem;
CREATE POLICY "Authenticated users can read modelos"
  ON public.modelos_sondagem FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and equipe can manage modelos" ON public.modelos_sondagem;
CREATE POLICY "Admins and equipe can manage modelos"
  ON public.modelos_sondagem FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated users can read niveis" ON public.niveis_aprendizagem;
CREATE POLICY "Authenticated users can read niveis"
  ON public.niveis_aprendizagem FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage niveis" ON public.niveis_aprendizagem;
CREATE POLICY "Admins can manage niveis"
  ON public.niveis_aprendizagem FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated users can read perguntas" ON public.perguntas_modelo;
CREATE POLICY "Authenticated users can read perguntas"
  ON public.perguntas_modelo FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and equipe can manage perguntas" ON public.perguntas_modelo;
CREATE POLICY "Admins and equipe can manage perguntas"
  ON public.perguntas_modelo FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated users can read periodos" ON public.periodos;
CREATE POLICY "Authenticated users can read periodos"
  ON public.periodos FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage periodos" ON public.periodos;
CREATE POLICY "Admins can manage periodos"
  ON public.periodos FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Admins can read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
  );

DROP POLICY IF EXISTS "Authenticated can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins can manage logs" ON public.logs_sincronizacao;
CREATE POLICY "Admins can manage logs"
  ON public.logs_sincronizacao FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Gestores can read logs" ON public.logs_sincronizacao;
CREATE POLICY "Gestores can read logs"
  ON public.logs_sincronizacao FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  );

DROP POLICY IF EXISTS "Admins can manage sync_controle" ON public.sync_controle;
CREATE POLICY "Admins can manage sync_controle"
  ON public.sync_controle FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Gestores can read sync_controle" ON public.sync_controle;
CREATE POLICY "Gestores can read sync_controle"
  ON public.sync_controle FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated users can read sondagem_niveis" ON public.sondagem_niveis;
CREATE POLICY "Authenticated users can read sondagem_niveis"
  ON public.sondagem_niveis FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and equipe can manage sondagem_niveis" ON public.sondagem_niveis;
CREATE POLICY "Admins and equipe can manage sondagem_niveis"
  ON public.sondagem_niveis FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Users can read own sondagens" ON public.sondagens;
CREATE POLICY "Users can read own sondagens"
  ON public.sondagens FOR SELECT TO authenticated
  USING (
    aplicador_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  );

DROP POLICY IF EXISTS "Users can insert own sondagens" ON public.sondagens;
CREATE POLICY "Users can insert own sondagens"
  ON public.sondagens FOR INSERT TO authenticated
  WITH CHECK (aplicador_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can manage own sondagens" ON public.sondagens;
CREATE POLICY "Users can manage own sondagens"
  ON public.sondagens FOR ALL TO authenticated
  USING (aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (aplicador_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read respostas via sondagem access" ON public.respostas_sondagem;
CREATE POLICY "Users can read respostas via sondagem access"
  ON public.respostas_sondagem FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (
          s.aplicador_id = auth.uid()
          OR public.is_admin(auth.uid())
          OR public.has_role(auth.uid(), 'gestor'::public.app_role)
          OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
          OR public.has_role(auth.uid(), 'coordenador'::text)
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert respostas for own sondagens" ON public.respostas_sondagem;
CREATE POLICY "Users can insert respostas for own sondagens"
  ON public.respostas_sondagem FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (s.aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can manage respostas for own sondagens" ON public.respostas_sondagem;
CREATE POLICY "Users can manage respostas for own sondagens"
  ON public.respostas_sondagem FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (s.aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (s.aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins can manage smtp_config" ON public.smtp_config;
CREATE POLICY "Admins can manage smtp_config"
  ON public.smtp_config FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text));

DROP POLICY IF EXISTS "Users can read solicitacoes" ON public.solicitacoes_sondagem;
CREATE POLICY "Users can read solicitacoes"
  ON public.solicitacoes_sondagem FOR SELECT TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  );

DROP POLICY IF EXISTS "Users can insert own solicitacoes" ON public.solicitacoes_sondagem;
CREATE POLICY "Users can insert own solicitacoes"
  ON public.solicitacoes_sondagem FOR INSERT TO authenticated
  WITH CHECK (solicitante_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can manage own solicitacoes" ON public.solicitacoes_sondagem;
CREATE POLICY "Users can manage own solicitacoes"
  ON public.solicitacoes_sondagem FOR ALL TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    solicitante_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notificacoes;
CREATE POLICY "Users can read own notifications"
  ON public.notificacoes FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  );

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notificacoes;
CREATE POLICY "Users can manage own notifications"
  ON public.notificacoes FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  );

DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notificacoes;
CREATE POLICY "Authenticated can insert notifications"
  ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Equipe and admin can manage metas" ON public.metas_sondagem;
CREATE POLICY "Equipe and admin can manage metas"
  ON public.metas_sondagem FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
  );

DROP POLICY IF EXISTS "Authenticated can read metas" ON public.metas_sondagem;
CREATE POLICY "Authenticated can read metas"
  ON public.metas_sondagem FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin and equipe can manage anotacoes" ON public.anotacoes_aluno;
CREATE POLICY "Admin and equipe can manage anotacoes"
  ON public.anotacoes_aluno FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    OR public.has_role(auth.uid(), 'coordenador'::text)
  );

DROP POLICY IF EXISTS "Authenticated can read anotacoes" ON public.anotacoes_aluno;
CREATE POLICY "Authenticated can read anotacoes"
  ON public.anotacoes_aluno FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can read responsavel_aluno" ON public.responsavel_aluno;
CREATE POLICY "Users can read responsavel_aluno"
  ON public.responsavel_aluno FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text));

DROP POLICY IF EXISTS "Admins can manage responsavel_aluno" ON public.responsavel_aluno;
CREATE POLICY "Admins can manage responsavel_aluno"
  ON public.responsavel_aluno FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text));
