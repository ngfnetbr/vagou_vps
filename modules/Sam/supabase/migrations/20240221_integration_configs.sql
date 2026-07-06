-- Tabela para configurações de integração (Make, Zapi, etc)
CREATE TABLE IF NOT EXISTS integration_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL UNIQUE, -- 'make', 'zapi', 'whatsapp', etc.
    name TEXT NOT NULL,
    api_key TEXT,
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT false,
    
    -- Configurações complexas em JSONB
    settings JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Segurança a Nível de Linha)
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Apenas Admins podem ver/editar configurações sensíveis)
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

-- Inserir configuração padrão para Make/Zapi se não existir
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

COMMENT ON TABLE integration_configs IS 'Configurações de integração com serviços externos como Make e Zapi';
