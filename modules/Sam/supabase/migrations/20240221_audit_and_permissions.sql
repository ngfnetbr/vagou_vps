-- Adicionar coluna de permissões na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Criar tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- Ex: 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
    resource TEXT NOT NULL, -- Ex: 'users', 'appointments', 'settings'
    details JSONB DEFAULT '{}'::jsonb, -- Dados alterados, snapshot
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para performance em consultas de logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);

-- Habilitar RLS para auditoria
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver todos os logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Sistema pode inserir logs (via função security definer ou role de serviço)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE audit_logs IS 'Tabela de registro de atividades do sistema para auditoria';
COMMENT ON COLUMN profiles.permissions IS 'Permissões granulares de acesso aos módulos (JSONB)';
