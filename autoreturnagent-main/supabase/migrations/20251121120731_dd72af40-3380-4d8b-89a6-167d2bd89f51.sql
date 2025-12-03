-- Create admin user role for the specified email
-- First, you need to sign up with email: admin2025@test.com and password: 123456
-- Then this will automatically assign admin role

-- Function to assign admin role to specific email after signup
CREATE OR REPLACE FUNCTION public.assign_initial_admin()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the admin email and assign admin role
  IF NEW.email = 'admin2025@test.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Assign regular user role to all other users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign roles on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_initial_admin();

-- Add admin_notes column to return_decisions for requesting more info
ALTER TABLE public.return_decisions 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add a field to track if more info was requested
ALTER TABLE public.return_requests
ADD COLUMN IF NOT EXISTS more_info_requested BOOLEAN DEFAULT false;

-- Update RLS policy to allow admins to update return_decisions
DROP POLICY IF EXISTS "Admins can update decisions" ON public.return_decisions;
CREATE POLICY "Admins can update decisions"
ON public.return_decisions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));