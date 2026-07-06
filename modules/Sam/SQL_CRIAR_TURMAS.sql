-- COPIE E COLE ESTE CONTEÚDO NO EDITOR SQL DO SUPABASE DASHBOARD
-- Isso criará a tabela de turmas e populará com dados iniciais

-- 1. Criar tabela de Turmas
CREATE TABLE IF NOT EXISTS school_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE school_classes ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
DROP POLICY IF EXISTS "Classes viewable by authenticated users" ON school_classes;
CREATE POLICY "Classes viewable by authenticated users"
  ON school_classes FOR SELECT
  TO authenticated
  USING ( true );

DROP POLICY IF EXISTS "Admins and School Coords can manage classes" ON school_classes;
CREATE POLICY "Admins and School Coords can manage classes"
  ON school_classes FOR ALL
  TO authenticated
  USING ( 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'school_coord')
    )
  );

-- 4. Popular com dados de exemplo
DO $$
DECLARE
    school_rec RECORD;
BEGIN
    FOR school_rec IN SELECT id, name FROM schools LOOP
        INSERT INTO school_classes (school_id, name) VALUES
        (school_rec.id, '1º Ano A'),
        (school_rec.id, '1º Ano B'),
        (school_rec.id, '2º Ano A'),
        (school_rec.id, '3º Ano B'),
        (school_rec.id, '4º Ano A'),
        (school_rec.id, '5º Ano A')
        ON CONFLICT DO NOTHING; -- Evitar erro se rodar múltiplas vezes (embora não tenha unique constraint no nome+school ainda, é boa prática)
    END LOOP;
END $$;
