-- Copie e execute este código no Editor SQL do Supabase para corrigir as permissões

-- 1. Garantir colunas
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting';

-- 2. Corrigir RLS (Permissões)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Students are viewable by authenticated users" ON students;
DROP POLICY IF EXISTS "Professionals and Admins can insert students" ON students;
DROP POLICY IF EXISTS "Professionals and Admins can update students" ON students;
DROP POLICY IF EXISTS "Professionals and Admins can delete students" ON students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON students;
DROP POLICY IF EXISTS "Admins and professionals can insert students" ON students;
DROP POLICY IF EXISTS "Admins and professionals can update students" ON students;
DROP POLICY IF EXISTS "Admins and professionals can delete students" ON students;

-- Recriar políticas (leitura para todos autenticados, escrita restrita a admin/professional)
CREATE POLICY "Students are viewable by authenticated users"
  ON students FOR SELECT
  TO authenticated
  USING ( true );

CREATE POLICY "Admins and professionals can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'professional')
    )
  );

CREATE POLICY "Admins and professionals can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'professional')
    )
  );

CREATE POLICY "Admins and professionals can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'professional')
    )
  );
