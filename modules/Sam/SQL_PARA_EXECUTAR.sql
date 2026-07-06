
-- COPIE E COLE ESTE CONTEÚDO NO EDITOR SQL DO SUPABASE DASHBOARD
-- Isso criará a tabela necessária e configurará as permissões de segurança

-- 1. Criar a tabela
CREATE TABLE IF NOT EXISTS integration_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    api_key TEXT,
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Segurança (RLS)
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Acesso (Apenas Admin)
-- Remover políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Admins can view integration configs" ON integration_configs;
DROP POLICY IF EXISTS "Admins can update integration configs" ON integration_configs;
DROP POLICY IF EXISTS "Admins can insert integration configs" ON integration_configs;

CREATE POLICY "Admins can view integration configs"
  ON integration_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update integration configs"
  ON integration_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert integration configs"
  ON integration_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. Inserir dados iniciais
INSERT INTO integration_configs (provider, name, settings)
VALUES (
    'make_zapi', 
    'Integração Make/Zapi', 
    '{
        "templates": {
            "appointment_confirmed": "Olá {student_name}, seu agendamento foi confirmado para {date} às {time}.",
            "appointment_reminder": "Lembrete: Você tem um agendamento amanhã às {time}.",
            "reschedule_request": "Sua solicitação de remarcação foi recebida."
        },
        "triggers": {
            "appointment_confirmed": true,
            "appointment_reminder": true,
            "reschedule_request": true
        },
        "schedule": {
            "active_hours_start": "08:00",
            "active_hours_end": "18:00",
            "timezone": "America/Sao_Paulo"
        },
        "recipients": {
            "student": true,
            "professional": false,
            "admin_copy_email": ""
        },
        "retry": {
            "enabled": true,
            "max_attempts": 3
        },
        "logs_enabled": true
    }'::jsonb
) ON CONFLICT (provider) DO NOTHING;

-- 5. ATUALIZAÇÃO DE TRIGGERS (NOVO)
-- Executar para garantir atualização automática de datas

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for students
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for appointments
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for school_classes
DROP TRIGGER IF EXISTS update_school_classes_updated_at ON school_classes;
CREATE TRIGGER update_school_classes_updated_at
    BEFORE UPDATE ON school_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for integration_configs
DROP TRIGGER IF EXISTS update_integration_configs_updated_at ON integration_configs;
CREATE TRIGGER update_integration_configs_updated_at
    BEFORE UPDATE ON integration_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
