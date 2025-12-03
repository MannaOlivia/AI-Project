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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.return_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read/write for this demo
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all access to return_policies"
  ON public.return_policies
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to return_requests"
  ON public.return_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to return_decisions"
  ON public.return_decisions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
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

-- Insert sample return policies
INSERT INTO public.return_policies (policy_type, defect_category, is_returnable, conditions, time_limit_days) VALUES
  ('manufacturing_defect', 'cracked_screen', true, 'Screen damage from manufacturing defect, not user damage', 30),
  ('manufacturing_defect', 'broken_component', true, 'Component failure due to manufacturing defect', 30),
  ('manufacturing_defect', 'color_defect', true, 'Color variation or defect from manufacturing', 30),
  ('user_damage', 'physical_damage', false, 'Damage caused by user mishandling or dropping', NULL),
  ('user_damage', 'water_damage', false, 'Water or liquid damage caused by user', NULL),
  ('normal_wear', 'scratches', false, 'Normal wear and tear, cosmetic scratches', NULL),
  ('normal_wear', 'discoloration', false, 'Natural discoloration from use', NULL);

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