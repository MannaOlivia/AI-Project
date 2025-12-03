-- Add fields to track analysis rounds and manual review reasons
ALTER TABLE public.return_requests 
ADD COLUMN analysis_round integer DEFAULT 1,
ADD COLUMN original_image_url text;

-- Add field to track manual review reason and AI-generated image detection
ALTER TABLE public.return_decisions 
ADD COLUMN manual_review_reason text,
ADD COLUMN ai_generated_image boolean DEFAULT false;