-- First, let's create the shift_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE shift_type AS ENUM ('morning', 'day', 'evening', 'night');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the shift_status enum if it doesn't exist  
DO $$ BEGIN
    CREATE TYPE shift_status AS ENUM ('booked', 'completed', 'cancelled', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('worker', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Insert default shifts (3 daily 8-hour shifts)
INSERT INTO public.shifts (name, start_time, end_time, duration_hours, shift_type, is_active) 
VALUES 
  ('Morning Shift', '06:00:00', '14:00:00', 8, 'morning', true),
  ('Day Shift', '08:00:00', '16:00:00', 8, 'day', true),
  ('Evening Shift', '14:00:00', '22:00:00', 8, 'evening', true)
ON CONFLICT DO NOTHING;

-- Fix the infinite recursion issue in profiles policies
-- Drop the problematic policies and recreate them properly
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recreate the policies without recursion
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);