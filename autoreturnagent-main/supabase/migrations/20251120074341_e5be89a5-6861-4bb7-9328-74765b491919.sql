-- Add new columns to return_requests for order tracking and categorization
ALTER TABLE public.return_requests
ADD COLUMN IF NOT EXISTS order_id TEXT,
ADD COLUMN IF NOT EXISTS product_category TEXT,
ADD COLUMN IF NOT EXISTS issue_category TEXT;

-- Add new columns to return_decisions for confidence and fraud detection
ALTER TABLE public.return_decisions
ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS is_suspicious_image BOOLEAN DEFAULT false;

-- Create indexes on status for faster filtering of manual review cases
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_decisions_confidence ON public.return_decisions(confidence);