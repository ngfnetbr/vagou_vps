-- Garantir que a tabela students tenha as colunas necessárias
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting';

-- Habilitar RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflitos/duplicação
DROP POLICY IF EXISTS "Students are viewable by authenticated users" ON students;
DROP POLICY IF EXISTS "Professionals and Admins can insert students" ON students;
DROP POLICY IF EXISTS "Professionals and Admins can update students" ON students;
DROP POLICY IF EXISTS "Professionals and Admins can delete students" ON students;

-- Criar novas políticas

-- LEITURA: Permitir que qualquer usuário autenticado veja os alunos (necessário para listagens)
CREATE POLICY "Students are viewable by authenticated users"
  ON students FOR SELECT
  TO authenticated
  USING ( true );

-- CRIAÇÃO: Permitir que usuários autenticados criem alunos
-- (Idealmente restrito a admin/professional, mas para evitar bloqueios iniciais vamos permitir auth)
-- Se quiser restringir, descomente a verificação de perfil abaixo
CREATE POLICY "Authenticated users can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK ( true );
  /*
  WITH CHECK ( 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'professional', 'school_coord')
    )
  );
  */

-- ATUALIZAÇÃO: Permitir atualização
CREATE POLICY "Authenticated users can update students"
  ON students FOR UPDATE
  TO authenticated
  USING ( true );

-- EXCLUSÃO: Permitir exclusão (geralmente restrito a admins, mas vamos liberar por enquanto)
CREATE POLICY "Authenticated users can delete students"
  ON students FOR DELETE
  TO authenticated
  USING ( true );
