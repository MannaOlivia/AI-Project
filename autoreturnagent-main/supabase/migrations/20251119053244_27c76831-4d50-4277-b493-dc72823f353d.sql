-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update return_policies to allow admin management
DROP POLICY IF EXISTS "Allow all access to return_policies" ON public.return_policies;

CREATE POLICY "Anyone can view policies"
ON public.return_policies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert policies"
ON public.return_policies
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update policies"
ON public.return_policies
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete policies"
ON public.return_policies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update return_requests RLS
DROP POLICY IF EXISTS "Allow all access to return_requests" ON public.return_requests;

CREATE POLICY "Users can view all requests"
ON public.return_requests
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can insert requests"
ON public.return_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update requests"
ON public.return_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update return_decisions RLS
DROP POLICY IF EXISTS "Allow all access to return_decisions" ON public.return_decisions;

CREATE POLICY "Users can view all decisions"
ON public.return_decisions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert decisions"
ON public.return_decisions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add analytics fields to return_decisions
ALTER TABLE public.return_decisions
ADD COLUMN processing_time_ms INTEGER,
ADD COLUMN is_google_image BOOLEAN DEFAULT false,
ADD COLUMN language VARCHAR(10) DEFAULT 'en';

-- Add language to return_requests
ALTER TABLE public.return_requests
ADD COLUMN language VARCHAR(10) DEFAULT 'en';