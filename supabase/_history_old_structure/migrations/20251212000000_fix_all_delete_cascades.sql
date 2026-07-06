-- Migration to FORCE ON DELETE CASCADE on all tables referencing 'criancas'
-- This script dynamically finds all foreign keys pointing to 'criancas' and updates them to CASCADE.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, kcu.column_name, tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'criancas'
          AND ccu.table_schema = 'public'
    ) LOOP
        -- Log the action
        RAISE NOTICE 'Updating constraint % on table %.% to ON DELETE CASCADE', r.constraint_name, r.table_schema, r.table_name;

        -- Drop the existing constraint
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
                ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        
        -- Re-add the constraint with ON DELETE CASCADE
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
                ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || 
                ' FOREIGN KEY (' || quote_ident(r.column_name) || ') ' || 
                ' REFERENCES public.criancas(id) ON DELETE CASCADE';
    END LOOP;
END $$;
