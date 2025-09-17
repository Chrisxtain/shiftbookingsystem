-- Update the handle_new_user function to use the new admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the email from the new user
  user_email := NEW.email;
  
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    CASE 
      WHEN user_email = 'tochukwuxtain@gmail.com' THEN 'super_admin'::user_role
      ELSE 'worker'::user_role
    END
  );
  
  RETURN NEW;
END;
$function$;