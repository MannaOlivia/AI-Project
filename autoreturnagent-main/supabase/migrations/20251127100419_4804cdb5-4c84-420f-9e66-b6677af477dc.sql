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

-- Create user_orders junction table to track which orders are assigned to which users
CREATE TABLE public.user_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, order_id)
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_orders ENABLE ROW LEVEL SECURITY;

-- Orders policies - users can only see orders assigned to them
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

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- User_orders policies
CREATE POLICY "Users can view their own order assignments"
ON public.user_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all order assignments
CREATE POLICY "Admins can view all order assignments"
ON public.user_orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- System can insert order assignments
CREATE POLICY "System can insert order assignments"
ON public.user_orders
FOR INSERT
WITH CHECK (true);