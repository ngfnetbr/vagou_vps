-- =============================================================================
-- VAGOU - Script de Criação de Super Admin
-- =============================================================================
-- Execute este script APÓS os scripts anteriores e após criar uma conta
-- =============================================================================

-- =============================================================================
-- OPÇÃO 1: Promover usuário existente para Super Admin
-- =============================================================================
-- Use esta opção quando já existe uma conta no sistema

-- Substitua 'admin@exemplo.com' pelo email real do administrador
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin@exemplo.com'; -- [SUBSTITUIR] pelo email real
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRIAÇÃO DE SUPER ADMIN';
  RAISE NOTICE '========================================';
  
  -- Buscar usuário pelo email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '✗ Usuário com email "%" não encontrado. Certifique-se de que ele se cadastrou primeiro.', v_email;
  END IF;
  
  RAISE NOTICE '✓ Usuário encontrado: %', v_user_id;
  
  -- Remover roles anteriores (manter apenas superadmin)
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  RAISE NOTICE '✓ Roles anteriores removidas';
  
  -- Adicionar role superadmin
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (v_user_id, 'superadmin', NOW())
  ON CONFLICT (user_id, role) DO NOTHING;
  RAISE NOTICE '✓ Role superadmin adicionada';
  
  -- Atualizar/criar perfil
  INSERT INTO public.profiles (id, email, nome_completo, ativo, created_at, updated_at)
  VALUES (v_user_id, v_email, 'Administrador do Sistema', true, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = COALESCE(EXCLUDED.nome_completo, profiles.nome_completo),
    ativo = true,
    updated_at = NOW();
  RAISE NOTICE '✓ Perfil atualizado';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUPER ADMIN CRIADO COM SUCESSO!';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'ID: %', v_user_id;
  RAISE NOTICE '========================================';
END $$;


-- =============================================================================
-- OPÇÃO 2: Criar usuário via SQL (Alternativo)
-- =============================================================================
-- Use esta opção apenas se precisar criar usuário diretamente no banco
-- NOTA: Não recomendado - Prefira criar conta pela interface

/*
-- Gerar UUID e hash de senha
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := 'admin@exemplo.com'; -- [SUBSTITUIR]
  v_password text := 'SenhaSegura123!'; -- [SUBSTITUIR] Use senha forte!
BEGIN
  -- Criar usuário no auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud,
    confirmation_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(v_password, gen_salt('bf')),
    NOW(), -- Email já confirmado
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    'authenticated',
    'authenticated',
    ''
  );
  
  -- Criar identidade
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    NOW(),
    NOW()
  );
  
  -- Criar perfil
  INSERT INTO public.profiles (id, email, nome_completo, ativo)
  VALUES (v_user_id, v_email, 'Administrador do Sistema', true);
  
  -- Adicionar role superadmin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'superadmin');
  
  RAISE NOTICE 'Usuário criado com sucesso!';
  RAISE NOTICE 'ID: %', v_user_id;
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'IMPORTANTE: Troque a senha no primeiro acesso!';
END $$;
*/


-- =============================================================================
-- VERIFICAÇÃO: Listar Super Admins existentes
-- =============================================================================
DO $$
DECLARE
  v_count integer;
  r record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUPER ADMINS CADASTRADOS';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO v_count 
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'superadmin';
  
  IF v_count = 0 THEN
    RAISE NOTICE '⚠️ Nenhum super admin encontrado!';
    RAISE NOTICE '';
    RAISE NOTICE 'Para criar um super admin:';
    RAISE NOTICE '1. Cadastre uma conta pelo sistema';
    RAISE NOTICE '2. Substitua o email na OPÇÃO 1 acima';
    RAISE NOTICE '3. Execute o script novamente';
  ELSE
    FOR r IN 
      SELECT p.email, p.nome_completo, ur.created_at
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.role = 'superadmin'
      ORDER BY ur.created_at
    LOOP
      RAISE NOTICE '• % (%)', r.email, COALESCE(r.nome_completo, 'Sem nome');
    END LOOP;
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
