-- Add user_id to return_requests table
ALTER TABLE public.return_requests
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id not nullable for new records (existing records will have NULL temporarily)
-- We'll need to handle existing data separately if needed

-- Drop the old permissive policies
DROP POLICY IF EXISTS "Anyone can insert requests" ON public.return_requests;
DROP POLICY IF EXISTS "Users can view all requests" ON public.return_requests;
DROP POLICY IF EXISTS "Users can view all decisions" ON public.return_decisions;

-- Create new RLS policies for return_requests
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

-- Create new RLS policies for return_decisions
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