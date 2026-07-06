
-- ===========================================
-- FIX 1: Restrict students write RLS to admin/professional
-- ===========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert students" ON students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON students;

-- Recreate with role restrictions
CREATE POLICY "Admins and professionals can insert students"
  ON students FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'professional')
    )
  );

CREATE POLICY "Admins and professionals can update students"
  ON students FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'professional')
    )
  );

CREATE POLICY "Admins and professionals can delete students"
  ON students FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'professional')
    )
  );

-- ===========================================
-- FIX 2: Enable RLS on webhook_configs and webhook_logs
-- ===========================================

ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- webhook_configs: admin-only access
CREATE POLICY "Admins can manage webhook_configs"
  ON webhook_configs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- webhook_logs: admin can read, any authenticated can insert
CREATE POLICY "Admins can view webhook_logs"
  ON webhook_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert webhook_logs"
  ON webhook_logs FOR INSERT TO authenticated
  WITH CHECK (true);
