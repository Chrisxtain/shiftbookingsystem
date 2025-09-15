-- Remove duplicate shifts, keeping only the oldest ones
WITH ranked_shifts AS (
  SELECT id, 
         name, 
         shift_type, 
         start_time, 
         end_time,
         ROW_NUMBER() OVER (PARTITION BY shift_type, start_time, end_time ORDER BY created_at ASC) as rn
  FROM public.shifts
  WHERE is_active = true
)
DELETE FROM public.shifts 
WHERE id IN (
  SELECT id FROM ranked_shifts WHERE rn > 1
);

-- Add a unique constraint to prevent duplicate shift types with same times
ALTER TABLE public.shifts 
ADD CONSTRAINT unique_shift_type_time 
UNIQUE (shift_type, start_time, end_time);

-- Add a unique constraint to prevent users from booking multiple shifts of the same type on the same date
ALTER TABLE public.shift_bookings 
ADD CONSTRAINT unique_user_shift_type_date 
UNIQUE (user_id, shift_date, shift_id);