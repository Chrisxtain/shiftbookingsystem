-- Insert default shifts using the correct enum values
INSERT INTO public.shifts (name, start_time, end_time, duration_hours, shift_type, is_active) 
VALUES 
  ('Morning Shift', '06:00:00', '14:00:00', 8, 'morning', true),
  ('Evening Shift', '14:00:00', '22:00:00', 8, 'evening', true),
  ('Night Shift', '22:00:00', '06:00:00', 8, 'night', true)
ON CONFLICT DO NOTHING;

-- Fix the infinite recursion issue in profiles policies using security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop the problematic policies 
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate the admin policy using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() IN ('admin', 'super_admin'));