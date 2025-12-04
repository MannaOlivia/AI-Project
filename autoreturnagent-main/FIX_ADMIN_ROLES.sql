-- ============================================
-- FIX ADMIN ROLES
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check current roles
SELECT 
    u.email,
    ur.role,
    ur.user_id
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN ('mannaolives@gmail.com', 'sujalchourasia11@gmail.com')
ORDER BY u.email, ur.role;

-- Step 2: Delete ALL existing roles for these users
DELETE FROM public.user_roles
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('mannaolives@gmail.com', 'sujalchourasia11@gmail.com')
);

-- Step 3: Set mannaolives@gmail.com as USER only
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role
FROM auth.users
WHERE email = 'mannaolives@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Set sujalchourasia11@gmail.com as ADMIN only
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'sujalchourasia11@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Verify the changes
SELECT 
    u.email,
    ur.role,
    ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN ('mannaolives@gmail.com', 'sujalchourasia11@gmail.com')
ORDER BY u.email, ur.role;

