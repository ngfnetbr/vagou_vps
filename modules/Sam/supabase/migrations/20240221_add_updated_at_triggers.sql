
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
