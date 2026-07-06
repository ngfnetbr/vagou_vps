
-- Insert admin role for admin@user.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('3187ce51-0229-4b22-88ac-13256a593028', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
