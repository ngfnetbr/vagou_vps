
-- Drop the existing restrictive insert policy
DROP POLICY "Professionals can insert appointments" ON appointments;

-- Create a new policy allowing admins and professionals to insert appointments
CREATE POLICY "Admins and professionals can insert appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = professional_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::user_role
    )
  );

-- Also fix update policy for admins
DROP POLICY "Professionals can update own appointments" ON appointments;

CREATE POLICY "Admins and professionals can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = professional_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::user_role
    )
  );
