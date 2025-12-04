-- ============================================
-- ADD DUMMY ORDERS FOR USER
-- Run this in Supabase SQL Editor
-- ============================================

-- First, let's insert some dummy orders into the orders table
INSERT INTO public.orders (order_id, order_date, ship_date, ship_mode, customer_id, customer_name, segment, country, city, state, region, product_id, category, sub_category, product_name, sales, quantity, profit, brand, discount_percent, cost) VALUES
('ORD-2024-001', '2024-01-15', '2024-01-18', 'Standard Class', 'CUST-001', 'John Smith', 'Consumer', 'United States', 'New York', 'NY', 'East', 'PROD-001', 'Technology', 'Phones', 'iPhone 15 Pro', 999.99, 1, 299.99, 'Apple', 0, 700.00),
('ORD-2024-002', '2024-01-20', '2024-01-23', 'Second Class', 'CUST-002', 'Sarah Johnson', 'Consumer', 'United States', 'Los Angeles', 'CA', 'West', 'PROD-002', 'Electronics', 'Laptops', 'MacBook Air M2', 1199.99, 1, 399.99, 'Apple', 10, 800.00),
('ORD-2024-003', '2024-02-05', '2024-02-08', 'Standard Class', 'CUST-003', 'Mike Davis', 'Corporate', 'United States', 'Chicago', 'IL', 'Central', 'PROD-003', 'Furniture', 'Chairs', 'Herman Miller Aeron Chair', 1495.00, 1, 495.00, 'Herman Miller', 0, 1000.00),
('ORD-2024-004', '2024-02-10', '2024-02-13', 'First Class', 'CUST-004', 'Emily Brown', 'Consumer', 'United States', 'Houston', 'TX', 'South', 'PROD-004', 'Technology', 'Tablets', 'iPad Pro 12.9"', 1099.99, 1, 299.99, 'Apple', 5, 800.00),
('ORD-2024-005', '2024-02-15', '2024-02-18', 'Standard Class', 'CUST-005', 'David Wilson', 'Home Office', 'United States', 'Phoenix', 'AZ', 'West', 'PROD-005', 'Electronics', 'Monitors', 'Dell UltraSharp 27"', 449.99, 2, 149.99, 'Dell', 0, 300.00),
('ORD-2024-006', '2024-03-01', '2024-03-04', 'Second Class', 'CUST-006', 'Lisa Anderson', 'Consumer', 'United States', 'Philadelphia', 'PA', 'East', 'PROD-006', 'Office Supplies', 'Paper', 'HP Premium Paper', 29.99, 5, 9.99, 'HP', 0, 20.00),
('ORD-2024-007', '2024-03-10', '2024-03-13', 'Standard Class', 'CUST-007', 'James Taylor', 'Consumer', 'United States', 'San Diego', 'CA', 'West', 'PROD-007', 'Technology', 'Headphones', 'Sony WH-1000XM5', 399.99, 1, 99.99, 'Sony', 0, 300.00),
('ORD-2024-008', '2024-03-15', '2024-03-18', 'First Class', 'CUST-008', 'Maria Garcia', 'Corporate', 'United States', 'Dallas', 'TX', 'South', 'PROD-008', 'Electronics', 'Keyboards', 'Logitech MX Keys', 99.99, 3, 29.99, 'Logitech', 10, 70.00),
('ORD-2024-009', '2024-03-20', '2024-03-23', 'Standard Class', 'CUST-009', 'Robert Martinez', 'Consumer', 'United States', 'San Jose', 'CA', 'West', 'PROD-009', 'Furniture', 'Desks', 'Standing Desk Electric', 599.99, 1, 199.99, 'Uplift', 0, 400.00),
('ORD-2024-010', '2024-03-25', '2024-03-28', 'Second Class', 'CUST-010', 'Jennifer Lee', 'Home Office', 'United States', 'Austin', 'TX', 'South', 'PROD-010', 'Technology', 'Smartwatches', 'Apple Watch Series 9', 429.99, 1, 129.99, 'Apple', 0, 300.00);

-- Now assign these orders to the user with email 'mannaolives@gmail.com'
-- This will automatically link them to your account
INSERT INTO public.user_orders (user_id, order_id)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'mannaolives@gmail.com'),
  o.id
FROM public.orders o
WHERE o.order_id IN (
  'ORD-2024-001', 'ORD-2024-002', 'ORD-2024-003', 'ORD-2024-004', 'ORD-2024-005',
  'ORD-2024-006', 'ORD-2024-007', 'ORD-2024-008', 'ORD-2024-009', 'ORD-2024-010'
)
ON CONFLICT (user_id, order_id) DO NOTHING;

-- Verify orders were assigned
SELECT 
  o.order_id, 
  o.product_name, 
  o.category, 
  o.sales, 
  o.order_date
FROM public.orders o
INNER JOIN public.user_orders uo ON uo.order_id = o.id
INNER JOIN auth.users u ON u.id = uo.user_id
WHERE u.email = 'mannaolives@gmail.com'
ORDER BY o.order_date DESC;


