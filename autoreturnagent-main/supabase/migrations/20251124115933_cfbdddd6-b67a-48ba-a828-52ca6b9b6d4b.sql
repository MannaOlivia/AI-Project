-- Add unique constraint to user_roles table to prevent duplicate role assignments
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);