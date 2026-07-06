INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmed_at) 
VALUES (
    'dbede5b0-06f3-4d2e-9379-a2f5dc930584', 
    '00000000-0000-0000-0000-000000000000', 
    'authenticated', 
    'authenticated', 
    'admin@gmail.com', 
    '$2a$10$iJYo32CusfHFCjc1T2NCcOHLA6oW0w1I0v.h9LifAHD/b5rjvc4cy', 
    '2025-12-02 02:33:13.920715+00', 
    '{"provider":"email","providers":["email"]}'::jsonb, 
    '{"email_verified":true}'::jsonb, 
    '2025-12-02 02:33:13.915725+00', 
    '2026-03-25 18:21:22.508648+00', 
    '2025-12-02 02:33:13.920715+00'
) ON CONFLICT (id) DO NOTHING;
