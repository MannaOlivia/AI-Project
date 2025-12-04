-- ============================================
-- AUTO RETURN AGENT - COMPLETE DATABASE SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Create return_policies table
CREATE TABLE public.return_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_type TEXT NOT NULL,
  defect_category TEXT NOT NULL,
  is_returnable BOOLEAN NOT NULL DEFAULT false,
  conditions TEXT,
  time_limit_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create return_requests table
CREATE TABLE public.return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  language VARCHAR(10) DEFAULT 'en',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT,
  product_category TEXT,
  issue_category TEXT,
  more_info_requested BOOLEAN DEFAULT false,
  analysis_round integer DEFAULT 1,
  original_image_url text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create return_decisions table
CREATE TABLE public.return_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  vision_analysis TEXT NOT NULL,
  defect_category TEXT NOT NULL,
  policy_matched_id UUID REFERENCES public.return_policies(id),
  decision TEXT NOT NULL,
  decision_reason TEXT NOT NULL,
  auto_email_draft TEXT,
  processing_time_ms INTEGER,
  is_google_image BOOLEAN DEFAULT false,
  language VARCHAR(10) DEFAULT 'en',
  confidence DECIMAL(3,2),
  is_suspicious_image BOOLEAN DEFAULT false,
  admin_notes TEXT,
  manual_review_reason text,
  ai_generated_image boolean DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  order_date date,
  ship_date date,
  ship_mode text,
  customer_id text,
  customer_name text,
  segment text,
  country text,
  city text,
  state text,
  region text,
  product_id text,
  category text,
  sub_category text,
  product_name text,
  sales numeric,
  quantity integer,
  profit numeric,
  brand text,
  discount_percent numeric,
  cost numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user_orders junction table
CREATE TABLE public.user_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, order_id)
);

-- Enable RLS on all tables
ALTER TABLE public.return_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_orders ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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

-- Function to assign roles on user creation
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

-- Add triggers
CREATE TRIGGER update_return_policies_updated_at
  BEFORE UPDATE ON public.return_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_return_requests_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-assign roles on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_initial_admin();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_decisions_confidence ON public.return_decisions(confidence);

-- ====================
-- RLS POLICIES
-- ====================

-- Return Policies RLS
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

-- Return Requests RLS
CREATE POLICY "Users can insert their own requests"
ON public.return_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests"
ON public.return_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
ON public.return_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests"
ON public.return_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Return Decisions RLS
CREATE POLICY "Users can view their own decisions"
ON public.return_decisions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE return_requests.id = return_decisions.request_id
    AND return_requests.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all decisions"
ON public.return_decisions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert decisions"
ON public.return_decisions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update decisions"
ON public.return_decisions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User Roles RLS
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

-- Orders RLS
CREATE POLICY "Users can view their assigned orders"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_orders
    WHERE user_orders.order_id = orders.id
    AND user_orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- User Orders RLS
CREATE POLICY "Users can view their own order assignments"
ON public.user_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all order assignments"
ON public.user_orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert order assignments"
ON public.user_orders
FOR INSERT
WITH CHECK (true);

-- ====================
-- SAMPLE DATA
-- ====================

-- Insert sample return policies
INSERT INTO public.return_policies (policy_type, defect_category, is_returnable, conditions, time_limit_days) VALUES
  ('manufacturing_defect', 'cracked_screen', true, 'Screen damage from manufacturing defect, not user damage', 30),
  ('manufacturing_defect', 'broken_component', true, 'Component failure due to manufacturing defect', 30),
  ('manufacturing_defect', 'color_defect', true, 'Color variation or defect from manufacturing', 30),
  ('user_damage', 'physical_damage', false, 'Damage caused by user mishandling or dropping', NULL),
  ('user_damage', 'water_damage', false, 'Water or liquid damage caused by user', NULL),
  ('normal_wear', 'scratches', false, 'Normal wear and tear, cosmetic scratches', NULL),
  ('normal_wear', 'discoloration', false, 'Natural discoloration from use', NULL);

-- ====================
-- STORAGE SETUP
-- ====================

-- Create storage bucket for defect images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'defect-images',
  'defect-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for defect images
CREATE POLICY "Allow public uploads to defect-images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'defect-images');

CREATE POLICY "Allow public access to defect-images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'defect-images');

-- ============================================
-- SETUP COMPLETE!
-- ============================================


