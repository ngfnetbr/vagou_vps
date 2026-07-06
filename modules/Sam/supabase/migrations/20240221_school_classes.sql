-- Criar tabela de Turmas vinculada a Escolas
CREATE TABLE IF NOT EXISTS school_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE school_classes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Classes viewable by authenticated users"
  ON school_classes FOR SELECT
  TO authenticated
  USING ( true );

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

-- Inserir dados de exemplo (Seed) para as escolas existentes
-- Primeiro, vamos pegar os IDs das escolas (assumindo nomes do seed anterior ou genéricos)
DO $$
DECLARE
    school_rec RECORD;
BEGIN
    FOR school_rec IN SELECT id, name FROM schools LOOP
        -- Inserir turmas padrão para cada escola encontrada
        INSERT INTO school_classes (school_id, name) VALUES
        (school_rec.id, '1º Ano A'),
        (school_rec.id, '1º Ano B'),
        (school_rec.id, '2º Ano A'),
        (school_rec.id, '3º Ano A'),
        (school_rec.id, '4º Ano B'),
        (school_rec.id, '5º Ano A');
    END LOOP;
END $$;

COMMENT ON TABLE school_classes IS 'Turmas das escolas';
