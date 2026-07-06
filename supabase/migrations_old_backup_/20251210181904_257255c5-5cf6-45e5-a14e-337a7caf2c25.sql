-- Update the handle_new_user function to save user metadata to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert profile with user metadata if available
  INSERT INTO public.profiles (
    id, 
    email, 
    nome_completo,
    cpf,
    telefone
  )
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'nome_completo',
    NEW.raw_user_meta_data ->> 'cpf',
    NEW.raw_user_meta_data ->> 'telefone'
  );
  
  -- Insert default role (responsavel)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'responsavel');
  
  RETURN NEW;
END;
$$;